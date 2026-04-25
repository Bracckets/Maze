from __future__ import annotations

import json
import logging
from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from fastapi import APIRouter, Depends, HTTPException

from app.core.database import InteractionEvent, UiElement, UxProfile, get_session, utcnow
from app.core.dependencies import ApiKeyContext, require_api_key
from app.core.rate_limit import sdk_rate_limiter
from app.sdk.schemas import (
    BatchResolveRequest,
    EventsRequest,
    EventsResponse,
    IdentifyRequest,
    ProfileSummary,
    ResolveDecision,
    ResolveRequest,
)
from app.tactus.observe.normalizer import normalize_event
from app.tactus.observe.normalizer import ELEMENT_KEY_RE
from app.tactus.observe.privacy import sanitize_event
from app.tactus.profile.builder import apply_locale_traits, update_profile
from app.tactus.profile.merger import merge_profiles
from app.tactus.resolve.orchestrator import ResolveContext, Resolver


router = APIRouter(prefix="/sdk", tags=["sdk"])
logger = logging.getLogger(__name__)

MAX_EVENTS_PER_REQUEST = 50
MAX_EVENT_PAYLOAD_BYTES = 4 * 1024


@router.post("/identify", response_model=ProfileSummary)
async def identify(
    request: IdentifyRequest,
    api_context: ApiKeyContext = Depends(require_api_key),
    session: AsyncSession = Depends(get_session),
) -> ProfileSummary:
    await sdk_rate_limiter.check(f"identify:{api_context.api_key_id}", 60)
    subject_key = request.subject_id or f"anon:{request.anonymous_id}"
    subject_profile = await _get_profile(session, api_context, subject_key)
    if subject_profile is None:
        subject_profile = UxProfile(
            workspace_id=api_context.workspace_id,
            project_id=api_context.project_id,
            environment=api_context.environment,
            subject_id=subject_key,
            anonymous_id=request.anonymous_id,
            traits={},
            scores={},
            counters={},
            preferences={},
        )
        session.add(subject_profile)

    subject_profile.traits = apply_locale_traits({**(subject_profile.traits or {}), **request.traits})
    subject_profile.anonymous_id = request.anonymous_id or subject_profile.anonymous_id
    subject_profile.last_seen_at = utcnow()

    if request.subject_id and request.anonymous_id:
        anonymous_profile = await _get_profile(session, api_context, f"anon:{request.anonymous_id}")
        if anonymous_profile is not None and anonymous_profile.id != subject_profile.id:
            merged = merge_profiles(_row_to_profile(anonymous_profile), _row_to_profile(subject_profile))
            subject_profile.traits = apply_locale_traits(merged["traits"])
            subject_profile.scores = merged["scores"]
            subject_profile.counters = merged["counters"]
            subject_profile.preferences = merged["preferences"]
            anonymous_traits = dict(anonymous_profile.traits or {})
            anonymous_traits["merged_into"] = request.subject_id
            anonymous_profile.traits = anonymous_traits

    await session.commit()
    await session.refresh(subject_profile)
    return _summary(subject_profile)


@router.post("/events", response_model=EventsResponse)
async def events(
    request: EventsRequest,
    api_context: ApiKeyContext = Depends(require_api_key),
    session: AsyncSession = Depends(get_session),
) -> EventsResponse:
    await sdk_rate_limiter.check(f"events:{api_context.api_key_id}", 200)
    if len(request.events) > MAX_EVENTS_PER_REQUEST:
        raise HTTPException(status_code=400, detail="events may contain at most 50 items")

    subject_key = await _resolve_subject_key(session, api_context, request.subject_id, request.anonymous_id)
    profile = await _get_profile(session, api_context, subject_key)
    if profile is None:
        profile = UxProfile(
            workspace_id=api_context.workspace_id,
            project_id=api_context.project_id,
            environment=api_context.environment,
            subject_id=subject_key,
            anonymous_id=request.anonymous_id,
            traits={},
            scores={},
            counters={},
            preferences={},
        )
        session.add(profile)

    normalized_events = []
    for raw_event in request.events:
        if not _valid_element_key(raw_event.element_key):
            logger.info("Skipping SDK event with invalid element_key")
            continue
        clean = sanitize_event(raw_event)
        clean = _strip_oversized_payload(clean)
        try:
            normalized = normalize_event(clean)
        except ValueError:
            logger.info("Skipping SDK event that failed normalization")
            continue
        if not _valid_occurred_at(normalized.occurred_at):
            logger.info("Skipping SDK event outside accepted occurred_at drift")
            continue
        normalized_events.append(normalized)
        session.add(
            InteractionEvent(
                workspace_id=api_context.workspace_id,
                project_id=api_context.project_id,
                environment=api_context.environment,
                subject_id=subject_key if not subject_key.startswith("anon:") else None,
                anonymous_id=request.anonymous_id,
                session_id=request.session_id,
                element_key=normalized.element_key,
                event_type=normalized.event_type,
                event_value=normalized.event_value,
                context=normalized.context,
                occurred_at=normalized.occurred_at,
                received_at=normalized.received_at,
            )
        )
        await _upsert_ui_element(session, api_context, normalized.element_key)

    updated = update_profile(_row_to_profile(profile), normalized_events)
    profile.traits = updated["traits"]
    profile.scores = updated["scores"]
    profile.counters = updated["counters"]
    profile.preferences = updated["preferences"]
    profile.last_seen_at = utcnow()
    await session.commit()
    return EventsResponse(accepted=len(normalized_events))


@router.post("/resolve", response_model=ResolveDecision)
async def resolve(
    request: ResolveRequest,
    api_context: ApiKeyContext = Depends(require_api_key),
    session: AsyncSession = Depends(get_session),
) -> dict:
    await sdk_rate_limiter.check(f"resolve:{api_context.api_key_id}", 100)
    resolver = Resolver(session)
    return await resolver.resolve(
        request,
        ResolveContext(api_context.workspace_id, api_context.project_id, api_context.environment),
    )


@router.post("/resolve/batch")
async def resolve_batch(
    request: BatchResolveRequest,
    api_context: ApiKeyContext = Depends(require_api_key),
    session: AsyncSession = Depends(get_session),
) -> dict:
    await sdk_rate_limiter.check(f"resolve_batch:{api_context.api_key_id}", 50)
    resolver = Resolver(session)
    return await resolver.resolve_batch(
        request,
        ResolveContext(api_context.workspace_id, api_context.project_id, api_context.environment),
    )


async def _get_profile(session: AsyncSession, context: ApiKeyContext, subject_id: str) -> UxProfile | None:
    result = await session.execute(
        select(UxProfile).where(
            UxProfile.workspace_id == context.workspace_id,
            UxProfile.project_id == context.project_id,
            UxProfile.environment == context.environment,
            UxProfile.subject_id == subject_id,
        )
    )
    return result.scalar_one_or_none()


async def _resolve_subject_key(
    session: AsyncSession,
    context: ApiKeyContext,
    subject_id: str | None,
    anonymous_id: str | None,
) -> str:
    if subject_id:
        return subject_id
    anonymous_key = f"anon:{anonymous_id}"
    anonymous_profile = await _get_profile(session, context, anonymous_key)
    if anonymous_profile and (anonymous_profile.traits or {}).get("merged_into"):
        return anonymous_profile.traits["merged_into"]
    return anonymous_key


async def _upsert_ui_element(session: AsyncSession, context: ApiKeyContext, element_key: str) -> None:
    result = await session.execute(
        select(UiElement).where(
            UiElement.workspace_id == context.workspace_id,
            UiElement.project_id == context.project_id,
            UiElement.environment == context.environment,
            UiElement.element_key == element_key,
        )
    )
    row = result.scalar_one_or_none()
    if row is None:
        session.add(
            UiElement(
                workspace_id=context.workspace_id,
                project_id=context.project_id,
                environment=context.environment,
                element_key=element_key,
                element_type="unknown",
                default_props={},
                metadata_={},
            )
        )
    else:
        row.last_seen_at = utcnow()


def _row_to_profile(row: UxProfile) -> dict:
    return {
        "subject_id": row.subject_id,
        "anonymous_id": row.anonymous_id,
        "traits": row.traits or {},
        "scores": row.scores or {},
        "counters": row.counters or {},
        "preferences": row.preferences or {},
    }


def _summary(row: UxProfile) -> ProfileSummary:
    return ProfileSummary(**_row_to_profile(row))


def _valid_element_key(element_key: str) -> bool:
    return bool(ELEMENT_KEY_RE.match(element_key))


def _strip_oversized_payload(event: dict) -> dict:
    payload = {"event_value": event.get("event_value") or {}, "context": event.get("context") or {}}
    size = len(json.dumps(payload, ensure_ascii=False, default=str).encode("utf-8"))
    if size <= MAX_EVENT_PAYLOAD_BYTES:
        return event
    clean = dict(event)
    clean["event_value"] = {}
    clean["context"] = {}
    return clean


def _valid_occurred_at(occurred_at) -> bool:
    now = utcnow()
    return now - timedelta(hours=24) <= occurred_at <= now + timedelta(seconds=30)
