from functools import lru_cache
from pathlib import Path

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


API_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=API_ROOT / ".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "Pollex Tactus API"
    environment: str = "development"
    database_url: str = "postgresql+psycopg://postgres:CHANGE_ME@127.0.0.1:5432/pollex"
    auto_create_database: bool = True
    auto_create_tables: bool = True

    studio_cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    studio_token_ttl_seconds: int = 60 * 60 * 24

    supabase_url: str | None = None
    supabase_anon_key: str | None = None
    supabase_jwt_secret: str | None = None

    tactus_llm_provider: str = "none"
    tactus_llm_model: str = "gpt-5-nano"
    tactus_llm_timeout_seconds: float = 4.0
    openai_api_key: str | None = None
    openai_base_url: str = "https://api.openai.com/v1"
    ollama_base_url: str = "http://127.0.0.1:11434"

    @model_validator(mode="after")
    def validate_production(self) -> "Settings":
        if self.is_production:
            missing = [
                name
                for name, value in {
                    "DATABASE_URL": self.database_url,
                    "SUPABASE_URL": self.supabase_url,
                    "SUPABASE_ANON_KEY": self.supabase_anon_key,
                    "SUPABASE_JWT_SECRET": self.supabase_jwt_secret,
                    "STUDIO_CORS_ORIGINS": self.studio_cors_origins,
                }.items()
                if not value or "CHANGE_ME" in str(value)
            ]
            if missing:
                raise ValueError(f"Missing production settings: {', '.join(missing)}")
        return self

    @property
    def is_production(self) -> bool:
        return self.environment.lower() in {"production", "prod"}

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.studio_cors_origins.split(",") if origin.strip()]

    @property
    def has_supabase_auth(self) -> bool:
        return bool(self.supabase_url and self.supabase_anon_key and self.supabase_jwt_secret)


@lru_cache
def get_settings() -> Settings:
    return Settings()
