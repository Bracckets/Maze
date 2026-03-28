import os
from dataclasses import dataclass


def _as_bool(value: str | None, default: bool) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class Settings:
    app_env: str
    database_url: str
    seed_demo_data: bool

    @property
    def is_production(self) -> bool:
        return self.app_env.lower() == "production"


def load_settings() -> Settings:
    app_env = os.getenv("APP_ENV", "development")
    default_database_url = "sqlite:///./ux_insights.db" if app_env != "production" else ""
    database_url = os.getenv("DATABASE_URL", default_database_url)
    seed_default = app_env != "production"

    return Settings(
        app_env=app_env,
        database_url=database_url,
        seed_demo_data=_as_bool(os.getenv("SEED_DEMO_DATA"), seed_default),
    )


settings = load_settings()
