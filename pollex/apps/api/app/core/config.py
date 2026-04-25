from dataclasses import dataclass
from functools import lru_cache
import os


@dataclass(frozen=True)
class Settings:
    app_name: str = "Pollex Tactus API"
    database_url: str = "postgresql+psycopg://postgres:postgres@127.0.0.1:5432/pollex"
    environment: str = "development"
    tactus_llm_provider: str = "none"
    tactus_llm_model: str = "gpt-5-nano"
    tactus_llm_timeout_seconds: float = 4.0
    openai_api_key: str | None = None
    openai_base_url: str = "https://api.openai.com/v1"
    ollama_base_url: str = "http://127.0.0.1:11434"


@lru_cache
def get_settings() -> Settings:
    return Settings(
        app_name=os.getenv("APP_NAME", "Pollex Tactus API"),
        database_url=os.getenv("DATABASE_URL", "postgresql+psycopg://postgres:postgres@127.0.0.1:5432/pollex"),
        environment=os.getenv("ENVIRONMENT", "development"),
        tactus_llm_provider=os.getenv("TACTUS_LLM_PROVIDER", "none").lower(),
        tactus_llm_model=os.getenv("TACTUS_LLM_MODEL", "gpt-5-nano"),
        tactus_llm_timeout_seconds=float(os.getenv("TACTUS_LLM_TIMEOUT_SECONDS", "4")),
        openai_api_key=os.getenv("OPENAI_API_KEY"),
        openai_base_url=os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1").rstrip("/"),
        ollama_base_url=os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434").rstrip("/"),
    )
