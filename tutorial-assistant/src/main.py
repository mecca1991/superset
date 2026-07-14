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

import logging
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .knowledge import load_knowledge
from .schemas import AskRequest, ErrorCode
from .settings import load_settings, Settings

logger = logging.getLogger("tutorial_assistant")

UNAVAILABLE_MESSAGE = "The tutorial assistant is currently unavailable."


def error_response(code: ErrorCode, message: str, http_status: int) -> JSONResponse:
    return JSONResponse(
        status_code=http_status,
        content={"error": {"code": code.value, "message": message}},
    )


def create_app(settings: Settings | None = None) -> FastAPI:
    app_settings = settings or load_settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        # Load and validate the knowledge pack exactly once at startup;
        # any validation failure aborts the service.
        app.state.knowledge = load_knowledge(app_settings.knowledge_dir)
        logger.info(
            "knowledge pack loaded",
            extra={"knowledge_docs": len(app.state.knowledge)},
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
        return error_response(
            ErrorCode.VALIDATION,
            "Request failed validation.",
            status.HTTP_422_UNPROCESSABLE_ENTITY,
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
    async def ask(request: Request, payload: AskRequest) -> JSONResponse:
        # Streaming implementation arrives with the model integration;
        # the validated stub keeps the API contract testable until then.
        return error_response(
            ErrorCode.MODEL_UNAVAILABLE,
            UNAVAILABLE_MESSAGE,
            status.HTTP_501_NOT_IMPLEMENTED,
        )

    return app


def build_app() -> FastAPI:
    """Entry point for `uvicorn src.main:app` via the factory pattern."""
    return create_app()


# Instantiated lazily by uvicorn when run as `uvicorn src.main:build_app --factory`,
# or directly importable for tests via create_app().
