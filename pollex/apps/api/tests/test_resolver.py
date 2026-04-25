from __future__ import annotations

import pytest

from app.sdk.schemas import BatchResolveRequest, ResolveElement, ResolveRequest
from app.tactus.resolve.orchestrator import ResolveContext, Resolver


class FakeDb:
    def __init__(self, profile=None, policy=None, design_system=None, fail: bool = False) -> None:
        self.profile = profile
        self.policy = policy or {
            "mode": "autopilot",
            "allowed_adaptations": {"text": True, "size": True, "tooltip": True},
            "blocked_adaptations": {},
            "risk_policy": {},
            "sensitive_context_rules": {},
        }
        self.design_system = design_system or {"tokens": {"sizes": ["sm", "md", "lg"], "variants": ["primary"]}}
        self.fail = fail
        self.profile_loads = 0
        self.decisions = []

    async def get_profile(self, subject_id: str):
        self.profile_loads += 1
        if self.fail:
            raise RuntimeError("db down")
        return self.profile

    async def get_policy(self, element_key: str):
        return self.policy

    async def get_design_system(self):
        return self.design_system

    async def save_decision(self, decision: dict):
        self.decisions.append(decision)


def request(**overrides) -> ResolveRequest:
    base = {
        "subject_id": "user_123",
        "element": {"key": "checkout.continue", "type": "button", "intent": "progress", "default_props": {"text": "Continue"}},
        "allow": {"text": True, "size": True, "tooltip": True, "icon": False, "color": False, "position": False, "layout": False},
        "constraints": {"maxTextLength": 24, "tone": "clear", "emoji": False},
        "context": {"page_type": "checkout", "sensitive": False},
    }
    base.update(overrides)
    return ResolveRequest(**base)


async def resolve_with(profile=None, policy=None, design_system=None, req=None, fail=False):
    db = FakeDb(profile=profile, policy=policy, design_system=design_system, fail=fail)
    decision = await Resolver(db).resolve(req or request(), ResolveContext("w", "p", "development"))
    return decision, db


@pytest.mark.asyncio
async def test_normal_user_gets_fallback() -> None:
    decision, _ = await resolve_with(profile={"traits": {}, "scores": {}, "counters": {}, "preferences": {}})
    assert decision["fallback"] is True
    assert decision["adaptations"] == {}


@pytest.mark.asyncio
async def test_missed_tap_user_gets_size_lg_if_allowed() -> None:
    decision, _ = await resolve_with(profile={"traits": {"needs_larger_targets": True}, "scores": {}, "counters": {}, "preferences": {}})
    assert decision["adaptations"] == {"size": "lg"}
    assert decision["fallback"] is False


@pytest.mark.asyncio
async def test_hesitant_user_gets_simpler_text_if_allowed() -> None:
    decision, _ = await resolve_with(profile={"traits": {"prefers_simple_copy": True}, "scores": {}, "counters": {}, "preferences": {}})
    assert decision["adaptations"] == {"text": "Next step"}


@pytest.mark.asyncio
async def test_arabic_user_gets_known_arabic_label_if_allowed() -> None:
    decision, _ = await resolve_with(profile={"traits": {"prefers_arabic": True}, "scores": {}, "counters": {}, "preferences": {}})
    assert decision["adaptations"] == {"text": "\u0627\u0644\u062a\u0627\u0644\u064a"}


@pytest.mark.asyncio
async def test_sensitive_context_blocks_autopilot() -> None:
    req = request(context={"page_type": "checkout", "sensitive": True})
    decision, _ = await resolve_with(profile={"traits": {"prefers_simple_copy": True}, "scores": {}, "counters": {}, "preferences": {}}, req=req)
    assert decision["fallback"] is True


@pytest.mark.asyncio
async def test_blocked_proposals_become_fallback() -> None:
    policy = {"mode": "autopilot", "allowed_adaptations": {}, "blocked_adaptations": {}, "risk_policy": {}, "sensitive_context_rules": {}}
    decision, _ = await resolve_with(profile={"traits": {"needs_larger_targets": True}, "scores": {}, "counters": {}, "preferences": {}}, policy=policy)
    assert decision["fallback"] is True


@pytest.mark.asyncio
async def test_resolver_returns_fallback_on_exception() -> None:
    decision, _ = await resolve_with(req=request(), fail=True)
    assert decision["fallback"] is True
    assert decision["policy_passed"] is True


@pytest.mark.asyncio
async def test_no_profile_returns_fallback() -> None:
    decision, _ = await resolve_with(profile=None)
    assert decision["fallback"] is True


@pytest.mark.asyncio
async def test_batch_resolve_loads_profile_once() -> None:
    batch = BatchResolveRequest(
        subject_id="user_123",
        elements=[
            ResolveElement(key="checkout.continue", type="button", intent="progress"),
            ResolveElement(key="checkout.submit", type="button", intent="submit"),
        ],
        allow={"size": True},
    )
    db = FakeDb(profile={"traits": {"needs_larger_targets": True}, "scores": {}, "counters": {}, "preferences": {}})
    result = await Resolver(db).resolve_batch(batch, ResolveContext("w", "p", "development"))
    assert len(result["decisions"]) == 2
    assert db.profile_loads == 1


@pytest.mark.asyncio
async def test_runtime_traits_can_drive_resolve_without_persisted_trait() -> None:
    req = request(traits={"prefers_simple_copy": True})
    decision, _ = await resolve_with(profile={"traits": {}, "scores": {}, "counters": {}, "preferences": {}}, req=req)
    assert decision["adaptations"] == {"text": "Next step"}


@pytest.mark.asyncio
async def test_resolver_can_use_agent_specialist_when_deterministic_has_no_proposal() -> None:
    from app.tactus.agents.service import TactusAgentService

    class FakeLLM:
        async def complete_json(self, payload: dict):
            return {"adaptations": {"tooltip": "You can review first."}, "confidence": 0.7, "reason": "Add reassurance."}

    db = FakeDb(profile={"traits": {}, "scores": {}, "counters": {}, "preferences": {}})
    req = request(allow={"tooltip": True}, context={"screen": "checkout"})
    decision = await Resolver(db, agent_service=TactusAgentService(FakeLLM())).resolve(req, ResolveContext("w", "p", "development"))
    assert decision["adaptations"] == {"tooltip": "You can review first."}
    assert decision["fallback"] is False
