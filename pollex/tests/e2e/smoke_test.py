from __future__ import annotations

import sys
from pathlib import Path

from fastapi.testclient import TestClient


API_ROOT = Path(__file__).resolve().parents[2] / "apps" / "api"
sys.path.insert(0, str(API_ROOT))

from app.main import app  # noqa: E402
from app.tactus.policy.validator import PolicyValidator  # noqa: E402
from app.tactus.propose.rules import Proposal  # noqa: E402


def auth_headers(client: TestClient) -> dict[str, str]:
    response = client.post("/studio/auth/login", json={"email": "smoke@pollex.dev", "password": "pollex123"})
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['token']}"}


def test_phase4_tactus_smoke_sequence() -> None:
    client = TestClient(app)
    headers = auth_headers(client)

    hesitant = {
        "subject_id": "hesitant_user",
        "element": {
            "key": "checkout.continue",
            "type": "button",
            "intent": "progress",
            "default_props": {"text": "Continue", "size": "md", "variant": "primary"},
        },
        "allow": {"text": True, "size": True, "tooltip": True},
        "constraints": {"maxTextLength": 24, "emoji": False},
        "context": {"page_type": "checkout", "sensitive": False},
        "profile": {
            "traits": {"prefers_simple_copy": True, "prefers_more_guidance": True},
            "scores": {"hesitation_score": 0.7},
            "counters": {"hesitations": 3},
            "preferences": {},
        },
        "policy": {
            "mode": "autopilot",
            "allowed_adaptations": {"text": True, "size": True, "tooltip": True},
            "blocked_adaptations": {},
            "risk_policy": {},
            "sensitive_context_rules": {},
        },
        "design_system": {"tokens": {"sizes": ["sm", "md", "lg"], "variants": ["primary"]}},
    }
    hesitant_response = client.post("/studio/playground/resolve", headers=headers, json=hesitant)
    assert hesitant_response.status_code == 200
    hesitant_decision = hesitant_response.json()["final_decision"]
    assert hesitant_decision["adaptations"]["text"] != ""
    assert hesitant_decision["adaptations"]["text"] != "Continue"
    assert hesitant_decision["fallback"] is False
    assert hesitant_decision["policy_passed"] is True

    arabic = {
        **hesitant,
        "subject_id": "arabic_user",
        "profile": {"traits": {"prefers_arabic": True, "locale": "ar"}, "scores": {}, "counters": {}, "preferences": {}},
    }
    arabic_response = client.post("/studio/playground/resolve", headers=headers, json=arabic)
    assert arabic_response.status_code == 200
    arabic_text = arabic_response.json()["final_decision"]["adaptations"]["text"]
    assert any("\u0600" <= char <= "\u06ff" for char in arabic_text)

    result = PolicyValidator().validate(
        Proposal({"color": "red"}, 0.9, "high risk probe"),
        {
            "mode": "autopilot",
            "allowed_adaptations": {"color": True},
            "blocked_adaptations": {},
            "risk_policy": {},
            "sensitive_context_rules": {},
        },
        {"tokens": {"sizes": ["sm", "md", "lg"]}},
        {"sensitive": True},
        {},
    )
    assert result.filtered_adaptations == {}
    assert result.blocked
