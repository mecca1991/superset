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
import json
from pathlib import Path
from typing import Any

import anthropic
import pytest
from fastapi.testclient import TestClient
from src.main import create_app
from src.settings import Settings

from .fakes import FakeAnthropic

ASK = {"question": "What is a dimension?", "context": {"route": "explore"}}


def parse_events(body: str) -> list[dict[str, Any]]:
    return [
        json.loads(line[len("data: ") :])
        for line in body.splitlines()
        if line.startswith("data: ")
    ]


def make_client(settings: Settings, fake: FakeAnthropic) -> TestClient:
    return TestClient(create_app(settings, anthropic_client=fake))


def test_valid_request_streams_deltas_then_done(client: TestClient) -> None:
    response = client.post("/ask", json=ASK)
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/event-stream")
    assert response.headers["cache-control"] == "no-cache"
    assert response.headers["x-accel-buffering"] == "no"

    events = parse_events(response.text)
    assert [event["type"] for event in events] == ["delta", "delta", "done"]
    assert "".join(e["text"] for e in events if e["type"] == "delta") == (
        "Hello world."
    )


def test_system_prompt_is_byte_identical_across_routes(
    client: TestClient, fake_anthropic: FakeAnthropic
) -> None:
    client.post("/ask", json=ASK)
    client.post(
        "/ask",
        json={"question": "How do I add a filter?", "context": {"route": "dashboard"}},
    )
    calls = fake_anthropic.messages.calls
    assert len(calls) == 2
    first = json.dumps(calls[0]["system"], sort_keys=True)
    second = json.dumps(calls[1]["system"], sort_keys=True)
    assert first == second

    blocks = calls[0]["system"]
    with_cache_control = [b for b in blocks if "cache_control" in b]
    assert with_cache_control == [blocks[-1]]
    assert blocks[-1]["cache_control"] == {"type": "ephemeral"}


def test_route_context_lives_in_user_turn_only(
    client: TestClient, fake_anthropic: FakeAnthropic
) -> None:
    client.post(
        "/ask",
        json={
            "question": "What is a dimension?",
            "context": {"route": "explore", "viz_type": "echarts_timeseries_line"},
        },
    )
    call = fake_anthropic.messages.calls[0]
    user_turn = call["messages"][-1]
    assert user_turn["role"] == "user"
    assert "route=explore" in user_turn["content"]
    assert "viz_type=echarts_timeseries_line" in user_turn["content"]
    assert "What is a dimension?" in user_turn["content"]

    system_text = json.dumps(call["system"])
    assert "route=" not in system_text
    assert "echarts_timeseries_line" not in system_text


def test_history_precedes_the_user_turn(
    client: TestClient, fake_anthropic: FakeAnthropic
) -> None:
    client.post(
        "/ask",
        json={
            **ASK,
            "history": [
                {"role": "user", "content": "How do I create a line chart?"},
                {"role": "assistant", "content": "Open a dataset in Explore."},
            ],
        },
    )
    messages = fake_anthropic.messages.calls[0]["messages"]
    assert [m["role"] for m in messages] == ["user", "assistant", "user"]
    assert messages[0]["content"] == "How do I create a line chart?"


def test_model_and_max_tokens_come_from_settings(
    client: TestClient, fake_anthropic: FakeAnthropic
) -> None:
    client.post("/ask", json=ASK)
    call = fake_anthropic.messages.calls[0]
    assert call["model"] == "claude-opus-4-8"
    assert call["max_tokens"] == 700


def test_provider_error_before_stream_returns_envelope(
    settings: Settings,
) -> None:
    fake = FakeAnthropic(enter_error=anthropic.AnthropicError("boom"))
    with make_client(settings, fake) as client:
        response = client.post("/ask", json=ASK)
    assert response.status_code == 502
    assert response.json()["error"]["code"] == "MODEL_UNAVAILABLE"


def test_timeout_before_stream_returns_envelope(knowledge_dir: Path) -> None:
    settings = Settings(
        anthropic_api_key="test-key",
        model="claude-opus-4-8",
        knowledge_dir=knowledge_dir,
        request_timeout_seconds=0.05,
    )
    fake = FakeAnthropic(enter_delay=0.5)
    with make_client(settings, fake) as client:
        response = client.post("/ask", json=ASK)
    assert response.status_code == 504
    assert response.json()["error"]["code"] == "TIMEOUT"


def test_mid_stream_failure_emits_error_event(settings: Settings) -> None:
    fake = FakeAnthropic(
        chunks=["partial "],
        fail_after=1,
        failure=anthropic.AnthropicError("overloaded"),
    )
    with make_client(settings, fake) as client:
        response = client.post("/ask", json=ASK)
    assert response.status_code == 200
    events = parse_events(response.text)
    assert [event["type"] for event in events] == ["delta", "error"]
    assert events[-1]["code"] == "MODEL_UNAVAILABLE"
    assert fake.messages.managers[0].closed


def test_mid_stream_timeout_emits_timeout_event(knowledge_dir: Path) -> None:
    settings = Settings(
        anthropic_api_key="test-key",
        model="claude-opus-4-8",
        knowledge_dir=knowledge_dir,
        request_timeout_seconds=0.05,
    )
    fake = FakeAnthropic(chunk_delay=0.5)
    with make_client(settings, fake) as client:
        response = client.post("/ask", json=ASK)
    events = parse_events(response.text)
    assert [event["type"] for event in events] == ["error"]
    assert events[0]["code"] == "TIMEOUT"


def test_client_disconnect_closes_model_stream(
    settings: Settings,
) -> None:
    fake = FakeAnthropic(chunks=["one ", "two ", "three "] * 50, chunk_delay=0.01)
    with make_client(settings, fake) as client:
        with client.stream("POST", "/ask", json=ASK) as response:
            iterator = response.iter_lines()
            next(iterator)  # read the first event, then abandon the stream
    assert fake.messages.managers[0].closed


def test_semaphore_is_held_during_stream_and_released_after(
    settings: Settings,
) -> None:
    observed: dict[str, int] = {}
    app_holder: dict[str, Any] = {}

    def record() -> None:
        semaphore = app_holder["app"].state.model_semaphore
        observed["during"] = semaphore._value

    fake = FakeAnthropic(on_first_chunk=record)
    app = create_app(settings, anthropic_client=fake)
    app_holder["app"] = app
    with TestClient(app) as client:
        client.post("/ask", json=ASK)
        assert observed["during"] == 2
        assert app.state.model_semaphore._value == 3


def test_logs_never_contain_question_answer_or_key(
    knowledge_dir: Path, caplog: pytest.LogCaptureFixture
) -> None:
    settings = Settings(
        anthropic_api_key="sk-ant-super-secret",
        model="claude-opus-4-8",
        knowledge_dir=knowledge_dir,
    )
    fake = FakeAnthropic(chunks=["the secret answer"])
    with caplog.at_level("INFO", logger="tutorial_assistant"):
        with make_client(settings, fake) as client:
            client.post(
                "/ask",
                json={
                    "question": "VERY-PRIVATE-QUESTION",
                    "context": {"route": "sqllab"},
                },
            )
    assert "ask request_id=" in caplog.text
    assert "route=sqllab" in caplog.text
    assert "VERY-PRIVATE-QUESTION" not in caplog.text
    assert "the secret answer" not in caplog.text
    assert "sk-ant-super-secret" not in caplog.text


def test_usage_metadata_is_logged(
    client: TestClient, caplog: pytest.LogCaptureFixture
) -> None:
    with caplog.at_level("INFO", logger="tutorial_assistant"):
        client.post("/ask", json=ASK)
    assert "cache_read_input_tokens" in caplog.text
    assert "outcome=done" in caplog.text
