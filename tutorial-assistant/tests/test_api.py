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
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from src.knowledge import KnowledgeError
from src.main import create_app
from src.settings import Settings


def test_health_reports_loaded_doc_count(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "knowledge_docs": 2}


def test_startup_aborts_when_knowledge_pack_is_invalid(tmp_path: Path) -> None:
    directory = tmp_path / "knowledge"
    directory.mkdir()
    (directory / "01-bad.md").write_text("---\ntopic: T\n---\n\nBody.\n")
    settings = Settings(
        anthropic_api_key="test-key",
        model="claude-opus-4-8",
        knowledge_dir=directory,
    )
    app = create_app(settings)
    with pytest.raises(KnowledgeError):
        with TestClient(app):
            pass


def test_invalid_request_returns_validation_envelope(
    client: TestClient,
) -> None:
    response = client.post(
        "/ask",
        json={"question": "", "context": {"route": "bogus"}},
    )
    assert response.status_code == 422
    body = response.json()
    assert body["error"]["code"] == "VALIDATION"
    assert "message" in body["error"]


def test_oversized_question_returns_validation_envelope(
    client: TestClient,
) -> None:
    response = client.post(
        "/ask",
        json={"question": "x" * 1_001, "context": {"route": "explore"}},
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION"


def test_valid_request_hits_unimplemented_stub(client: TestClient) -> None:
    response = client.post(
        "/ask",
        json={"question": "What is a dimension?", "context": {"route": "explore"}},
    )
    assert response.status_code == 501
    body = response.json()
    assert body["error"]["code"] == "MODEL_UNAVAILABLE"
    assert (
        body["error"]["message"] == "The tutorial assistant is currently unavailable."
    )


def test_cors_allows_only_configured_origin(client: TestClient) -> None:
    allowed = client.options(
        "/ask",
        headers={
            "Origin": "http://localhost:8088",
            "Access-Control-Request-Method": "POST",
        },
    )
    assert allowed.headers.get("access-control-allow-origin") == (
        "http://localhost:8088"
    )

    denied = client.options(
        "/ask",
        headers={
            "Origin": "http://evil.example",
            "Access-Control-Request-Method": "POST",
        },
    )
    assert "access-control-allow-origin" not in denied.headers
