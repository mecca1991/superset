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
"""Validation of the real shipped knowledge pack (spec section 7)."""

from pathlib import Path

from src.knowledge import load_knowledge, MAX_BODY_WORDS
from src.prompts import build_system_blocks

PACK_DIR = Path(__file__).resolve().parent.parent / "knowledge"

# Minimum cacheable prefix on current Opus models; prompts shorter than
# this are silently not cached by the provider.
MIN_CACHEABLE_TOKENS = 4096

EXPECTED_TOPICS = {
    "Creating a dashboard",
    "Creating a chart",
    "Creating a line chart",
    "Creating a bar chart",
    "Creating a pie chart",
    "Creating a Big Number or KPI chart",
    "Creating a table chart",
    "Dimensions",
    "Metrics",
    "Dimensions compared with metrics",
    "Dashboard and chart filters",
    "Datasets",
    "Connecting a database",
    "SQL Lab basics",
    "Editing and arranging a dashboard",
}


def test_pack_has_exactly_fifteen_valid_files() -> None:
    docs = load_knowledge(PACK_DIR)
    assert len(docs) == 15


def test_pack_covers_the_spec_topics() -> None:
    docs = load_knowledge(PACK_DIR)
    assert {doc.topic for doc in docs} == EXPECTED_TOPICS


def test_every_body_is_within_the_word_limit() -> None:
    for doc in load_knowledge(PACK_DIR):
        word_count = len(doc.body.split())
        assert word_count <= MAX_BODY_WORDS, f"{doc.filename}: {word_count} words"


def test_pack_loads_in_numeric_filename_order() -> None:
    docs = load_knowledge(PACK_DIR)
    filenames = [doc.filename for doc in docs]
    assert filenames == sorted(filenames)
    assert filenames[0].startswith("01-")
    assert filenames[-1].startswith("15-")


def test_system_prefix_estimate_clears_the_cache_minimum() -> None:
    """The provider silently skips caching below the model minimum, so the
    assembled prefix must stay comfortably above it. The 4-characters-per-
    token heuristic is conservative for English prose."""
    blocks = build_system_blocks(load_knowledge(PACK_DIR))
    total_chars = sum(len(block["text"]) for block in blocks)
    estimated_tokens = total_chars / 4
    assert estimated_tokens > MIN_CACHEABLE_TOKENS, (
        f"estimated {estimated_tokens:.0f} tokens; "
        f"pack too small for prompt caching"
    )
