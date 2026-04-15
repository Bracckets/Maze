BEGIN;

CREATE TABLE IF NOT EXISTS liquid_segments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    segment_key TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    conditions JSONB NOT NULL DEFAULT '{"all":[],"any":[]}'::jsonb,
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (workspace_id, segment_key)
);

CREATE TABLE IF NOT EXISTS liquid_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    rule_key TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    conditions JSONB NOT NULL DEFAULT '{"all":[],"any":[]}'::jsonb,
    priority INTEGER NOT NULL DEFAULT 100,
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (workspace_id, rule_key)
);

CREATE TABLE IF NOT EXISTS liquid_experiments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    experiment_key TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'draft',
    traffic_allocation INTEGER NOT NULL DEFAULT 100,
    seed TEXT NOT NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (workspace_id, experiment_key)
);

CREATE TABLE IF NOT EXISTS liquid_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    key_name TEXT NOT NULL,
    label TEXT NOT NULL,
    description TEXT,
    namespace TEXT,
    default_locale TEXT NOT NULL DEFAULT 'en',
    enabled BOOLEAN NOT NULL DEFAULT true,
    content_kind TEXT NOT NULL DEFAULT 'text',
    published_revision INTEGER NOT NULL DEFAULT 0,
    draft_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    published_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    published_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (workspace_id, key_name)
);

CREATE TABLE IF NOT EXISTS liquid_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    key_id UUID NOT NULL REFERENCES liquid_keys(id) ON DELETE CASCADE,
    stage TEXT NOT NULL DEFAULT 'draft',
    locale TEXT,
    content JSONB NOT NULL DEFAULT '{}'::jsonb,
    segment_id UUID REFERENCES liquid_segments(id) ON DELETE SET NULL,
    rule_id UUID REFERENCES liquid_rules(id) ON DELETE SET NULL,
    experiment_id UUID REFERENCES liquid_experiments(id) ON DELETE SET NULL,
    experiment_arm TEXT,
    traffic_percentage INTEGER NOT NULL DEFAULT 100,
    priority INTEGER NOT NULL DEFAULT 100,
    is_default BOOLEAN NOT NULL DEFAULT false,
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (stage IN ('draft', 'published')),
    CHECK (traffic_percentage >= 0 AND traffic_percentage <= 100)
);

CREATE TABLE IF NOT EXISTS liquid_screen_bundles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    screen_key TEXT NOT NULL,
    label TEXT NOT NULL,
    description TEXT,
    enabled BOOLEAN NOT NULL DEFAULT true,
    published_revision INTEGER NOT NULL DEFAULT 0,
    published_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    published_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (workspace_id, screen_key)
);

CREATE TABLE IF NOT EXISTS liquid_screen_bundle_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    bundle_id UUID NOT NULL REFERENCES liquid_screen_bundles(id) ON DELETE CASCADE,
    key_id UUID NOT NULL REFERENCES liquid_keys(id) ON DELETE CASCADE,
    stage TEXT NOT NULL DEFAULT 'draft',
    order_index INTEGER NOT NULL DEFAULT 0,
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (bundle_id, key_id, stage),
    CHECK (stage IN ('draft', 'published'))
);

CREATE INDEX IF NOT EXISTS idx_liquid_segments_workspace ON liquid_segments(workspace_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_liquid_rules_workspace ON liquid_rules(workspace_id, priority DESC, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_liquid_experiments_workspace ON liquid_experiments(workspace_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_liquid_keys_workspace ON liquid_keys(workspace_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_liquid_variants_key_stage ON liquid_variants(key_id, stage, priority DESC);
CREATE INDEX IF NOT EXISTS idx_liquid_variants_workspace_stage ON liquid_variants(workspace_id, stage);
CREATE INDEX IF NOT EXISTS idx_liquid_bundles_workspace ON liquid_screen_bundles(workspace_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_liquid_bundle_mappings_bundle_stage ON liquid_screen_bundle_mappings(bundle_id, stage, order_index ASC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_liquid_default_variant_unique ON liquid_variants (key_id, stage, COALESCE(locale, '')) WHERE is_default = true;

COMMIT;
