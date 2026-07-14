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
"""Request and error models for the assistant API."""

from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field, model_validator

MAX_QUESTION_CHARS = 1_000
MAX_HISTORY_ENTRIES = 6
MAX_HISTORY_ENTRY_CHARS = 2_000
MAX_VIZ_TYPE_CHARS = 50

Route = Literal["dashboard", "explore", "sqllab", "list", "other"]


class ErrorCode(str, Enum):
    VALIDATION = "VALIDATION"
    MODEL_UNAVAILABLE = "MODEL_UNAVAILABLE"
    TIMEOUT = "TIMEOUT"


class ErrorDetail(BaseModel):
    code: ErrorCode
    message: str


class ErrorEnvelope(BaseModel):
    error: ErrorDetail


class HistoryEntry(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=MAX_HISTORY_ENTRY_CHARS)


class AskContext(BaseModel):
    route: Route
    viz_type: str | None = Field(default=None, max_length=MAX_VIZ_TYPE_CHARS)


class AskRequest(BaseModel):
    question: str = Field(min_length=1, max_length=MAX_QUESTION_CHARS)
    context: AskContext
    history: list[HistoryEntry] = Field(
        default_factory=list, max_length=MAX_HISTORY_ENTRIES
    )

    @model_validator(mode="after")
    def validate_history_order(self) -> "AskRequest":
        """History must start with a user turn, alternate strictly, and end
        with an assistant turn so the new question forms a valid user turn."""
        if not self.history:
            return self
        if self.history[0].role != "user":
            raise ValueError("history must start with a user message")
        for previous, current in zip(self.history, self.history[1:], strict=False):
            if previous.role == current.role:
                raise ValueError("history roles must alternate")
        if self.history[-1].role != "assistant":
            raise ValueError("history must end with an assistant message")
        return self
