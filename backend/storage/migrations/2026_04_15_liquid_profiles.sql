BEGIN;

CREATE TABLE IF NOT EXISTS liquid_profile_traits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    trait_key TEXT NOT NULL,
    label TEXT NOT NULL,
    description TEXT,
    value_type TEXT NOT NULL DEFAULT 'text',
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (workspace_id, trait_key)
);

CREATE INDEX IF NOT EXISTS idx_liquid_profile_traits_workspace ON liquid_profile_traits(workspace_id, updated_at DESC);

COMMIT;
