from __future__ import annotations

from collections.abc import AsyncGenerator
from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Index, Integer, Numeric, String, Text, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from app.core.config import get_settings


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


class Workspace(Base):
    __tablename__ = "workspaces"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    name: Mapped[str] = mapped_column(Text, nullable=False)
    slug: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class Project(Base):
    __tablename__ = "projects"
    __table_args__ = (UniqueConstraint("workspace_id", "slug", name="uq_projects_workspace_slug"),)

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    workspace_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("workspaces.id"), nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    slug: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class Environment(Base):
    __tablename__ = "environments"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    project_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("projects.id"), nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class ApiKey(Base):
    __tablename__ = "api_keys"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    workspace_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("workspaces.id"), nullable=False)
    project_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("projects.id"), nullable=False)
    environment: Mapped[str] = mapped_column(Text, nullable=False)
    key_hash: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    key_prefix: Mapped[str] = mapped_column(Text, default="px", nullable=False)
    last_four: Mapped[str] = mapped_column(Text, default="", nullable=False)
    name: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class UiElement(Base):
    __tablename__ = "ui_elements"
    __table_args__ = (
        UniqueConstraint("workspace_id", "project_id", "environment", "element_key", name="uq_ui_elements_scope_key"),
        Index("ix_ui_elements_workspace_project_key", "workspace_id", "project_id", "element_key"),
    )

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    workspace_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("workspaces.id"), nullable=False)
    project_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("projects.id"), nullable=False)
    environment: Mapped[str] = mapped_column(Text, nullable=False)
    element_key: Mapped[str] = mapped_column(Text, nullable=False)
    element_type: Mapped[str] = mapped_column(Text, nullable=False)
    intent: Mapped[str | None] = mapped_column(Text)
    default_props: Mapped[dict] = mapped_column(JSONB, default=dict)
    metadata_: Mapped[dict] = mapped_column("metadata", JSONB, default=dict)
    first_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class InteractionEvent(Base):
    __tablename__ = "interaction_events"
    __table_args__ = (
        Index("ix_interaction_events_subject_time", "workspace_id", "project_id", "subject_id", "occurred_at"),
        Index("ix_interaction_events_element_time", "workspace_id", "project_id", "element_key", "occurred_at"),
    )

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    workspace_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("workspaces.id"), nullable=False)
    project_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("projects.id"), nullable=False)
    environment: Mapped[str] = mapped_column(Text, nullable=False)
    subject_id: Mapped[str | None] = mapped_column(Text)
    anonymous_id: Mapped[str | None] = mapped_column(Text)
    session_id: Mapped[str | None] = mapped_column(Text)
    element_key: Mapped[str] = mapped_column(Text, nullable=False)
    event_type: Mapped[str] = mapped_column(Text, nullable=False)
    event_value: Mapped[dict] = mapped_column(JSONB, default=dict)
    context: Mapped[dict] = mapped_column(JSONB, default=dict)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class UxProfile(Base):
    __tablename__ = "ux_profiles"
    __table_args__ = (
        UniqueConstraint("workspace_id", "project_id", "environment", "subject_id", name="uq_ux_profiles_scope_subject"),
        Index("ix_ux_profiles_workspace_project_subject", "workspace_id", "project_id", "subject_id"),
    )

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    workspace_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("workspaces.id"), nullable=False)
    project_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("projects.id"), nullable=False)
    environment: Mapped[str] = mapped_column(Text, nullable=False)
    subject_id: Mapped[str] = mapped_column(Text, nullable=False)
    anonymous_id: Mapped[str | None] = mapped_column(Text)
    traits: Mapped[dict] = mapped_column(JSONB, default=dict)
    scores: Mapped[dict] = mapped_column(JSONB, default=dict)
    counters: Mapped[dict] = mapped_column(JSONB, default=dict)
    preferences: Mapped[dict] = mapped_column(JSONB, default=dict)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class DesignSystem(Base):
    __tablename__ = "design_systems"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    workspace_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("workspaces.id"), nullable=False)
    project_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False), ForeignKey("projects.id"))
    name: Mapped[str] = mapped_column(Text, nullable=False)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    tokens: Mapped[dict] = mapped_column(JSONB, default=dict)
    component_contracts: Mapped[dict] = mapped_column(JSONB, default=dict)
    brand_voice: Mapped[dict] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class AdaptationPolicy(Base):
    __tablename__ = "adaptation_policies"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    workspace_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("workspaces.id"), nullable=False)
    project_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("projects.id"), nullable=False)
    environment: Mapped[str] = mapped_column(Text, nullable=False)
    element_key: Mapped[str | None] = mapped_column(Text)
    scope: Mapped[str] = mapped_column(Text, nullable=False)
    mode: Mapped[str] = mapped_column(Text, default="observe", nullable=False)
    allowed_adaptations: Mapped[dict] = mapped_column(JSONB, default=dict)
    blocked_adaptations: Mapped[dict] = mapped_column(JSONB, default=dict)
    design_tokens: Mapped[dict] = mapped_column(JSONB, default=dict)
    brand_constraints: Mapped[dict] = mapped_column(JSONB, default=dict)
    risk_policy: Mapped[dict] = mapped_column(JSONB, default=dict)
    sensitive_context_rules: Mapped[dict] = mapped_column(JSONB, default=dict)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class AdaptationProposal(Base):
    __tablename__ = "adaptation_proposals"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    workspace_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("workspaces.id"), nullable=False)
    project_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("projects.id"), nullable=False)
    environment: Mapped[str] = mapped_column(Text, nullable=False)
    subject_id: Mapped[str | None] = mapped_column(Text)
    element_key: Mapped[str] = mapped_column(Text, nullable=False)
    proposal: Mapped[dict] = mapped_column(JSONB, nullable=False)
    source: Mapped[str] = mapped_column(Text, nullable=False)
    confidence: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    reason: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class AdaptationDecision(Base):
    __tablename__ = "adaptation_decisions"
    __table_args__ = (
        Index("ix_adaptation_decisions_subject_time", "workspace_id", "project_id", "subject_id", "created_at"),
        Index("ix_adaptation_decisions_element_time", "workspace_id", "project_id", "element_key", "created_at"),
    )

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    workspace_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("workspaces.id"), nullable=False)
    project_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("projects.id"), nullable=False)
    environment: Mapped[str] = mapped_column(Text, nullable=False)
    subject_id: Mapped[str | None] = mapped_column(Text)
    element_key: Mapped[str] = mapped_column(Text, nullable=False)
    proposal_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False), ForeignKey("adaptation_proposals.id"))
    decision: Mapped[dict] = mapped_column(JSONB, nullable=False)
    blocked: Mapped[list] = mapped_column(JSONB, default=list)
    reason: Mapped[str | None] = mapped_column(Text)
    policy_passed: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    fallback: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    mode: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class AdaptationOutcome(Base):
    __tablename__ = "adaptation_outcomes"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    workspace_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("workspaces.id"), nullable=False)
    project_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("projects.id"), nullable=False)
    environment: Mapped[str] = mapped_column(Text, nullable=False)
    subject_id: Mapped[str | None] = mapped_column(Text)
    element_key: Mapped[str] = mapped_column(Text, nullable=False)
    decision_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False), ForeignKey("adaptation_decisions.id"))
    event_type: Mapped[str] = mapped_column(Text, nullable=False)
    value: Mapped[dict | None] = mapped_column(JSONB)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class AgentRun(Base):
    __tablename__ = "agent_runs"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    workspace_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("workspaces.id"), nullable=False)
    project_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False), ForeignKey("projects.id"))
    environment: Mapped[str | None] = mapped_column(Text)
    subject_id: Mapped[str | None] = mapped_column(Text)
    element_key: Mapped[str | None] = mapped_column(Text)
    agent_name: Mapped[str] = mapped_column(Text, nullable=False)
    input_hash: Mapped[str | None] = mapped_column(Text)
    model: Mapped[str | None] = mapped_column(Text)
    input: Mapped[dict | None] = mapped_column(JSONB)
    output: Mapped[dict | None] = mapped_column(JSONB)
    status: Mapped[str] = mapped_column(Text, nullable=False)
    latency_ms: Mapped[int | None] = mapped_column(Integer)
    cost_usd: Mapped[float | None] = mapped_column(Numeric)
    error: Mapped[str | None] = mapped_column(Text)
    retry_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


_SessionLocal: async_sessionmaker[AsyncSession] | None = None


def get_sessionmaker() -> async_sessionmaker[AsyncSession]:
    global _SessionLocal
    if _SessionLocal is None:
        engine = create_async_engine(get_settings().database_url, pool_pre_ping=True)
        _SessionLocal = async_sessionmaker(engine, expire_on_commit=False)
    return _SessionLocal


async def init_database() -> None:
    settings = get_settings()
    database_url = settings.database_url
    if settings.auto_create_database:
        await ensure_database_exists(database_url)
    engine = create_async_engine(database_url, pool_pre_ping=True)
    if settings.auto_create_tables:
        async with engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)
            await connection.execute(text("ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS key_prefix TEXT NOT NULL DEFAULT 'px'"))
            await connection.execute(text("ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS last_four TEXT NOT NULL DEFAULT ''"))
    await engine.dispose()


async def ensure_database_exists(database_url: str) -> None:
    url = make_url(database_url)
    database_name = url.database
    if not database_name:
        return

    admin_database = "postgres" if database_name != "postgres" else "template1"
    admin_engine = create_async_engine(
        url.set(database=admin_database),
        isolation_level="AUTOCOMMIT",
        pool_pre_ping=True,
    )
    try:
        async with admin_engine.connect() as connection:
            exists = await connection.scalar(
                text("select 1 from pg_database where datname = :database_name"),
                {"database_name": database_name},
            )
            if exists is None:
                await connection.execute(text(f"CREATE DATABASE {_quote_identifier(database_name)}"))
    finally:
        await admin_engine.dispose()


def _quote_identifier(identifier: str) -> str:
    return '"' + identifier.replace('"', '""') + '"'


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with get_sessionmaker()() as session:
        yield session
