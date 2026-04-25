from __future__ import annotations

from copy import deepcopy
from typing import Any


COUNTER_BY_EVENT = {
    "missed_tap": "missed_taps",
    "hesitation": "hesitations",
    "rage_tap": "rage_taps",
    "form_error": "form_errors",
    "backtrack": "backtracks",
    "conversion": "conversions",
    "element_seen": "element_seen",
    "click": "clicks",
    "dismiss": "dismisses",
}


def _cap(value: float) -> float:
    return min(1.0, max(0.0, round(value, 10)))


def _ensure(profile: dict[str, Any]) -> dict[str, Any]:
    profile = deepcopy(profile)
    profile.setdefault("traits", {})
    profile.setdefault("scores", {})
    profile.setdefault("counters", {})
    profile.setdefault("preferences", {})
    return profile


def apply_locale_traits(traits: dict[str, Any]) -> dict[str, Any]:
    updated = dict(traits)
    locale = str(updated.get("locale", ""))
    if locale.lower().startswith("ar"):
        updated["prefers_arabic"] = True
    return updated


def update_profile(profile: dict[str, Any], events: list[Any]) -> dict[str, Any]:
    updated = _ensure(profile)
    traits = updated["traits"]
    scores = updated["scores"]
    counters = updated["counters"]

    for event in events:
        event_type = getattr(event, "event_type", None) or event.get("event_type")
        event_type = str(event_type).lower()
        counter = COUNTER_BY_EVENT.get(event_type)
        if counter is None:
            continue

        counters[counter] = int(counters.get(counter, 0)) + 1

        if event_type == "missed_tap":
            scores["misclick_score"] = _cap(float(scores.get("misclick_score", 0)) + 0.15)
            if counters["missed_taps"] >= 2:
                traits["needs_larger_targets"] = True
        elif event_type == "hesitation":
            scores["hesitation_score"] = _cap(float(scores.get("hesitation_score", 0)) + 0.12)
            if counters["hesitations"] >= 2:
                traits["prefers_more_guidance"] = True
            if counters["hesitations"] >= 3:
                traits["prefers_simple_copy"] = True
        elif event_type == "rage_tap":
            scores["frustration_score"] = _cap(float(scores.get("frustration_score", 0)) + 0.2)
            if counters["rage_taps"] >= 2:
                traits["high_friction"] = True
        elif event_type == "form_error":
            scores["guidance_need"] = _cap(float(scores.get("guidance_need", 0)) + 0.15)
            if counters["form_errors"] >= 2:
                traits["needs_inline_help"] = True
        elif event_type == "backtrack":
            scores["hesitation_score"] = _cap(float(scores.get("hesitation_score", 0)) + 0.08)
        elif event_type == "conversion":
            scores["frustration_score"] = _cap(float(scores.get("frustration_score", 0)) - 0.1)

    return updated


def decay_scores(profile: dict[str, Any], days_inactive: int) -> dict[str, Any]:
    return deepcopy(profile)
