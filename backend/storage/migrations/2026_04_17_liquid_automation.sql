BEGIN;

ALTER TABLE liquid_profile_traits
ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'app_profile';

ALTER TABLE liquid_profile_traits
ADD COLUMN IF NOT EXISTS source_key TEXT;

ALTER TABLE liquid_profile_traits
ADD COLUMN IF NOT EXISTS example_values JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS liquid_subject_traits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    subject_id TEXT NOT NULL,
    traits JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (workspace_id, subject_id)
);

CREATE INDEX IF NOT EXISTS idx_liquid_subject_traits_workspace ON liquid_subject_traits(workspace_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS liquid_computed_traits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    subject_id TEXT NOT NULL,
    traits JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (workspace_id, subject_id)
);

CREATE INDEX IF NOT EXISTS idx_liquid_computed_traits_workspace ON liquid_computed_traits(workspace_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS liquid_resolution_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    stage TEXT NOT NULL,
    screen_key TEXT NOT NULL,
    subject_id TEXT,
    request_traits JSONB NOT NULL DEFAULT '{}'::jsonb,
    resolved_traits JSONB NOT NULL DEFAULT '{}'::jsonb,
    matched_profile_count INTEGER NOT NULL DEFAULT 0,
    fallback_item_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_liquid_resolution_logs_workspace ON liquid_resolution_logs(workspace_id, created_at DESC);

COMMIT;
