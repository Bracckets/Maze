from __future__ import annotations

from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import (
    AdaptationDecision,
    AdaptationPolicy,
    DesignSystem,
    InteractionEvent,
    Project,
    UiElement,
    UxProfile,
    Workspace,
    get_session,
    utcnow,
)
from app.core.security import create_studio_token, verify_studio_token
from app.sdk.schemas import ResolveRequest
from app.tactus.policy.validator import PolicyValidator
from app.tactus.propose.engine import ProposalEngine
from app.tactus.resolve.orchestrator import fallback_decision


router = APIRouter(prefix="/studio", tags=["studio"])


class StudioAuthRequest(BaseModel):
    email: str
    password: str


class StudioAuthResponse(BaseModel):
    token: str
    user: dict[str, str]


class ProjectCreateRequest(BaseModel):
    name: str
    slug: str
    workspace_name: str = "Default Workspace"
    workspace_slug: str = "default"


class PolicyUpdateRequest(BaseModel):
    mode: str
    allowed_adaptations: dict[str, bool] = Field(default_factory=dict)
    blocked_adaptations: dict[str, bool] = Field(default_factory=dict)
    risk_policy: dict[str, bool] = Field(default_factory=dict)
    sensitive_context_rules: dict[str, bool] = Field(default_factory=dict)


class DesignSystemUpdateRequest(BaseModel):
    name: str = "Default Design System"
    tokens: dict[str, Any] = Field(default_factory=dict)
    component_contracts: dict[str, Any] = Field(default_factory=dict)
    brand_voice: dict[str, Any] = Field(default_factory=dict)


class PlaygroundResolveRequest(ResolveRequest):
    profile: dict[str, Any] = Field(default_factory=dict)
    policy: dict[str, Any] = Field(default_factory=dict)
    design_system: dict[str, Any] = Field(default_factory=dict)


def require_studio_auth(authorization: str | None = Header(default=None)) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing Studio token")
    subject = verify_studio_token(authorization.split(" ", 1)[1].strip())
    if not subject:
        raise HTTPException(status_code=401, detail="Invalid Studio token")
    return subject


@router.post("/auth/login", response_model=StudioAuthResponse)
async def login(request: StudioAuthRequest) -> StudioAuthResponse:
    if not request.email.strip() or not request.password:
        raise HTTPException(status_code=400, detail="Email and password are required")
    return StudioAuthResponse(token=create_studio_token(request.email), user={"email": request.email})


@router.post("/auth/signup", response_model=StudioAuthResponse)
async def signup(request: StudioAuthRequest) -> StudioAuthResponse:
    return await login(request)


@router.get("/auth/me")
async def me(subject: str = Depends(require_studio_auth)) -> dict[str, str]:
    return {"email": subject}


@router.get("/overview")
async def overview(_: str = Depends(require_studio_auth), session: AsyncSession = Depends(get_session)) -> dict[str, Any]:
    try:
        now = utcnow()
        last_7 = now - timedelta(days=7)
        last_24 = now - timedelta(days=1)
        element_count = await scalar_count(session, select(func.count(UiElement.id)))
        active_profiles = await scalar_count(session, select(func.count(UxProfile.id)).where(UxProfile.last_seen_at >= last_7))
        decisions_24h = await scalar_count(session, select(func.count(AdaptationDecision.id)).where(AdaptationDecision.created_at >= last_24))
        decisions_7d = await scalar_count(session, select(func.count(AdaptationDecision.id)).where(AdaptationDecision.created_at >= last_7))
        fallback_count = await scalar_count(session, select(func.count(AdaptationDecision.id)).where(AdaptationDecision.fallback.is_(True)))
        total_decisions = await scalar_count(session, select(func.count(AdaptationDecision.id)))

        profiles = (await session.execute(select(UxProfile))).scalars().all()
        trait_counts = Counter()
        for profile in profiles:
            for key, value in (profile.traits or {}).items():
                if value is True:
                    trait_counts[key] += 1

        decisions = (await session.execute(select(AdaptationDecision).where(AdaptationDecision.created_at >= last_7))).scalars().all()
        by_day: dict[str, int] = defaultdict(int)
        for decision in decisions:
            by_day[decision.created_at.date().isoformat()] += 1

        return {
            "total_observed_elements": element_count,
            "active_profiles_7d": active_profiles,
            "decisions_24h": decisions_24h,
            "decisions_7d": decisions_7d,
            "fallback_rate": round((fallback_count / total_decisions) * 100, 2) if total_decisions else 0,
            "policy_blocked_count": sum(len(decision.blocked or []) for decision in decisions),
            "top_traits": [{"trait": key, "count": count} for key, count in trait_counts.most_common(8)],
            "decisions_over_time": [{"date": day, "count": count} for day, count in sorted(by_day.items())],
        }
    except Exception:
        return empty_overview()


@router.get("/projects")
async def projects(_: str = Depends(require_studio_auth), session: AsyncSession = Depends(get_session)) -> list[dict[str, Any]]:
    rows = (await session.execute(select(Project))).scalars().all()
    return [serialize_project(row) for row in rows]


@router.post("/projects")
async def create_project(
    request: ProjectCreateRequest,
    _: str = Depends(require_studio_auth),
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    workspace = (await session.execute(select(Workspace).where(Workspace.slug == request.workspace_slug))).scalar_one_or_none()
    if workspace is None:
        workspace = Workspace(id=str(uuid4()), name=request.workspace_name, slug=request.workspace_slug)
        session.add(workspace)
        await session.flush()
    project = Project(id=str(uuid4()), workspace_id=workspace.id, name=request.name, slug=request.slug)
    session.add(project)
    await session.commit()
    await session.refresh(project)
    return serialize_project(project)


@router.get("/elements")
async def elements(_: str = Depends(require_studio_auth), session: AsyncSession = Depends(get_session)) -> list[dict[str, Any]]:
    rows = (await session.execute(select(UiElement).order_by(UiElement.last_seen_at.desc()))).scalars().all()
    output = []
    for row in rows:
        decision_count = await scalar_count(session, select(func.count(AdaptationDecision.id)).where(AdaptationDecision.element_key == row.element_key))
        policy = await load_policy_for_element(session, row.element_key)
        output.append({**serialize_element(row), "mode": getattr(policy, "mode", "observe"), "recent_decisions": decision_count})
    return output


@router.get("/elements/{element_key:path}")
async def element_detail(
    element_key: str,
    _: str = Depends(require_studio_auth),
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    row = (await session.execute(select(UiElement).where(UiElement.element_key == element_key))).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail="Element not found")
    decisions = (await session.execute(select(AdaptationDecision).where(AdaptationDecision.element_key == element_key).order_by(AdaptationDecision.created_at.desc()).limit(20))).scalars().all()
    events = (await session.execute(select(InteractionEvent).where(InteractionEvent.element_key == element_key).limit(200))).scalars().all()
    subject_ids = {event.subject_id for event in events if event.subject_id}
    profiles = (await session.execute(select(UxProfile).where(UxProfile.subject_id.in_(subject_ids)))).scalars().all() if subject_ids else []
    trait_counts = Counter()
    for profile in profiles:
        for key, value in (profile.traits or {}).items():
            if value is True:
                trait_counts[key] += 1
    return {
        "element": serialize_element(row),
        "policy": serialize_policy(await load_policy_for_element(session, element_key)),
        "recent_decisions": [serialize_decision(decision) for decision in decisions],
        "trait_distribution": [{"trait": key, "count": count} for key, count in trait_counts.most_common()],
    }


@router.get("/profiles")
async def profiles(_: str = Depends(require_studio_auth), session: AsyncSession = Depends(get_session)) -> list[dict[str, Any]]:
    rows = (await session.execute(select(UxProfile).order_by(UxProfile.last_seen_at.desc()))).scalars().all()
    output = []
    for row in rows:
        decision_count = await scalar_count(session, select(func.count(AdaptationDecision.id)).where(AdaptationDecision.subject_id == row.subject_id))
        output.append({**serialize_profile(row), "decision_count": decision_count})
    return output


@router.get("/profiles/{subject_id:path}")
async def profile_detail(
    subject_id: str,
    _: str = Depends(require_studio_auth),
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    row = (await session.execute(select(UxProfile).where(UxProfile.subject_id == subject_id))).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    events = (await session.execute(select(InteractionEvent).where(or_(InteractionEvent.subject_id == subject_id, InteractionEvent.anonymous_id == row.anonymous_id)).order_by(InteractionEvent.occurred_at.desc()).limit(50))).scalars().all()
    decisions = (await session.execute(select(AdaptationDecision).where(AdaptationDecision.subject_id == subject_id).order_by(AdaptationDecision.created_at.desc()).limit(50))).scalars().all()
    return {
        "profile": serialize_profile(row),
        "events": [serialize_event(event) for event in events],
        "decisions": [serialize_decision(decision) for decision in decisions],
    }


@router.get("/decisions")
async def decisions(_: str = Depends(require_studio_auth), session: AsyncSession = Depends(get_session)) -> list[dict[str, Any]]:
    rows = (await session.execute(select(AdaptationDecision).order_by(AdaptationDecision.created_at.desc()).limit(200))).scalars().all()
    return [serialize_decision(row) for row in rows]


@router.get("/decisions/{decision_id}")
async def decision_detail(
    decision_id: str,
    _: str = Depends(require_studio_auth),
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    row = (await session.execute(select(AdaptationDecision).where(AdaptationDecision.id == decision_id))).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail="Decision not found")
    profile = (await session.execute(select(UxProfile).where(UxProfile.subject_id == row.subject_id))).scalar_one_or_none() if row.subject_id else None
    policy = await load_policy_for_element(session, row.element_key)
    return {
        "decision": serialize_decision(row),
        "blocked": row.blocked or [],
        "proposal": {"proposal_id": row.proposal_id},
        "policy": serialize_policy(policy),
        "profile": serialize_profile(profile) if profile else None,
    }


@router.get("/policies")
async def policies(_: str = Depends(require_studio_auth), session: AsyncSession = Depends(get_session)) -> list[dict[str, Any]]:
    rows = (await session.execute(select(AdaptationPolicy).order_by(AdaptationPolicy.updated_at.desc()))).scalars().all()
    return [serialize_policy(row) for row in rows]


@router.put("/policies/{policy_id}")
async def update_policy(
    policy_id: str,
    request: PolicyUpdateRequest,
    _: str = Depends(require_studio_auth),
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    row = (await session.execute(select(AdaptationPolicy).where(AdaptationPolicy.id == policy_id))).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail="Policy not found")
    row.mode = request.mode
    row.allowed_adaptations = request.allowed_adaptations
    row.blocked_adaptations = request.blocked_adaptations
    row.risk_policy = request.risk_policy
    row.sensitive_context_rules = request.sensitive_context_rules
    row.updated_at = utcnow()
    await session.commit()
    await session.refresh(row)
    return serialize_policy(row)


@router.get("/design-system")
async def design_system(_: str = Depends(require_studio_auth), session: AsyncSession = Depends(get_session)) -> dict[str, Any]:
    try:
        row = (await session.execute(select(DesignSystem).order_by(DesignSystem.version.desc()).limit(1))).scalar_one_or_none()
    except SQLAlchemyError:
        return default_design_system()
    return serialize_design_system(row) if row else default_design_system()


@router.put("/design-system")
async def update_design_system(
    request: DesignSystemUpdateRequest,
    _: str = Depends(require_studio_auth),
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    current = (await session.execute(select(DesignSystem).order_by(DesignSystem.version.desc()).limit(1))).scalar_one_or_none()
    workspace_id, project_id = await default_scope(session)
    row = DesignSystem(
        id=str(uuid4()),
        workspace_id=getattr(current, "workspace_id", workspace_id),
        project_id=getattr(current, "project_id", project_id),
        name=request.name,
        version=(getattr(current, "version", 0) or 0) + 1,
        tokens=request.tokens,
        component_contracts=request.component_contracts,
        brand_voice=request.brand_voice,
    )
    session.add(row)
    await session.commit()
    await session.refresh(row)
    return serialize_design_system(row)


@router.get("/playground/presets")
async def playground_presets(_: str = Depends(require_studio_auth)) -> list[dict[str, Any]]:
    return PLAYGROUND_PRESETS


@router.post("/playground/resolve")
async def playground_resolve(request: PlaygroundResolveRequest, _: str = Depends(require_studio_auth)) -> dict[str, Any]:
    profile = request.profile or {"traits": request.traits or {}, "scores": {}, "counters": {}, "preferences": {}}
    policy = request.policy or default_policy()
    design_system = request.design_system or default_design_system()
    engine = ProposalEngine()
    proposal = engine.propose(
        profile,
        request.element.model_dump(),
        request.allow,
        request.constraints,
        request.context,
    )
    if proposal is None:
        validation = {"allowed": True, "filtered_adaptations": {}, "blocked": [], "reason": "No proposal."}
        final = fallback_decision(request.element.key, mode=policy.get("mode", "observe"), reason="Fallback rendered.")
        proposal_payload = None
    else:
        result = PolicyValidator().validate(proposal, policy, design_system, request.context, request.constraints)
        validation = {
            "allowed": result.allowed,
            "filtered_adaptations": result.filtered_adaptations,
            "blocked": result.blocked,
            "reason": result.reason,
        }
        mode = policy.get("mode", "observe")
        fallback = not result.filtered_adaptations or mode == "suggest"
        final = {
            "element_key": request.element.key,
            "adaptations": {} if fallback else result.filtered_adaptations,
            "confidence": 0 if fallback else proposal.confidence,
            "reason": result.reason if fallback else proposal.reason,
            "policy_passed": result.allowed,
            "fallback": fallback,
            "mode": mode,
        }
        proposal_payload = {"adaptations": proposal.adaptations, "confidence": proposal.confidence, "reason": proposal.reason}
    return {
        "profile_used": profile,
        "proposal": proposal_payload,
        "validation_result": validation,
        "final_decision": final,
        "rendered_preview": {"element": request.element.model_dump(), "props": {**request.element.default_props, **final["adaptations"]}},
    }


async def scalar_count(session: AsyncSession, statement: Any) -> int:
    return int((await session.execute(statement)).scalar() or 0)


async def default_scope(session: AsyncSession) -> tuple[str, str | None]:
    workspace = (await session.execute(select(Workspace).limit(1))).scalar_one_or_none()
    if workspace is None:
        workspace = Workspace(id=str(uuid4()), name="Default Workspace", slug="default")
        session.add(workspace)
        await session.flush()
    project = (await session.execute(select(Project).limit(1))).scalar_one_or_none()
    if project is None:
        project = Project(id=str(uuid4()), workspace_id=workspace.id, name="Default Project", slug="default")
        session.add(project)
        await session.flush()
    return workspace.id, project.id


async def load_policy_for_element(session: AsyncSession, element_key: str) -> AdaptationPolicy | dict[str, Any]:
    row = (await session.execute(select(AdaptationPolicy).where(or_(AdaptationPolicy.element_key == element_key, AdaptationPolicy.element_key.is_(None))).order_by(AdaptationPolicy.element_key.is_(None)))).scalars().first()
    return row or default_policy()


def serialize_project(row: Project) -> dict[str, Any]:
    return {"id": row.id, "workspace_id": row.workspace_id, "name": row.name, "slug": row.slug, "created_at": iso(row.created_at)}


def serialize_element(row: UiElement) -> dict[str, Any]:
    return {
        "id": row.id,
        "element_key": row.element_key,
        "type": row.element_type,
        "intent": row.intent,
        "default_props": row.default_props or {},
        "metadata": row.metadata_ or {},
        "first_seen_at": iso(row.first_seen_at),
        "last_seen_at": iso(row.last_seen_at),
    }


def serialize_profile(row: UxProfile) -> dict[str, Any]:
    return {
        "id": row.id,
        "subject_id": row.subject_id,
        "anonymous_id": row.anonymous_id,
        "traits": row.traits or {},
        "scores": row.scores or {},
        "counters": row.counters or {},
        "preferences": row.preferences or {},
        "last_seen_at": iso(row.last_seen_at),
        "updated_at": iso(row.updated_at),
    }


def serialize_event(row: InteractionEvent) -> dict[str, Any]:
    return {
        "id": row.id,
        "element_key": row.element_key,
        "event_type": row.event_type,
        "event_value": row.event_value or {},
        "context": row.context or {},
        "occurred_at": iso(row.occurred_at),
    }


def serialize_decision(row: AdaptationDecision) -> dict[str, Any]:
    return {
        "id": row.id,
        "subject_id": row.subject_id,
        "element_key": row.element_key,
        "decision": row.decision or {},
        "blocked": row.blocked or [],
        "reason": row.reason,
        "policy_passed": row.policy_passed,
        "fallback": row.fallback,
        "mode": row.mode,
        "created_at": iso(row.created_at),
    }


def serialize_policy(row: AdaptationPolicy | dict[str, Any]) -> dict[str, Any]:
    if isinstance(row, dict):
        return row
    return {
        "id": row.id,
        "workspace_id": row.workspace_id,
        "project_id": row.project_id,
        "environment": row.environment,
        "element_key": row.element_key,
        "scope": row.scope,
        "mode": row.mode,
        "allowed_adaptations": row.allowed_adaptations or {},
        "blocked_adaptations": row.blocked_adaptations or {},
        "risk_policy": row.risk_policy or {},
        "sensitive_context_rules": row.sensitive_context_rules or {},
        "updated_at": iso(row.updated_at),
    }


def serialize_design_system(row: DesignSystem) -> dict[str, Any]:
    return {
        "id": row.id,
        "workspace_id": row.workspace_id,
        "project_id": row.project_id,
        "name": row.name,
        "version": row.version,
        "tokens": row.tokens or {},
        "component_contracts": row.component_contracts or {},
        "brand_voice": row.brand_voice or {},
        "created_at": iso(row.created_at),
        "updated_at": iso(row.updated_at),
    }


def default_policy() -> dict[str, Any]:
    return {
        "id": "default",
        "scope": "project",
        "mode": "observe",
        "allowed_adaptations": {"text": True, "size": True, "tooltip": True, "helper_text": True, "aria_label": True},
        "blocked_adaptations": {"color": True, "position": True, "layout": True},
        "risk_policy": {"allow_medium_risk": False, "allow_high_risk": False},
        "sensitive_context_rules": {"allow_text": False},
    }


def default_design_system() -> dict[str, Any]:
    return {
        "id": "default",
        "name": "Default Design System",
        "version": 1,
        "tokens": {"sizes": ["sm", "md", "lg"], "variants": ["primary", "secondary", "ghost"], "typography": ["heading", "body", "caption"]},
        "component_contracts": {"button": {"allowed": ["text", "size", "tooltip"]}, "text": {"allowed": ["text"]}, "input": {"allowed": ["helper_text", "aria_label"]}},
        "brand_voice": {"tone": ["clear"], "emoji": False, "maxTextLength": 24},
    }


def empty_overview() -> dict[str, Any]:
    return {
        "total_observed_elements": 0,
        "active_profiles_7d": 0,
        "decisions_24h": 0,
        "decisions_7d": 0,
        "fallback_rate": 0,
        "policy_blocked_count": 0,
        "top_traits": [],
        "decisions_over_time": [],
    }


def iso(value: datetime | None) -> str | None:
    return value.astimezone(timezone.utc).isoformat() if value else None


PLAYGROUND_PRESETS = [
    {
        "id": "confident",
        "name": "Confident user",
        "expected": "fallback=true",
        "profile": {"traits": {}, "scores": {}, "counters": {}, "preferences": {}},
        "policy": {**default_policy(), "mode": "autopilot"},
        "element": {"key": "checkout.continue", "type": "button", "intent": "progress", "default_props": {"text": "Continue", "size": "md", "variant": "primary"}},
        "context": {"page_type": "checkout", "sensitive": False},
    },
    {
        "id": "hesitant",
        "name": "Hesitant user",
        "expected": "text adaptation applied",
        "profile": {"traits": {"prefers_simple_copy": True}, "scores": {"hesitation_score": 0.7}, "counters": {"hesitations": 3}, "preferences": {}},
        "policy": {**default_policy(), "mode": "autopilot"},
        "element": {"key": "checkout.continue", "type": "button", "intent": "progress", "default_props": {"text": "Continue", "size": "md", "variant": "primary"}},
        "context": {"page_type": "checkout", "sensitive": False},
    },
    {
        "id": "missed-tap",
        "name": "Missed-tap user",
        "expected": "size=lg applied",
        "profile": {"traits": {"needs_larger_targets": True}, "scores": {"misclick_score": 0.85}, "counters": {"missed_taps": 3}, "preferences": {}},
        "policy": {**default_policy(), "mode": "autopilot"},
        "element": {"key": "checkout.continue", "type": "button", "intent": "progress", "default_props": {"text": "Continue", "size": "md", "variant": "primary"}},
        "context": {"page_type": "checkout", "sensitive": False},
    },
    {
        "id": "arabic",
        "name": "Arabic-preferred user",
        "expected": "Arabic label applied",
        "profile": {"traits": {"prefers_arabic": True, "locale": "ar"}, "scores": {}, "counters": {}, "preferences": {}},
        "policy": {**default_policy(), "mode": "autopilot"},
        "element": {"key": "checkout.continue", "type": "button", "intent": "progress", "default_props": {"text": "Continue", "size": "md", "variant": "primary"}},
        "context": {"page_type": "checkout", "sensitive": False},
    },
    {
        "id": "sensitive",
        "name": "Sensitive checkout",
        "expected": "sensitive context blocks risky changes",
        "profile": {"traits": {"prefers_simple_copy": True}, "scores": {"hesitation_score": 0.7}, "counters": {"hesitations": 3}, "preferences": {}},
        "policy": {**default_policy(), "mode": "autopilot"},
        "element": {"key": "checkout.continue", "type": "button", "intent": "progress", "default_props": {"text": "Continue", "size": "md", "variant": "primary"}},
        "context": {"page_type": "checkout", "sensitive": True},
    },
]
