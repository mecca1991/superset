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
from src.knowledge import KnowledgeError, load_knowledge

from .conftest import write_doc


def test_loads_in_deterministic_filename_order(tmp_path: Path) -> None:
    # Write out of order to prove sorting is by filename, not creation time.
    write_doc(tmp_path, "03-third.md", topic="Third")
    write_doc(tmp_path, "01-first.md", topic="First")
    write_doc(tmp_path, "02-second.md", topic="Second")

    docs = load_knowledge(tmp_path)
    assert [doc.filename for doc in docs] == [
        "01-first.md",
        "02-second.md",
        "03-third.md",
    ]
    # Stable across repeated loads
    assert [doc.topic for doc in load_knowledge(tmp_path)] == [
        "First",
        "Second",
        "Third",
    ]


def test_missing_directory_fails(tmp_path: Path) -> None:
    with pytest.raises(KnowledgeError, match="does not exist"):
        load_knowledge(tmp_path / "nope")


def test_empty_directory_fails(tmp_path: Path) -> None:
    with pytest.raises(KnowledgeError, match="No knowledge files"):
        load_knowledge(tmp_path)


def test_missing_topic_fails(tmp_path: Path) -> None:
    (tmp_path / "01-bad.md").write_text("---\nroutes:\n  - explore\n---\n\nBody.\n")
    with pytest.raises(KnowledgeError, match="topic"):
        load_knowledge(tmp_path)


def test_missing_routes_fails(tmp_path: Path) -> None:
    (tmp_path / "01-bad.md").write_text("---\ntopic: T\n---\n\nBody.\n")
    with pytest.raises(KnowledgeError, match="routes"):
        load_knowledge(tmp_path)


def test_invalid_route_value_fails(tmp_path: Path) -> None:
    write_doc(tmp_path, "01-bad.md", route="settings")
    with pytest.raises(KnowledgeError, match="invalid routes"):
        load_knowledge(tmp_path)


def test_duplicate_topic_fails(tmp_path: Path) -> None:
    write_doc(tmp_path, "01-a.md", topic="Same")
    write_doc(tmp_path, "02-b.md", topic="Same")
    with pytest.raises(KnowledgeError, match="duplicate topic"):
        load_knowledge(tmp_path)


def test_empty_body_fails(tmp_path: Path) -> None:
    (tmp_path / "01-bad.md").write_text(
        "---\ntopic: T\nroutes:\n  - explore\n---\n\n   \n"
    )
    with pytest.raises(KnowledgeError, match="body is empty"):
        load_knowledge(tmp_path)


def test_body_over_word_limit_fails(tmp_path: Path) -> None:
    write_doc(tmp_path, "01-long.md", body="word " * 301)
    with pytest.raises(KnowledgeError, match="maximum is 300"):
        load_knowledge(tmp_path)


def test_body_at_word_limit_passes(tmp_path: Path) -> None:
    write_doc(tmp_path, "01-max.md", body="word " * 300)
    docs = load_knowledge(tmp_path)
    assert len(docs) == 1


def test_repo_placeholder_pack_is_valid() -> None:
    pack_dir = Path(__file__).resolve().parent.parent / "knowledge"
    docs = load_knowledge(pack_dir)
    assert len(docs) >= 2
