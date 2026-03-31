from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker

from app.settings import settings

DATABASE_URL = settings.database_url

if not DATABASE_URL:
    raise ValueError("DATABASE_URL must be set.")

if DATABASE_URL.startswith("sqlite"):
    raise ValueError("This app now requires PostgreSQL. SQLite support has been removed.")

engine = create_engine(DATABASE_URL, future=True, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def verify_required_schema() -> None:
    inspector = inspect(engine)
    tables = set(inspector.get_table_names())
    required_tables = {
        "api_key_usage_daily",
        "api_keys",
        "billing_cycles",
        "event_dedup",
        "events",
        "ingestion_logs",
        "insights",
        "issues",
        "plans",
        "sessions",
        "subscriptions",
        "usage_daily",
        "usage_monthly",
        "users",
        "workspace_settings",
        "workspaces"
    }
    missing = sorted(required_tables - tables)
    if missing:
        raise RuntimeError(f"PostgreSQL schema is missing required tables: {', '.join(missing)}")


def ensure_runtime_schema() -> None:
    with engine.begin() as connection:
        connection.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS workspace_settings (
                    workspace_id UUID PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
                    api_base_url TEXT NOT NULL,
                    auth_provider TEXT NOT NULL DEFAULT 'maze-backend',
                    ingestion_mode TEXT NOT NULL DEFAULT 'batched',
                    masking TEXT NOT NULL DEFAULT 'strict',
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
                )
                """
            )
        )
        connection.execute(text("ALTER TABLE events ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb"))
        connection.execute(text("ALTER TABLE events ADD COLUMN IF NOT EXISTS screenshot_id UUID"))
        connection.execute(text("ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS environment TEXT NOT NULL DEFAULT 'live'"))
        connection.execute(text("ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS key_prefix TEXT"))
        connection.execute(text("ALTER TABLE issues ALTER COLUMN session_id DROP NOT NULL"))
        connection.execute(text("ALTER TABLE issues ADD COLUMN IF NOT EXISTS element_id TEXT"))
        connection.execute(text("ALTER TABLE issues ADD COLUMN IF NOT EXISTS frequency BIGINT NOT NULL DEFAULT 0"))
        connection.execute(text("ALTER TABLE issues ADD COLUMN IF NOT EXISTS affected_users_count INTEGER NOT NULL DEFAULT 0"))
        connection.execute(text("ALTER TABLE issues ADD COLUMN IF NOT EXISTS details JSONB NOT NULL DEFAULT '{}'::jsonb"))
        connection.execute(text("ALTER TABLE issues ADD COLUMN IF NOT EXISTS detected_at TIMESTAMPTZ NOT NULL DEFAULT now()"))
        connection.execute(text("ALTER TABLE insights ADD COLUMN IF NOT EXISTS issue_type TEXT"))
        connection.execute(text("ALTER TABLE insights ADD COLUMN IF NOT EXISTS screen TEXT"))
        connection.execute(text("ALTER TABLE insights ADD COLUMN IF NOT EXISTS element_id TEXT"))
        connection.execute(text("ALTER TABLE insights ADD COLUMN IF NOT EXISTS frequency BIGINT NOT NULL DEFAULT 0"))
        connection.execute(text("ALTER TABLE insights ADD COLUMN IF NOT EXISTS affected_users_count INTEGER NOT NULL DEFAULT 0"))
        connection.execute(text("ALTER TABLE insights ADD COLUMN IF NOT EXISTS payload JSONB NOT NULL DEFAULT '{}'::jsonb"))
        connection.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS screenshot_assets (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
                    session_id UUID,
                    screen TEXT,
                    object_key TEXT NOT NULL UNIQUE,
                    content_type TEXT NOT NULL,
                    width INTEGER,
                    height INTEGER,
                    byte_size BIGINT NOT NULL,
                    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                    expires_at TIMESTAMPTZ NOT NULL
                )
                """
            )
        )
        connection.execute(text("CREATE INDEX IF NOT EXISTS idx_screenshot_assets_workspace ON screenshot_assets(workspace_id, uploaded_at DESC)"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS idx_screenshot_assets_screen ON screenshot_assets(workspace_id, screen, uploaded_at DESC)"))
