from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    anthropic_api_key: str = Field(default="", validation_alias="ANTHROPIC_API_KEY")
    gh_token: str = Field(default="", validation_alias="GH_TOKEN")

    jira_base_url: str = Field(default="", validation_alias="JIRA_BASE_URL")
    jira_email: str = Field(default="", validation_alias="JIRA_EMAIL")
    jira_api_token: str = Field(default="", validation_alias="JIRA_API_TOKEN")

    workspace_root: Path = Field(
        default=Path("/tmp/healer"), validation_alias="HEALER_WORKSPACE_ROOT"
    )
    db_path: Path = Field(
        default=Path("./self_healer.db"), validation_alias="HEALER_DB_PATH"
    )
    max_fix_repro_iterations: int = Field(
        default=3, validation_alias="HEALER_MAX_FIX_REPRO_ITERATIONS"
    )
    session_timeout_minutes: int = Field(
        default=30, validation_alias="HEALER_SESSION_TIMEOUT_MINUTES"
    )


settings = Settings()
