from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from app.tactus.agents.llm import LLMClient, build_llm_client
from app.tactus.agents.privacy import compact_llm_payload, sanitize_adaptations
from app.tactus.propose.rules import Proposal


@dataclass(frozen=True)
class AgentResult:
    proposal: Proposal | None
    signals: list[str]
    used_llm: bool
    reason: str


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
        if deterministic_proposal and deterministic_proposal.confidence >= 0.55:
            return AgentResult(deterministic_proposal, signals, False, "deterministic")

        payload = compact_llm_payload(profile, element, allow, constraints, context, signals)
        model_response = await self.llm_client.complete_json(payload)
        proposal = proposal_from_model_response(model_response, set(payload["allowed_fields"]))
        if proposal is None:
            return AgentResult(deterministic_proposal, signals, False, "fallback_to_deterministic")
        return AgentResult(proposal, signals, True, "llm_specialist")


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
    adaptations = sanitize_adaptations(response.get("adaptations"), allowed_fields)
    if not adaptations:
        return None
    confidence = response.get("confidence", 0.5)
    try:
        confidence_value = min(0.85, max(0.0, float(confidence)))
    except (TypeError, ValueError):
        confidence_value = 0.5
    reason = response.get("reason")
    return Proposal(
        adaptations=adaptations,
        confidence=confidence_value,
        reason=str(reason)[:180] if reason else "LLM specialist proposed a safe adaptation.",
        source="llm",
    )
