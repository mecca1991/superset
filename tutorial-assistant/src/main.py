# Licensed to the Apache Software Foundation (ASF) under one
# or more contributor license agreements.  See the NOTICE file
# distributed with this work for additional information
# regarding copyright ownership.  The ASF licenses this file
# to you under the Apache License, Version 2.0 (the
# "License"); you may not use this file except in compliance
# with the License.  You may obtain a copy of the License at
#
#   http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing,
# software distributed under the License is distributed on an
# "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
# KIND, either express or implied.  See the License for the
# specific language governing permissions and limitations
# under the License.
"""FastAPI application for the tutorial assistant service."""

import asyncio
import json
import logging
import time
import uuid
from contextlib import asynccontextmanager
from typing import Any, AsyncIterator

import anthropic
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse

from .knowledge import KnowledgeError, load_knowledge
from .prompts import build_system_blocks, build_user_turn, system_fingerprint
from .schemas import AskRequest, ErrorCode
from .settings import load_settings, Settings

logger = logging.getLogger("tutorial_assistant")

UNAVAILABLE_MESSAGE = "The tutorial assistant is currently unavailable."

# Cap on concurrent model calls so no local process can drain the API
# budget through the loopback port (spec section 9).
MODEL_CONCURRENCY = 3

SSE_HEADERS = {
    "Cache-Control": "no-cache",
    "X-Accel-Buffering": "no",
}


def error_response(code: ErrorCode, message: str, http_status: int) -> JSONResponse:
    return JSONResponse(
        status_code=http_status,
        content={"error": {"code": code.value, "message": message}},
    )


def sse_event(payload: dict[str, Any]) -> str:
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"


async def stream_model_events(
    request: Request,
    manager: Any,
    stream: Any,
    timeout: float,
    on_finish: Any,
) -> AsyncIterator[str]:
    """Relay model text deltas as SSE events.

    Client disconnects and generator teardown close the model stream so
    abandoned requests stop consuming output tokens (spec section 5.1).
    Errors after the stream has started are reported as a final SSE error
    event (spec section 6).
    """
    outcome = "done"
    try:
        chunks = stream.text_stream.__aiter__()
        while True:
            try:
                async with asyncio.timeout(timeout):
                    chunk = await chunks.__anext__()
            except StopAsyncIteration:
                break
            if await request.is_disconnected():
                outcome = "client_disconnected"
                return
            yield sse_event({"type": "delta", "text": chunk})
        yield sse_event({"type": "done"})
    except TimeoutError:
        outcome = "timeout_mid_stream"
        yield sse_event(
            {
                "type": "error",
                "code": ErrorCode.TIMEOUT.value,
                "message": UNAVAILABLE_MESSAGE,
            }
        )
    except GeneratorExit:
        outcome = "client_disconnected"
        raise
    except Exception as exc:
        outcome = f"stream_error:{type(exc).__name__}"
        yield sse_event(
            {
                "type": "error",
                "code": ErrorCode.MODEL_UNAVAILABLE.value,
                "message": UNAVAILABLE_MESSAGE,
            }
        )
    finally:
        usage = _usage_fields(stream)
        try:
            await manager.__aexit__(None, None, None)
        except Exception:
            logger.warning("failed to close model stream")
        on_finish(outcome, usage)


async def open_model_stream(
    client: Any,
    timeout: float,
    **stream_kwargs: Any,
) -> tuple[Any, Any, str | None, JSONResponse | None]:
    """Open the model stream, mapping pre-stream failures to the JSON
    error envelope (spec section 6).

    Returns (manager, stream, outcome, response); outcome and response are
    set only on failure.
    """
    manager = client.messages.stream(**stream_kwargs)
    try:
        async with asyncio.timeout(timeout):
            stream = await manager.__aenter__()
    except TimeoutError:
        response = error_response(
            ErrorCode.TIMEOUT,
            UNAVAILABLE_MESSAGE,
            status.HTTP_504_GATEWAY_TIMEOUT,
        )
        return None, None, "timeout_before_stream", response
    except Exception as exc:
        category = (
            "provider_error"
            if isinstance(exc, anthropic.AnthropicError)
            else "unexpected_error"
        )
        response = error_response(
            ErrorCode.MODEL_UNAVAILABLE,
            UNAVAILABLE_MESSAGE,
            status.HTTP_502_BAD_GATEWAY,
        )
        return None, None, f"{category}:{type(exc).__name__}", response
    return manager, stream, None, None


def validation_details(exc: RequestValidationError) -> list[dict[str, str]]:
    """Field paths and messages only; submitted values are never echoed
    (pydantic's raw errors() includes the offending input)."""
    return [
        {
            "field": ".".join(str(part) for part in error["loc"] if part != "body"),
            "message": error["msg"],
        }
        for error in exc.errors()
    ]


def _usage_fields(stream: Any) -> dict[str, Any]:
    """Extract token usage from the stream snapshot without ever touching
    message content."""
    snapshot = getattr(stream, "current_message_snapshot", None)
    usage = getattr(snapshot, "usage", None)
    if usage is None:
        return {}
    return {
        field: getattr(usage, field, None)
        for field in (
            "input_tokens",
            "output_tokens",
            "cache_read_input_tokens",
            "cache_creation_input_tokens",
        )
    }


def create_app(
    settings: Settings | None = None,
    anthropic_client: Any | None = None,
) -> FastAPI:
    app_settings = settings or load_settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        # Load and validate the knowledge pack exactly once at startup;
        # any validation failure aborts the service. The explicit error log
        # keeps the reason visible in container logs.
        try:
            app.state.knowledge = load_knowledge(app_settings.knowledge_dir)
        except KnowledgeError as exc:
            logger.error("Failed to load knowledge pack: %s", exc)
            raise
        # Built once so the same block objects are reused for every request;
        # the logged fingerprint detects content drift across restarts. Actual
        # cache behaviour is verified via the usage fields in request logs.
        app.state.system_blocks = build_system_blocks(app.state.knowledge)
        app.state.model_semaphore = asyncio.Semaphore(MODEL_CONCURRENCY)
        app.state.anthropic = anthropic_client or anthropic.AsyncAnthropic(
            api_key=app_settings.anthropic_api_key.get_secret_value()
        )
        logger.info(
            "startup complete knowledge_docs=%d system_fingerprint=%s model=%s",
            len(app.state.knowledge),
            system_fingerprint(app.state.system_blocks),
            app_settings.model,
        )
        yield

    app = FastAPI(
        title="Superset Tutorial Assistant",
        lifespan=lifespan,
        # The service is API-only; docs stay enabled for local development.
    )
    app.state.settings = app_settings

    app.add_middleware(
        CORSMiddleware,
        allow_origins=app_settings.allowed_origins_list,
        allow_methods=["POST", "GET", "OPTIONS"],
        allow_headers=["content-type"],
    )

    @app.exception_handler(RequestValidationError)
    async def validation_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "error": {
                    "code": ErrorCode.VALIDATION.value,
                    "message": "Request failed validation.",
                    "details": validation_details(exc),
                }
            },
        )

    @app.get("/health")
    async def health(request: Request) -> JSONResponse:
        knowledge = getattr(request.app.state, "knowledge", None)
        if not knowledge:
            return JSONResponse(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                content={"status": "error", "knowledge_docs": 0},
            )
        return JSONResponse(content={"status": "ok", "knowledge_docs": len(knowledge)})

    @app.post("/ask")
    async def ask(request: Request, payload: AskRequest) -> Any:
        state = request.app.state
        request_id = uuid.uuid4().hex[:12]
        started = time.monotonic()
        timeout = app_settings.request_timeout_seconds

        def log_outcome(outcome: str, usage: dict[str, Any] | None = None) -> None:
            # Metadata only: never the question, answer, or credentials
            # (spec section 5.1).
            logger.info(
                "ask request_id=%s route=%s model=%s outcome=%s "
                "duration_ms=%d usage=%s",
                request_id,
                payload.context.route,
                app_settings.model,
                outcome,
                int((time.monotonic() - started) * 1000),
                usage or {},
            )

        messages = [entry.model_dump() for entry in payload.history]
        messages.append(
            build_user_turn(
                payload.question,
                payload.context.route,
                payload.context.viz_type,
            )
        )

        semaphore: asyncio.Semaphore = state.model_semaphore
        await semaphore.acquire()

        manager, stream, failure, failure_response = await open_model_stream(
            state.anthropic,
            timeout,
            model=app_settings.model,
            max_tokens=app_settings.max_output_tokens,
            system=state.system_blocks,
            messages=messages,
        )
        if failure_response is not None:
            semaphore.release()
            log_outcome(failure or "unknown_failure")
            return failure_response

        def on_finish(outcome: str, usage: dict[str, Any]) -> None:
            semaphore.release()
            log_outcome(outcome, usage)

        return StreamingResponse(
            stream_model_events(request, manager, stream, timeout, on_finish),
            media_type="text/event-stream",
            headers=SSE_HEADERS,
        )

    return app


def build_app() -> FastAPI:
    """Entry point for `uvicorn src.main:build_app --factory`."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )
    return create_app()
