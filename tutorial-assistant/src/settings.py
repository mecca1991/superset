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
"""Service configuration loaded from environment variables.

The service must fail at startup with a clear error when required
configuration is missing (spec section 5.3).
"""

from pathlib import Path

from pydantic import Field, SecretStr, ValidationError
from pydantic_settings import BaseSettings, SettingsConfigDict


class SettingsError(RuntimeError):
    """Raised when required environment variables are missing or invalid."""


class Settings(BaseSettings):
    model_config = SettingsConfigDict(case_sensitive=False, extra="ignore")

    # SecretStr keeps the key out of reprs, logs, and error messages;
    # consumers must call .get_secret_value() explicitly.
    anthropic_api_key: SecretStr = Field(min_length=1)
    model: str = Field(min_length=1)
    knowledge_dir: Path = Path("/app/knowledge")
    allowed_origins: str = "http://localhost:8088"
    request_timeout_seconds: float = 30
    max_output_tokens: int = 700

    @property
    def allowed_origins_list(self) -> list[str]:
        return [
            origin.strip()
            for origin in self.allowed_origins.split(",")
            if origin.strip()
        ]


def load_settings() -> Settings:
    """Build settings from the environment, failing with a readable error."""
    try:
        return Settings()
    except ValidationError as exc:
        missing = ", ".join(str(error["loc"][0]).upper() for error in exc.errors())
        raise SettingsError(
            f"Missing or invalid required environment variables: {missing}. "
            "Set ANTHROPIC_API_KEY and MODEL before starting the service."
        ) from exc
