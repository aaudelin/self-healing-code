from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    anthropic_api_key: str | None = None
    anthropic_model: str = "claude-sonnet-4-6"
    langchain_tracing_v2: bool = False
    langchain_project: str = "aiops-self-healing"


settings = Settings()
