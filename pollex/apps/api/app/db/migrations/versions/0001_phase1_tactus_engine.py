"""create phase 1 tactus engine tables

Revision ID: 0001_phase1
Revises:
Create Date: 2026-04-25
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "0001_phase1"
down_revision = None
branch_labels = None
depends_on = None


def _timestamps(updated: bool = True) -> list[sa.Column]:
    columns = [sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"))]
    if updated:
        columns.append(sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")))
    return columns


def upgrade() -> None:
    op.create_table(
        "workspaces",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("slug", sa.Text(), nullable=False, unique=True),
        *_timestamps(),
    )
    op.create_table(
        "projects",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=False), sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("slug", sa.Text(), nullable=False),
        *_timestamps(),
        sa.UniqueConstraint("workspace_id", "slug", name="uq_projects_workspace_slug"),
    )
    op.create_table(
        "environments",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=False), sa.ForeignKey("projects.id"), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_table(
        "api_keys",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=False), sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=False), sa.ForeignKey("projects.id"), nullable=False),
        sa.Column("environment", sa.Text(), nullable=False),
        sa.Column("key_hash", sa.Text(), nullable=False, unique=True),
        sa.Column("name", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("last_used_at", sa.DateTime(timezone=True)),
        sa.Column("revoked_at", sa.DateTime(timezone=True)),
    )
    op.create_table(
        "ui_elements",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=False), sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=False), sa.ForeignKey("projects.id"), nullable=False),
        sa.Column("environment", sa.Text(), nullable=False),
        sa.Column("element_key", sa.Text(), nullable=False),
        sa.Column("element_type", sa.Text(), nullable=False),
        sa.Column("intent", sa.Text()),
        sa.Column("default_props", postgresql.JSONB(), server_default=sa.text("'{}'::jsonb")),
        sa.Column("metadata", postgresql.JSONB(), server_default=sa.text("'{}'::jsonb")),
        sa.Column("first_seen_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.UniqueConstraint("workspace_id", "project_id", "environment", "element_key", name="uq_ui_elements_scope_key"),
    )
    op.create_table(
        "interaction_events",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=False), sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=False), sa.ForeignKey("projects.id"), nullable=False),
        sa.Column("environment", sa.Text(), nullable=False),
        sa.Column("subject_id", sa.Text()),
        sa.Column("anonymous_id", sa.Text()),
        sa.Column("session_id", sa.Text()),
        sa.Column("element_key", sa.Text(), nullable=False),
        sa.Column("event_type", sa.Text(), nullable=False),
        sa.Column("event_value", postgresql.JSONB(), server_default=sa.text("'{}'::jsonb")),
        sa.Column("context", postgresql.JSONB(), server_default=sa.text("'{}'::jsonb")),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("received_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_table(
        "ux_profiles",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=False), sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=False), sa.ForeignKey("projects.id"), nullable=False),
        sa.Column("environment", sa.Text(), nullable=False),
        sa.Column("subject_id", sa.Text(), nullable=False),
        sa.Column("anonymous_id", sa.Text()),
        sa.Column("traits", postgresql.JSONB(), server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("scores", postgresql.JSONB(), server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("counters", postgresql.JSONB(), server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("preferences", postgresql.JSONB(), server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("last_seen_at", sa.DateTime(timezone=True)),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.UniqueConstraint("workspace_id", "project_id", "environment", "subject_id", name="uq_ux_profiles_scope_subject"),
    )
    op.create_table(
        "design_systems",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=False), sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=False), sa.ForeignKey("projects.id")),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("version", sa.Integer(), server_default="1", nullable=False),
        sa.Column("tokens", postgresql.JSONB(), server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("component_contracts", postgresql.JSONB(), server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("brand_voice", postgresql.JSONB(), server_default=sa.text("'{}'::jsonb"), nullable=False),
        *_timestamps(),
    )
    op.create_table(
        "adaptation_policies",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=False), sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=False), sa.ForeignKey("projects.id"), nullable=False),
        sa.Column("environment", sa.Text(), nullable=False),
        sa.Column("element_key", sa.Text()),
        sa.Column("scope", sa.Text(), nullable=False),
        sa.Column("mode", sa.Text(), server_default="observe", nullable=False),
        sa.Column("allowed_adaptations", postgresql.JSONB(), server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("blocked_adaptations", postgresql.JSONB(), server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("design_tokens", postgresql.JSONB(), server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("brand_constraints", postgresql.JSONB(), server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("risk_policy", postgresql.JSONB(), server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("sensitive_context_rules", postgresql.JSONB(), server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_table(
        "adaptation_proposals",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=False), sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=False), sa.ForeignKey("projects.id"), nullable=False),
        sa.Column("environment", sa.Text(), nullable=False),
        sa.Column("subject_id", sa.Text()),
        sa.Column("element_key", sa.Text(), nullable=False),
        sa.Column("proposal", postgresql.JSONB(), nullable=False),
        sa.Column("source", sa.Text(), nullable=False),
        sa.Column("confidence", sa.Float(), server_default="0", nullable=False),
        sa.Column("reason", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_table(
        "adaptation_decisions",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=False), sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=False), sa.ForeignKey("projects.id"), nullable=False),
        sa.Column("environment", sa.Text(), nullable=False),
        sa.Column("subject_id", sa.Text()),
        sa.Column("element_key", sa.Text(), nullable=False),
        sa.Column("proposal_id", postgresql.UUID(as_uuid=False), sa.ForeignKey("adaptation_proposals.id")),
        sa.Column("decision", postgresql.JSONB(), nullable=False),
        sa.Column("blocked", postgresql.JSONB(), server_default=sa.text("'[]'::jsonb"), nullable=False),
        sa.Column("reason", sa.Text()),
        sa.Column("policy_passed", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("fallback", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("mode", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_table(
        "adaptation_outcomes",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=False), sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=False), sa.ForeignKey("projects.id"), nullable=False),
        sa.Column("environment", sa.Text(), nullable=False),
        sa.Column("subject_id", sa.Text()),
        sa.Column("element_key", sa.Text(), nullable=False),
        sa.Column("decision_id", postgresql.UUID(as_uuid=False), sa.ForeignKey("adaptation_decisions.id")),
        sa.Column("event_type", sa.Text(), nullable=False),
        sa.Column("value", postgresql.JSONB()),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "agent_runs",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=False), sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=False), sa.ForeignKey("projects.id")),
        sa.Column("environment", sa.Text()),
        sa.Column("subject_id", sa.Text()),
        sa.Column("element_key", sa.Text()),
        sa.Column("agent_name", sa.Text(), nullable=False),
        sa.Column("input_hash", sa.Text()),
        sa.Column("model", sa.Text()),
        sa.Column("input", postgresql.JSONB()),
        sa.Column("output", postgresql.JSONB()),
        sa.Column("status", sa.Text(), nullable=False),
        sa.Column("latency_ms", sa.Integer()),
        sa.Column("cost_usd", sa.Numeric()),
        sa.Column("error", sa.Text()),
        sa.Column("retry_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )

    op.create_index("ix_interaction_events_subject_time", "interaction_events", ["workspace_id", "project_id", "subject_id", sa.text("occurred_at DESC")])
    op.create_index("ix_interaction_events_element_time", "interaction_events", ["workspace_id", "project_id", "element_key", sa.text("occurred_at DESC")])
    op.create_index("ix_ux_profiles_workspace_project_subject", "ux_profiles", ["workspace_id", "project_id", "subject_id"])
    op.create_index("ix_ui_elements_workspace_project_key", "ui_elements", ["workspace_id", "project_id", "element_key"])
    op.create_index("ix_adaptation_decisions_subject_time", "adaptation_decisions", ["workspace_id", "project_id", "subject_id", sa.text("created_at DESC")])
    op.create_index("ix_adaptation_decisions_element_time", "adaptation_decisions", ["workspace_id", "project_id", "element_key", sa.text("created_at DESC")])


def downgrade() -> None:
    op.drop_table("agent_runs")
    op.drop_table("adaptation_outcomes")
    op.drop_table("adaptation_decisions")
    op.drop_table("adaptation_proposals")
    op.drop_table("adaptation_policies")
    op.drop_table("design_systems")
    op.drop_table("ux_profiles")
    op.drop_table("interaction_events")
    op.drop_table("ui_elements")
    op.drop_table("api_keys")
    op.drop_table("environments")
    op.drop_table("projects")
    op.drop_table("workspaces")
