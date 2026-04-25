from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class Proposal:
    adaptations: dict[str, Any]
    confidence: float
    reason: str
    source: str = "deterministic"


SAFE_LABELS = {
    "progress": ["Next step", "Continue", "Proceed"],
    "submit": ["Send", "Submit", "Done"],
    "confirm": ["Confirm", "Got it", "OK"],
    "cancel": ["Go back", "Cancel"],
}

SAFE_TOOLTIPS = {
    "progress": "You can review your order before we charge you.",
    "submit": "Your information is encrypted and secure.",
}

SAFE_HELPER_TEXT = {
    ("input", "submit"): "Check the required fields before continuing.",
    ("button", "progress"): "Continue when the information looks right.",
}

SAFE_ARABIC_LABELS = {
    "progress": "\u0627\u0644\u062a\u0627\u0644\u064a",
    "submit": "\u0625\u0631\u0633\u0627\u0644",
    "confirm": "\u062a\u0623\u0643\u064a\u062f",
}


def _allowed(allow: dict[str, Any], field: str) -> bool:
    return bool(allow.get(field))


def build_candidates(
    profile: dict[str, Any],
    element: dict[str, Any],
    allow: dict[str, Any],
    constraints: dict[str, Any],
    context: dict[str, Any],
) -> list[Proposal]:
    traits = profile.get("traits", {})
    intent = element.get("intent") or "progress"
    element_type = element.get("type") or "button"
    candidates: list[Proposal] = []

    if traits.get("needs_larger_targets") and _allowed(allow, "size"):
        candidates.append(Proposal({"size": "lg"}, 0.8, "User missed tap target multiple times."))

    if traits.get("prefers_simple_copy") and _allowed(allow, "text"):
        label = SAFE_LABELS.get(intent, [None])[0]
        if label:
            candidates.append(Proposal({"text": label}, 0.7, "User hesitated on this UI control."))

    if traits.get("prefers_more_guidance") and _allowed(allow, "tooltip"):
        tooltip = SAFE_TOOLTIPS.get(intent)
        if tooltip:
            candidates.append(Proposal({"tooltip": tooltip}, 0.65, "User may benefit from more guidance."))

    if traits.get("needs_inline_help") and _allowed(allow, "helper_text"):
        helper_text = SAFE_HELPER_TEXT.get((element_type, intent)) or SAFE_HELPER_TEXT.get((element_type, "submit"))
        if helper_text:
            candidates.append(Proposal({"helper_text": helper_text}, 0.6, "User hit repeated form errors."))

    if traits.get("prefers_arabic") and _allowed(allow, "text"):
        label = SAFE_ARABIC_LABELS.get(intent)
        if label:
            candidates.append(Proposal({"text": label}, 0.75, "User locale indicates Arabic copy is preferred."))

    if traits.get("high_friction") and _allowed(allow, "tooltip"):
        candidates.append(Proposal({"tooltip": "You can safely continue when you are ready."}, 0.6, "User showed high friction."))

    return candidates
