from __future__ import annotations

from typing import Any

from app.tactus.profile.scorer import scores_from_counters, traits_from_counters


def merge_profiles(anonymous_profile: dict[str, Any], subject_profile: dict[str, Any]) -> dict[str, Any]:
    anon_counters = anonymous_profile.get("counters", {})
    subject_counters = subject_profile.get("counters", {})
    counters = {
        key: int(anon_counters.get(key, 0)) + int(subject_counters.get(key, 0))
        for key in set(anon_counters) | set(subject_counters)
    }

    traits = {**anonymous_profile.get("traits", {}), **subject_profile.get("traits", {})}
    scores = scores_from_counters(counters)
    traits = traits_from_counters(counters, traits)

    return {
        **anonymous_profile,
        **subject_profile,
        "traits": traits,
        "scores": scores,
        "counters": counters,
        "preferences": {
            **anonymous_profile.get("preferences", {}),
            **subject_profile.get("preferences", {}),
        },
    }
