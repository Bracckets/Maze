import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()


def _as_bool(value: str | None, default: bool) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class Settings:
    app_env: str
    database_url: str
    cors_allow_origins: tuple[str, ...]
    auth_secret: str
    auth_token_ttl_minutes: int
    public_api_base_url: str
    default_plan_id: str | None
    screenshot_storage_dir: str
    screenshot_signed_url_ttl_seconds: int
    screenshot_object_ttl_seconds: int
    screenshot_max_upload_bytes: int
    screenshot_signing_secret: str

    @property
    def is_production(self) -> bool:
        return self.app_env.lower() == "production"


def load_settings() -> Settings:
    app_env = os.getenv("APP_ENV", "development")
    database_url = os.getenv("DATABASE_URL", "")
    cors_origins_raw = os.getenv("CORS_ALLOW_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
    cors_allow_origins = tuple(origin.strip() for origin in cors_origins_raw.split(",") if origin.strip())
    auth_secret = os.getenv("AUTH_SECRET", "")
    public_api_base_url = os.getenv("PUBLIC_API_BASE_URL", "http://127.0.0.1:8000")
    screenshot_storage_dir = os.getenv("SCREENSHOT_STORAGE_DIR", "./storage/screenshots")
    screenshot_signing_secret = os.getenv("SCREENSHOT_SIGNING_SECRET") or auth_secret

    return Settings(
        app_env=app_env,
        database_url=database_url,
        cors_allow_origins=cors_allow_origins,
        auth_secret=auth_secret,
        auth_token_ttl_minutes=int(os.getenv("AUTH_TOKEN_TTL_MINUTES", "10080")),
        public_api_base_url=public_api_base_url.rstrip("/"),
        default_plan_id=os.getenv("DEFAULT_PLAN_ID") or None,
        screenshot_storage_dir=screenshot_storage_dir,
        screenshot_signed_url_ttl_seconds=int(os.getenv("SCREENSHOT_SIGNED_URL_TTL_SECONDS", "300")),
        screenshot_object_ttl_seconds=int(os.getenv("SCREENSHOT_OBJECT_TTL_SECONDS", "172800")),
        screenshot_max_upload_bytes=int(os.getenv("SCREENSHOT_MAX_UPLOAD_BYTES", "2097152")),
        screenshot_signing_secret=screenshot_signing_secret,
    )


settings = load_settings()
