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
import pytest
from src.settings import load_settings, SettingsError


@pytest.fixture(autouse=True)
def clean_env(monkeypatch: pytest.MonkeyPatch) -> None:
    for name in (
        "ANTHROPIC_API_KEY",
        "MODEL",
        "KNOWLEDGE_DIR",
        "ALLOWED_ORIGINS",
        "REQUEST_TIMEOUT_SECONDS",
        "MAX_OUTPUT_TOKENS",
    ):
        monkeypatch.delenv(name, raising=False)


def test_missing_required_variables_fail_with_clear_error() -> None:
    with pytest.raises(SettingsError) as excinfo:
        load_settings()
    message = str(excinfo.value)
    assert "ANTHROPIC_API_KEY" in message
    assert "MODEL" in message


def test_missing_model_only_is_reported(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
    with pytest.raises(SettingsError) as excinfo:
        load_settings()
    assert "MODEL" in str(excinfo.value)


def test_defaults_applied(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
    monkeypatch.setenv("MODEL", "claude-opus-4-8")
    settings = load_settings()
    assert str(settings.knowledge_dir) == "/app/knowledge"
    assert settings.allowed_origins_list == ["http://localhost:8088"]
    assert settings.request_timeout_seconds == 30
    assert settings.max_output_tokens == 700


def test_allowed_origins_parses_comma_list(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
    monkeypatch.setenv("MODEL", "claude-opus-4-8")
    monkeypatch.setenv(
        "ALLOWED_ORIGINS", "http://localhost:8088, http://localhost:9000"
    )
    settings = load_settings()
    assert settings.allowed_origins_list == [
        "http://localhost:8088",
        "http://localhost:9000",
    ]
