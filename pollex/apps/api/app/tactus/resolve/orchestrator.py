from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any

from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AdaptationDecision as AdaptationDecisionRow
from app.core.database import AdaptationPolicy, DesignSystem, UxProfile
from app.tactus.agents.service import TactusAgentService
from app.tactus.cache.interface import CacheInterface, InMemoryCache
from app.tactus.policy.validator import PolicyValidator
from app.tactus.propose.engine import ProposalEngine

logger = logging.getLogger(__name__)


@dataclass
class ResolveContext:
    workspace_id: str
    project_id: str
    environment: str


def fallback_decision(element_key: str, mode: str = "observe", reason: str = "Fallback rendered.") -> dict[str, Any]:
    return {
        "element_key": element_key,
        "adaptations": {},
        "confidence": 0,
        "reason": reason,
        "policy_passed": True,
        "fallback": True,
        "mode": mode,
    }


class Resolver:
    def __init__(
        self,
        db: Any,
        cache: CacheInterface | None = None,
        proposal_engine: ProposalEngine | None = None,
        policy_validator: PolicyValidator | None = None,
        agent_service: TactusAgentService | None = None,
    ) -> None:
        self.db = db
        self.cache = cache or InMemoryCache()
        self.proposal_engine = proposal_engine or ProposalEngine()
        self.policy_validator = policy_validator or PolicyValidator()
        self.agent_service = agent_service or TactusAgentService()

    async def resolve(self, request: Any, context: ResolveContext, profile: dict[str, Any] | None = None) -> dict[str, Any]:
        element = _as_dict(request.element)
        element_key = element["key"]
        try:
            resolved_profile = profile if profile is not None else await self._load_profile(request, context)
            if not resolved_profile:
                return fallback_decision(element_key)

            policy = await self._load_policy(context, element_key)
            design_system = await self._load_design_system(context)
            allow = _as_dict(getattr(request, "allow", {}))
            constraints = _as_dict(getattr(request, "constraints", {}))
            runtime_context = _as_dict(getattr(request, "context", {}))
            if getattr(request, "traits", None):
                resolved_profile = _merge_runtime_traits(resolved_profile, _as_dict(getattr(request, "traits", {})))

            deterministic_proposal = self.proposal_engine.propose(
                resolved_profile,
                element,
                allow,
                constraints,
                runtime_context,
            )
            agent_result = await self.agent_service.propose(
                resolved_profile,
                element,
                allow,
                constraints,
                runtime_context,
                deterministic_proposal,
            )
            proposal = agent_result.proposal
            if proposal is None:
                return fallback_decision(element_key)

            validation = self.policy_validator.validate(
                proposal,
                policy,
                design_system,
                runtime_context,
                constraints,
            )
            mode = _mode(policy)
            fallback = not validation.filtered_adaptations or mode == "suggest"
            decision = {
                "element_key": element_key,
                "adaptations": {} if fallback else validation.filtered_adaptations,
                "confidence": 0 if fallback else proposal.confidence,
                "reason": validation.reason if fallback else proposal.reason,
                "policy_passed": validation.allowed,
                "fallback": fallback,
                "mode": mode,
            }
            await self._save_decision(context, request, element_key, proposal, validation, decision)
            return decision
        except Exception:
            logger.exception("Tactus resolve failed")
            return fallback_decision(element_key)

    async def resolve_batch(self, request: Any, context: ResolveContext) -> dict[str, list[dict[str, Any]]]:
        profile = await self._load_profile(request, context)
        decisions = []
        for element in request.elements:
            item_request = request.to_single(element)
            decisions.append(await self.resolve(item_request, context, profile=profile))
        return {"decisions": decisions}

    async def _load_profile(self, request: Any, context: ResolveContext) -> dict[str, Any] | None:
        subject_id = await self._resolve_subject_key(request, context)
        if not subject_id:
            return None
        cache_key = f"ux_profile:{context.workspace_id}:{context.project_id}:{context.environment}:{subject_id}"
        cached = await self.cache.get(cache_key)
        if cached is not None:
            return cached

        if hasattr(self.db, "get_profile"):
            profile = await self.db.get_profile(subject_id)
        else:
            result = await self.db.execute(
                select(UxProfile).where(
                    UxProfile.workspace_id == context.workspace_id,
                    UxProfile.project_id == context.project_id,
                    UxProfile.environment == context.environment,
                    UxProfile.subject_id == subject_id,
                )
            )
            row = result.scalar_one_or_none()
            profile = _profile_to_dict(row) if row else None
        if profile is not None:
            await self.cache.set(cache_key, profile, ttl=300)
        return profile

    async def _resolve_subject_key(self, request: Any, context: ResolveContext) -> str | None:
        subject_id = getattr(request, "subject_id", None)
        anonymous_id = getattr(request, "anonymous_id", None)
        if subject_id:
            return subject_id
        if not anonymous_id:
            return None
        anonymous_key = f"anon:{anonymous_id}"
        if hasattr(self.db, "get_profile"):
            anon_profile = await self.db.get_profile(anonymous_key)
            merged_into = (anon_profile or {}).get("traits", {}).get("merged_into")
            return merged_into or anonymous_key
        result = await self.db.execute(
            select(UxProfile).where(
                UxProfile.workspace_id == context.workspace_id,
                UxProfile.project_id == context.project_id,
                UxProfile.environment == context.environment,
                UxProfile.subject_id == anonymous_key,
            )
        )
        row = result.scalar_one_or_none()
        return (row.traits or {}).get("merged_into") if row and (row.traits or {}).get("merged_into") else anonymous_key

    async def _load_policy(self, context: ResolveContext, element_key: str) -> Any:
        cache_key = f"policy:{context.workspace_id}:{context.project_id}:{context.environment}:{element_key}"
        cached = await self.cache.get(cache_key)
        if cached is not None:
            return cached
        if hasattr(self.db, "get_policy"):
            policy = await self.db.get_policy(element_key)
        else:
            result = await self.db.execute(
                select(AdaptationPolicy)
                .where(
                    AdaptationPolicy.workspace_id == context.workspace_id,
                    AdaptationPolicy.project_id == context.project_id,
                    AdaptationPolicy.environment == context.environment,
                    or_(AdaptationPolicy.element_key == element_key, AdaptationPolicy.element_key.is_(None)),
                )
                .order_by(AdaptationPolicy.element_key.is_(None))
            )
            policy = result.scalars().first()
        if policy is None:
            policy = {
                "mode": "observe",
                "allowed_adaptations": {},
                "blocked_adaptations": {},
                "risk_policy": {},
                "sensitive_context_rules": {},
            }
        await self.cache.set(cache_key, policy, ttl=600)
        return policy

    async def _load_design_system(self, context: ResolveContext) -> Any:
        cache_key = f"design_system:{context.workspace_id}:{context.project_id}"
        cached = await self.cache.get(cache_key)
        if cached is not None:
            return cached
        if hasattr(self.db, "get_design_system"):
            design_system = await self.db.get_design_system()
        else:
            result = await self.db.execute(
                select(DesignSystem)
                .where(
                    DesignSystem.workspace_id == context.workspace_id,
                    or_(DesignSystem.project_id == context.project_id, DesignSystem.project_id.is_(None)),
                )
                .order_by(DesignSystem.project_id.is_(None))
            )
            design_system = result.scalars().first()
        if design_system is None:
            design_system = {"tokens": {"sizes": ["sm", "md", "lg"], "variants": ["primary", "secondary"]}}
        await self.cache.set(cache_key, design_system, ttl=600)
        return design_system

    async def _save_decision(
        self,
        context: ResolveContext,
        request: Any,
        element_key: str,
        proposal: Any,
        validation: Any,
        decision: dict[str, Any],
    ) -> None:
        if hasattr(self.db, "save_decision"):
            await self.db.save_decision(decision)
            return
        self.db.add(
            AdaptationDecisionRow(
                workspace_id=context.workspace_id,
                project_id=context.project_id,
                environment=context.environment,
                subject_id=getattr(request, "subject_id", None),
                element_key=element_key,
                decision=decision["adaptations"],
                blocked=validation.blocked,
                reason=decision["reason"],
                policy_passed=decision["policy_passed"],
                fallback=decision["fallback"],
                mode=decision["mode"],
            )
        )
        await self.db.commit()


def _as_dict(value: Any) -> dict[str, Any]:
    if value is None:
        return {}
    if isinstance(value, dict):
        return value
    if hasattr(value, "model_dump"):
        return value.model_dump()
    return dict(value)


def _profile_to_dict(row: UxProfile) -> dict[str, Any]:
    return {
        "subject_id": row.subject_id,
        "anonymous_id": row.anonymous_id,
        "traits": row.traits or {},
        "scores": row.scores or {},
        "counters": row.counters or {},
        "preferences": row.preferences or {},
    }


def _merge_runtime_traits(profile: dict[str, Any], runtime_traits: dict[str, Any]) -> dict[str, Any]:
    merged = dict(profile)
    merged["traits"] = {**(profile.get("traits") or {}), **runtime_traits}
    return merged


def _mode(policy: Any) -> str:
    if isinstance(policy, dict):
        return policy.get("mode", "observe")
    return getattr(policy, "mode", "observe")
