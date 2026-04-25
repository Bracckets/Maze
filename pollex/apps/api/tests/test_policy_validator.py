from __future__ import annotations

from app.tactus.policy.validator import PolicyValidator
from app.tactus.propose.rules import Proposal


validator = PolicyValidator()
design_system = {"tokens": {"sizes": ["sm", "md", "lg"], "variants": ["primary"]}}


def policy(**overrides: dict) -> dict:
    base = {
        "mode": "autopilot",
        "allowed_adaptations": {"text": True, "size": True, "tooltip": True},
        "blocked_adaptations": {},
        "risk_policy": {},
        "sensitive_context_rules": {},
    }
    base.update(overrides)
    return base


def validate(adaptations: dict, policy_data: dict | None = None, constraints: dict | None = None, context: dict | None = None):
    return validator.validate(
        Proposal(adaptations, 0.8, "test"),
        policy_data or policy(),
        design_system,
        context or {},
        constraints or {},
    )


def test_observe_mode_blocks_all_adaptations() -> None:
    result = validate({"text": "Next"}, policy(mode="observe"))
    assert result.filtered_adaptations == {}
    assert result.allowed is True


def test_suggest_mode_allows_proposal_storage_but_not_auto_apply() -> None:
    result = validate({"text": "Next"}, policy(mode="suggest"))
    assert result.allowed is True
    assert result.filtered_adaptations == {"text": "Next"}


def test_color_blocked_by_default() -> None:
    result = validate({"color": "red"}, policy(allowed_adaptations={"color": True}))
    assert result.filtered_adaptations == {}


def test_position_blocked_by_default() -> None:
    result = validate({"position": "top"}, policy(allowed_adaptations={"position": True}, risk_policy={"allow_high_risk": True}))
    assert result.filtered_adaptations == {}


def test_layout_blocked_by_default() -> None:
    result = validate({"layout": "wide"}, policy(allowed_adaptations={"layout": True}, risk_policy={"allow_high_risk": True}))
    assert result.filtered_adaptations == {}


def test_raw_css_blocked() -> None:
    result = validate({"text": "color: red;"})
    assert result.filtered_adaptations == {}


def test_raw_html_blocked() -> None:
    result = validate({"text": "<b>Next</b>"})
    assert result.filtered_adaptations == {}


def test_unapproved_size_token_blocked() -> None:
    result = validate({"size": "xl"})
    assert result.filtered_adaptations == {}


def test_approved_size_token_allowed() -> None:
    result = validate({"size": "lg"})
    assert result.filtered_adaptations == {"size": "lg"}


def test_max_text_length_respected() -> None:
    result = validate({"text": "A very long sentence"}, constraints={"maxTextLength": 5})
    assert result.filtered_adaptations == {}


def test_emoji_blocked_when_disabled() -> None:
    result = validate({"text": "Next \U0001F44D"}, constraints={"emoji": False})
    assert result.filtered_adaptations == {}


def test_sensitive_context_blocks_autopilot_medium_risk() -> None:
    result = validate(
        {"density": "compact"},
        policy(allowed_adaptations={"density": True}, risk_policy={"allow_medium_risk": True}),
        context={"sensitive": True},
    )
    assert result.filtered_adaptations == {}


def test_autopilot_allows_low_risk_adaptations() -> None:
    result = validate({"text": "Next"})
    assert result.filtered_adaptations == {"text": "Next"}


def test_high_risk_blocked_unless_explicit_policy() -> None:
    result = validate({"navigation": "next"}, policy(allowed_adaptations={"navigation": True}))
    assert result.filtered_adaptations == {}
    allowed = validate({"navigation": "next"}, policy(allowed_adaptations={"navigation": True}, risk_policy={"allow_high_risk": True}))
    assert allowed.filtered_adaptations == {"navigation": "next"}


def test_blocked_adaptations_list_respected() -> None:
    result = validate({"text": "Next"}, policy(blocked_adaptations={"text": True}))
    assert result.filtered_adaptations == {}


def test_allowed_adaptations_list_respected() -> None:
    result = validate({"tooltip": "Help"}, policy(allowed_adaptations={"text": True}))
    assert result.filtered_adaptations == {}
