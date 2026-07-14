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
"""Knowledge pack loading and startup validation (spec section 7).

Files are loaded in deterministic filename order so the assembled system
prompt is byte-identical across processes, which keeps the prompt-cache
prefix stable.
"""

from dataclasses import dataclass
from pathlib import Path

import frontmatter

VALID_ROUTES = {"dashboard", "explore", "sqllab", "list", "other"}
MAX_BODY_WORDS = 300


class KnowledgeError(RuntimeError):
    """Raised when the knowledge pack fails validation at startup."""


@dataclass(frozen=True)
class KnowledgeDoc:
    filename: str
    topic: str
    routes: tuple[str, ...]
    body: str


def _validate_doc(path: Path, post: frontmatter.Post) -> KnowledgeDoc:
    topic = post.metadata.get("topic")
    if not isinstance(topic, str) or not topic.strip():
        raise KnowledgeError(f"{path.name}: missing or empty 'topic' frontmatter")

    routes = post.metadata.get("routes")
    if not isinstance(routes, list) or not routes:
        raise KnowledgeError(
            f"{path.name}: 'routes' frontmatter must be a non-empty list"
        )
    invalid = [route for route in routes if route not in VALID_ROUTES]
    if invalid:
        raise KnowledgeError(
            f"{path.name}: invalid routes {invalid}; "
            f"valid values are {sorted(VALID_ROUTES)}"
        )

    body = post.content.strip()
    if not body:
        raise KnowledgeError(f"{path.name}: body is empty")
    if (word_count := len(body.split())) > MAX_BODY_WORDS:
        raise KnowledgeError(
            f"{path.name}: body has {word_count} words, " f"maximum is {MAX_BODY_WORDS}"
        )

    return KnowledgeDoc(
        filename=path.name,
        topic=topic.strip(),
        routes=tuple(routes),
        body=body,
    )


def load_knowledge(directory: Path) -> list[KnowledgeDoc]:
    """Load and validate all knowledge files, sorted by filename."""
    if not directory.is_dir():
        raise KnowledgeError(f"Knowledge directory does not exist: {directory}")

    paths = sorted(directory.glob("*.md"))
    if not paths:
        raise KnowledgeError(f"No knowledge files found in {directory}")

    docs: list[KnowledgeDoc] = []
    topics: set[str] = set()
    for path in paths:
        try:
            post = frontmatter.load(path)
        except Exception as exc:
            raise KnowledgeError(f"{path.name}: failed to parse ({exc})") from exc
        doc = _validate_doc(path, post)
        if doc.topic in topics:
            raise KnowledgeError(f"{path.name}: duplicate topic '{doc.topic}'")
        topics.add(doc.topic)
        docs.append(doc)
    return docs
