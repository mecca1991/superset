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
from pydantic import ValidationError
from src.schemas import AskRequest

VALID = {
    "question": "What is a dimension?",
    "context": {"route": "explore"},
}


def make_request(**overrides: object) -> AskRequest:
    return AskRequest.model_validate({**VALID, **overrides})


def test_minimal_valid_request() -> None:
    request = make_request()
    assert request.question == "What is a dimension?"
    assert request.context.route == "explore"
    assert request.history == []


def test_full_valid_request() -> None:
    request = make_request(
        context={"route": "explore", "viz_type": "echarts_timeseries_line"},
        history=[
            {"role": "user", "content": "How do I create a line chart?"},
            {"role": "assistant", "content": "Start by opening a dataset."},
        ],
    )
    assert request.context.viz_type == "echarts_timeseries_line"
    assert len(request.history) == 2


def test_empty_question_rejected() -> None:
    with pytest.raises(ValidationError):
        make_request(question="")


def test_question_over_limit_rejected() -> None:
    with pytest.raises(ValidationError):
        make_request(question="x" * 1_001)


def test_question_at_limit_accepted() -> None:
    assert make_request(question="x" * 1_000)


def test_invalid_route_rejected() -> None:
    with pytest.raises(ValidationError):
        make_request(context={"route": "settings"})


@pytest.mark.parametrize("route", ["dashboard", "explore", "sqllab", "list", "other"])
def test_all_valid_routes_accepted(route: str) -> None:
    assert make_request(context={"route": route})


def test_viz_type_over_limit_rejected() -> None:
    with pytest.raises(ValidationError):
        make_request(context={"route": "explore", "viz_type": "x" * 51})


def test_history_over_six_entries_rejected() -> None:
    turns = [
        {"role": "user" if i % 2 == 0 else "assistant", "content": f"turn {i}"}
        for i in range(8)
    ]
    with pytest.raises(ValidationError):
        make_request(history=turns)


def test_history_entry_over_limit_rejected() -> None:
    with pytest.raises(ValidationError):
        make_request(
            history=[
                {"role": "user", "content": "x" * 2_001},
                {"role": "assistant", "content": "ok"},
            ]
        )


def test_history_invalid_role_rejected() -> None:
    with pytest.raises(ValidationError):
        make_request(history=[{"role": "system", "content": "hello"}])


def test_history_non_alternating_rejected() -> None:
    with pytest.raises(ValidationError):
        make_request(
            history=[
                {"role": "user", "content": "one"},
                {"role": "user", "content": "two"},
            ]
        )


def test_history_starting_with_assistant_rejected() -> None:
    with pytest.raises(ValidationError):
        make_request(history=[{"role": "assistant", "content": "hello"}])


def test_history_ending_with_user_rejected() -> None:
    with pytest.raises(ValidationError):
        make_request(history=[{"role": "user", "content": "hello"}])
