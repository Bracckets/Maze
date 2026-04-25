from __future__ import annotations

from typing import Any

from pydantic import ValidationError

from app.tactus.agents.llm import LLMClient, build_llm_client
from app.tactus.agents.privacy import compact_llm_payload, sanitize_adaptations
from app.tactus.agents.schemas import AgentContext, AgentResult, CompactLLMPayload, ModelProposal
from app.tactus.propose.rules import Proposal


class TactusAgentService:
    def __init__(self, llm_client: LLMClient | None = None) -> None:
        self.llm_client = llm_client or build_llm_client()

    async def propose(
        self,
        profile: dict[str, Any],
        element: dict[str, Any],
        allow: dict[str, Any],
        constraints: dict[str, Any],
        context: dict[str, Any],
        deterministic_proposal: Proposal | None,
    ) -> AgentResult:
        signals = classify_signals(profile, context)
        agent_context = AgentContext(
            profile=profile,
            element=element,
            allow=allow,
            constraints=constraints,
            context=context,
            signals=signals,
        )
        if deterministic_proposal and deterministic_proposal.confidence >= 0.55:
            return AgentResult(proposal=deterministic_proposal, signals=signals, used_llm=False, reason="deterministic")

        payload = CompactLLMPayload.model_validate(
            compact_llm_payload(
                agent_context.profile,
                agent_context.element,
                agent_context.allow,
                agent_context.constraints,
                agent_context.context,
                agent_context.signals,
            )
        )
        model_response = await self.llm_client.complete_json(payload.model_dump())
        proposal = proposal_from_model_response(model_response, set(payload.allowed_fields))
        if proposal is None:
            return AgentResult(proposal=deterministic_proposal, signals=signals, used_llm=False, reason="fallback_to_deterministic")
        return AgentResult(proposal=proposal, signals=signals, used_llm=True, reason="llm_specialist")


def classify_signals(profile: dict[str, Any], context: dict[str, Any]) -> list[str]:
    traits = profile.get("traits", {}) if isinstance(profile, dict) else {}
    scores = profile.get("scores", {}) if isinstance(profile, dict) else {}
    signals: list[str] = []
    if traits.get("needs_larger_targets") or float(scores.get("misclick_score", 0) or 0) >= 0.5:
        signals.append("missed_tap")
    if traits.get("prefers_more_guidance") or float(scores.get("hesitation_score", 0) or 0) >= 0.5:
        signals.append("hesitation")
    if traits.get("high_friction") or float(scores.get("frustration_score", 0) or 0) >= 0.5:
        signals.append("high_friction")
    if traits.get("needs_inline_help") or float(scores.get("guidance_need", 0) or 0) >= 0.5:
        signals.append("form_friction")
    if traits.get("prefers_arabic") or str(context.get("locale", "")).lower().startswith("ar"):
        signals.append("locale_ar")
    if context.get("sensitive") is True:
        signals.append("sensitive_context")
    return signals


def proposal_from_model_response(response: dict[str, Any] | None, allowed_fields: set[str]) -> Proposal | None:
    if not response:
        return None
    try:
        parsed = ModelProposal.model_validate(response)
    except ValidationError:
        return None
    adaptations = sanitize_adaptations(parsed.adaptations, allowed_fields)
    if not adaptations:
        return None
    return Proposal(
        adaptations=adaptations,
        confidence=parsed.confidence,
        reason=parsed.reason[:180],
        source="llm",
    )
