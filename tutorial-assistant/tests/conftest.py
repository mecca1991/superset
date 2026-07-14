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
from src.main import create_app
from src.settings import Settings

VALID_DOC = """---
topic: {topic}
routes:
  - {route}
---

{body}
"""


def write_doc(
    directory: Path,
    filename: str,
    topic: str = "Sample topic",
    route: str = "explore",
    body: str = "A short sample body.",
) -> Path:
    path = directory / filename
    path.write_text(VALID_DOC.format(topic=topic, route=route, body=body))
    return path


@pytest.fixture
def knowledge_dir(tmp_path: Path) -> Path:
    directory = tmp_path / "knowledge"
    directory.mkdir()
    write_doc(directory, "01-first.md", topic="First topic")
    write_doc(directory, "02-second.md", topic="Second topic")
    return directory


@pytest.fixture
def settings(knowledge_dir: Path) -> Settings:
    return Settings(
        anthropic_api_key="test-key",
        model="claude-opus-4-8",
        knowledge_dir=knowledge_dir,
    )


@pytest.fixture
def client(settings: Settings) -> TestClient:
    app = create_app(settings)
    with TestClient(app) as test_client:
        yield test_client
