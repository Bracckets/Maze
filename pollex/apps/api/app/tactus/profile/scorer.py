from __future__ import annotations

from typing import Any


def scores_from_counters(counters: dict[str, Any]) -> dict[str, float]:
    return {
        "misclick_score": min(1.0, int(counters.get("missed_taps", 0)) * 0.15),
        "hesitation_score": min(
            1.0,
            int(counters.get("hesitations", 0)) * 0.12 + int(counters.get("backtracks", 0)) * 0.08,
        ),
        "frustration_score": min(
            1.0,
            max(0.0, int(counters.get("rage_taps", 0)) * 0.2 - int(counters.get("conversions", 0)) * 0.1),
        ),
        "guidance_need": min(1.0, int(counters.get("form_errors", 0)) * 0.15),
    }


def traits_from_counters(counters: dict[str, Any], existing: dict[str, Any] | None = None) -> dict[str, Any]:
    traits = dict(existing or {})
    if int(counters.get("missed_taps", 0)) >= 2:
        traits["needs_larger_targets"] = True
    if int(counters.get("hesitations", 0)) >= 2:
        traits["prefers_more_guidance"] = True
    if int(counters.get("hesitations", 0)) >= 3:
        traits["prefers_simple_copy"] = True
    if int(counters.get("rage_taps", 0)) >= 2:
        traits["high_friction"] = True
    if int(counters.get("form_errors", 0)) >= 2:
        traits["needs_inline_help"] = True
    return traits
