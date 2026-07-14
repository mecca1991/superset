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
"""Test doubles for the Anthropic streaming client."""

import asyncio
from dataclasses import dataclass, field
from typing import Any, Callable


@dataclass
class FakeUsage:
    input_tokens: int = 120
    output_tokens: int = 45
    cache_read_input_tokens: int = 6000
    cache_creation_input_tokens: int = 0


@dataclass
class FakeSnapshot:
    usage: FakeUsage = field(default_factory=FakeUsage)


class FakeTextStream:
    def __init__(
        self,
        chunks: list[str],
        chunk_delay: float = 0.0,
        fail_after: int | None = None,
        failure: Exception | None = None,
        on_first_chunk: Callable[[], None] | None = None,
    ) -> None:
        self._chunks = chunks
        self._chunk_delay = chunk_delay
        self._fail_after = fail_after
        self._failure = failure
        self._on_first_chunk = on_first_chunk
        self._index = 0

    def __aiter__(self) -> "FakeTextStream":
        return self

    async def __anext__(self) -> str:
        if self._fail_after is not None and self._index >= self._fail_after:
            raise self._failure or RuntimeError("stream failed")
        if self._index >= len(self._chunks):
            raise StopAsyncIteration
        if self._chunk_delay:
            await asyncio.sleep(self._chunk_delay)
        if self._index == 0 and self._on_first_chunk:
            self._on_first_chunk()
        chunk = self._chunks[self._index]
        self._index += 1
        return chunk


class FakeStream:
    def __init__(self, text_stream: FakeTextStream) -> None:
        self.text_stream = text_stream
        self.current_message_snapshot = FakeSnapshot()


class FakeStreamManager:
    def __init__(
        self,
        text_stream: FakeTextStream,
        enter_delay: float = 0.0,
        enter_error: Exception | None = None,
        on_enter: Callable[[], None] | None = None,
        on_exit: Callable[[], None] | None = None,
    ) -> None:
        self._text_stream = text_stream
        self._enter_delay = enter_delay
        self._enter_error = enter_error
        self._on_enter = on_enter
        self._on_exit = on_exit
        self.closed = False

    async def __aenter__(self) -> FakeStream:
        if self._enter_delay:
            await asyncio.sleep(self._enter_delay)
        if self._enter_error is not None:
            raise self._enter_error
        if self._on_enter:
            self._on_enter()
        return FakeStream(self._text_stream)

    async def __aexit__(self, *exc_info: Any) -> None:
        self.closed = True
        if self._on_exit:
            self._on_exit()


class FakeMessages:
    def __init__(self, **behaviour: Any) -> None:
        self.behaviour = behaviour
        self.calls: list[dict[str, Any]] = []
        self.managers: list[FakeStreamManager] = []

    def stream(self, **kwargs: Any) -> FakeStreamManager:
        self.calls.append(kwargs)
        behaviour = dict(self.behaviour)
        text_stream = FakeTextStream(
            chunks=behaviour.pop("chunks", ["Hello ", "world."]),
            chunk_delay=behaviour.pop("chunk_delay", 0.0),
            fail_after=behaviour.pop("fail_after", None),
            failure=behaviour.pop("failure", None),
            on_first_chunk=behaviour.pop("on_first_chunk", None),
        )
        manager = FakeStreamManager(text_stream, **behaviour)
        self.managers.append(manager)
        return manager


class FakeAnthropic:
    def __init__(self, **behaviour: Any) -> None:
        self.messages = FakeMessages(**behaviour)
