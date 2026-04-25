from __future__ import annotations

import pytest

from app.tactus.agents.privacy import compact_llm_payload, sanitize_adaptations
from app.tactus.agents.service import TactusAgentService


class FakeLLM:
    def __init__(self, response=None) -> None:
        self.response = response
        self.payloads = []

    async def complete_json(self, payload: dict):
        self.payloads.append(payload)
        return self.response


@pytest.mark.asyncio
async def test_agent_service_does_not_call_llm_when_deterministic_is_confident() -> None:
    from app.tactus.propose.rules import Proposal

    llm = FakeLLM({"adaptations": {"text": "Ignored"}, "confidence": 0.8})
    service = TactusAgentService(llm)
    deterministic = Proposal({"size": "lg"}, 0.8, "User missed tap target.")

    result = await service.propose(
        {"traits": {"needs_larger_targets": True}, "scores": {}},
        {"type": "button", "intent": "progress", "default_props": {"text": "Continue"}},
        {"text": True, "size": True},
        {"maxTextLength": 24},
        {"screen": "checkout"},
        deterministic,
    )

    assert result.proposal is deterministic
    assert result.used_llm is False
    assert llm.payloads == []


@pytest.mark.asyncio
async def test_agent_service_uses_sanitized_llm_payload_when_needed() -> None:
    llm = FakeLLM({"adaptations": {"tooltip": "You can review first.", "layout": "two-column"}, "confidence": 0.9, "reason": "Add reassurance."})
    service = TactusAgentService(llm)

    result = await service.propose(
        {"subject_id": "user_123", "traits": {"prefers_more_guidance": True, "email": "a@example.com"}, "scores": {"hesitation_score": 0.7}},
        {"key": "checkout.continue", "type": "button", "intent": "progress", "default_props": {"text": "Continue"}},
        {"tooltip": True, "layout": True},
        {"maxTextLength": 24, "tone": "clear"},
        {"screen": "checkout", "password": "secret", "sensitive": False},
        None,
    )

    assert result.proposal is not None
    assert result.proposal.adaptations == {"tooltip": "You can review first."}
    assert result.proposal.source == "llm"
    assert "subject_id" not in str(llm.payloads[0])
    assert "password" not in str(llm.payloads[0])
    assert "a@example.com" not in str(llm.payloads[0])


def test_compact_payload_only_includes_safe_context_and_traits() -> None:
    payload = compact_llm_payload(
        {"traits": {"prefers_arabic": True, "api_token": True}, "scores": {"guidance_need": 0.72}},
        {"type": "button", "intent": "submit", "default_props": {"text": "Send"}},
        {"text": True, "color": True},
        {"maxTextLength": 24, "raw": "ignored"},
        {"locale": "ar", "card_number": "4111", "sensitive": True},
        ["locale_ar"],
    )

    assert payload["allowed_fields"] == ["text"]
    assert payload["context"] == {"locale": "ar", "sensitive": True}
    assert payload["traits"] == {"prefers_arabic": True}
    assert payload["scores"] == {"guidance_need": 0.72}


def test_sanitize_adaptations_blocks_unsupported_fields_and_sensitive_text() -> None:
    assert sanitize_adaptations(
        {"text": "Use password 123", "tooltip": "Safe help", "layout": "wide"},
        {"text", "tooltip", "layout"},
    ) == {"tooltip": "Safe help"}


@pytest.mark.asyncio
async def test_agent_service_falls_back_on_malformed_llm_output() -> None:
    from app.tactus.propose.rules import Proposal

    deterministic = Proposal({"tooltip": "Safe help"}, 0.2, "Low confidence deterministic hint.")
    service = TactusAgentService(FakeLLM({"adaptations": "not-an-object", "confidence": "bad"}))

    result = await service.propose(
        {"traits": {"prefers_more_guidance": True}, "scores": {"hesitation_score": 0.7}},
        {"key": "checkout.continue", "type": "button", "intent": "progress", "default_props": {"text": "Continue"}},
        {"tooltip": True},
        {"maxTextLength": 24},
        {"screen": "checkout"},
        deterministic,
    )

    assert result.proposal is deterministic
    assert result.reason == "fallback_to_deterministic"
    assert result.used_llm is False
