CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================
-- ENUMS (cleaner than TEXT)
-- =========================
CREATE TYPE subscription_status AS ENUM ('active', 'canceled', 'past_due', 'trialing');
CREATE TYPE ingestion_status AS ENUM ('success', 'rejected');

-- =========================
-- USERS
-- =========================
CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================
-- WORKSPACES
-- =========================
CREATE TABLE workspaces (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name       TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE workspace_settings (
    workspace_id    UUID PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
    api_base_url    TEXT NOT NULL,
    auth_provider   TEXT NOT NULL DEFAULT 'maze-backend',
    ingestion_mode  TEXT NOT NULL DEFAULT 'batched',
    masking         TEXT NOT NULL DEFAULT 'strict',
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================
-- PLANS
-- =========================
CREATE TABLE plans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,

    max_events_per_month BIGINT,
    max_sessions_per_month BIGINT,
    max_api_requests_per_minute INTEGER,

    price_usd NUMERIC(10,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO plans (id, name, max_events_per_month, max_sessions_per_month, max_api_requests_per_minute, price_usd)
VALUES
    ('free', 'Free', 100000, 10000, 120, 0),
    ('growth', 'Growth', 2500000, 250000, 600, 149),
    ('scale', 'Scale', NULL, NULL, NULL, 0)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    max_events_per_month = EXCLUDED.max_events_per_month,
    max_sessions_per_month = EXCLUDED.max_sessions_per_month,
    max_api_requests_per_minute = EXCLUDED.max_api_requests_per_minute,
    price_usd = EXCLUDED.price_usd;

-- =========================
-- SUBSCRIPTIONS
-- =========================
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    plan_id TEXT NOT NULL REFERENCES plans(id),

    status subscription_status NOT NULL DEFAULT 'active',

    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end   TIMESTAMPTZ NOT NULL,

    cancel_at_period_end BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_subscriptions_workspace ON subscriptions(workspace_id);

-- =========================
-- API KEYS
-- =========================
CREATE TABLE api_keys (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    key_hash     TEXT NOT NULL UNIQUE,
    label        TEXT,
    environment  TEXT NOT NULL DEFAULT 'live',
    key_prefix   TEXT,
    revoked      BOOLEAN NOT NULL DEFAULT false,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_api_keys_workspace ON api_keys(workspace_id);

-- =========================
-- SESSIONS
-- =========================
CREATE TABLE sessions (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    device_id    TEXT NOT NULL,

    app_version   TEXT,
    screen_width  FLOAT,
    screen_height FLOAT,

    started_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at     TIMESTAMPTZ
);

CREATE INDEX idx_sessions_workspace ON sessions(workspace_id);

-- =========================
-- EVENTS (PARTITIONED + IDEMPOTENT)
-- =========================
CREATE TABLE events (
    id           UUID DEFAULT gen_random_uuid(),
    event_id     TEXT NOT NULL, -- idempotency key from client

    session_id   UUID NOT NULL,
    workspace_id UUID NOT NULL,

    event_type   TEXT NOT NULL,
    screen       TEXT,
    element_id   TEXT,

    x FLOAT,
    y FLOAT,
    screenshot_id UUID,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

    occurred_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

    PRIMARY KEY (id, occurred_at),

    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
) PARTITION BY RANGE (occurred_at);

-- event idempotency table 
CREATE TABLE event_dedup (
    workspace_id UUID NOT NULL,
    event_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (workspace_id, event_id)
);

-- Example partition (you must create these monthly via job)
CREATE TABLE events_2026_04 PARTITION OF events
FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');

-- Indexes per partition (important!)
CREATE INDEX idx_events_ws_time_2026_04 
ON events_2026_04(workspace_id, occurred_at);

CREATE INDEX idx_events_ws_screen_2026_04 
ON events_2026_04(workspace_id, screen);

-- =========================
-- SCREENSHOT ASSETS
-- =========================
CREATE TABLE screenshot_assets (
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
);

CREATE INDEX idx_screenshot_assets_workspace ON screenshot_assets(workspace_id, uploaded_at DESC);
CREATE INDEX idx_screenshot_assets_screen ON screenshot_assets(workspace_id, screen, uploaded_at DESC);

-- =========================
-- INSIGHTS
-- =========================
CREATE TABLE insights (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    title        TEXT NOT NULL,
    body         TEXT NOT NULL,
    severity     TEXT NOT NULL,
    issue_type   TEXT,
    screen       TEXT,
    element_id   TEXT,
    frequency    BIGINT NOT NULL DEFAULT 0,
    affected_users_count INTEGER NOT NULL DEFAULT 0,
    payload      JSONB NOT NULL DEFAULT '{}'::jsonb,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_insights_workspace ON insights(workspace_id, generated_at);

-- =========================
-- ISSUES
-- =========================
CREATE TABLE issues (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id   UUID REFERENCES sessions(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    type         TEXT NOT NULL,
    severity     TEXT NOT NULL,
    screen       TEXT,
    element_id   TEXT,
    frequency    BIGINT NOT NULL DEFAULT 0,
    affected_users_count INTEGER NOT NULL DEFAULT 0,
    details      JSONB NOT NULL DEFAULT '{}'::jsonb,
    detected_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_issues_workspace ON issues(workspace_id);
CREATE INDEX idx_issues_session   ON issues(session_id);

-- =========================
-- USAGE DAILY
-- =========================
CREATE TABLE usage_daily (
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    date DATE NOT NULL,

    events_count BIGINT DEFAULT 0,
    sessions_count BIGINT DEFAULT 0,
    api_requests_count BIGINT DEFAULT 0,

    PRIMARY KEY (workspace_id, date)
);

-- =========================
-- USAGE MONTHLY
-- =========================
CREATE TABLE usage_monthly (
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    month DATE NOT NULL,

    events_count BIGINT NOT NULL,
    sessions_count BIGINT NOT NULL,
    api_requests_count BIGINT NOT NULL,

    PRIMARY KEY (workspace_id, month)
);

-- =========================
-- BILLING CYCLES
-- =========================
CREATE TABLE billing_cycles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

    period_start DATE NOT NULL,
    period_end   DATE NOT NULL,

    events_used BIGINT,
    sessions_used BIGINT,
    api_requests_used BIGINT,

    plan_id TEXT NOT NULL,

    billed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_billing_workspace ON billing_cycles(workspace_id);

-- =========================
-- API KEY USAGE
-- =========================
CREATE TABLE api_key_usage_daily (
    api_key_id UUID REFERENCES api_keys(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    request_count BIGINT DEFAULT 0,

    PRIMARY KEY (api_key_id, date)
);

-- =========================
-- INGESTION LOGS
-- =========================
CREATE TABLE ingestion_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id),

    status ingestion_status,
    reason TEXT,

    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ingestion_workspace ON ingestion_logs(workspace_id);
