from __future__ import annotations

from app.tactus.profile.builder import apply_locale_traits, update_profile
from app.tactus.profile.merger import merge_profiles


def event(event_type: str) -> dict:
    return {"event_type": event_type}


def profile(**overrides: dict) -> dict:
    base = {"traits": {}, "scores": {}, "counters": {}, "preferences": {}}
    base.update(overrides)
    return base


def test_missed_tap_increments_counter() -> None:
    updated = update_profile(profile(), [event("missed_tap")])
    assert updated["counters"]["missed_taps"] == 1
    assert updated["scores"]["misclick_score"] == 0.15


def test_missed_tap_sets_needs_larger_targets_after_threshold() -> None:
    updated = update_profile(profile(), [event("missed_tap"), event("missed_tap")])
    assert updated["traits"]["needs_larger_targets"] is True


def test_single_missed_tap_does_not_set_trait() -> None:
    updated = update_profile(profile(), [event("missed_tap")])
    assert "needs_larger_targets" not in updated["traits"]


def test_hesitation_sets_prefers_simple_copy_after_threshold() -> None:
    updated = update_profile(profile(), [event("hesitation"), event("hesitation"), event("hesitation")])
    assert updated["traits"]["prefers_simple_copy"] is True


def test_hesitation_sets_prefers_more_guidance_at_lower_threshold() -> None:
    updated = update_profile(profile(), [event("hesitation"), event("hesitation")])
    assert updated["traits"]["prefers_more_guidance"] is True
    assert "prefers_simple_copy" not in updated["traits"]


def test_rage_tap_sets_high_friction() -> None:
    updated = update_profile(profile(), [event("rage_tap"), event("rage_tap")])
    assert updated["traits"]["high_friction"] is True


def test_form_error_sets_needs_inline_help() -> None:
    updated = update_profile(profile(), [event("form_error"), event("form_error")])
    assert updated["traits"]["needs_inline_help"] is True


def test_locale_ar_sets_prefers_arabic() -> None:
    assert apply_locale_traits({"locale": "ar-EG"})["prefers_arabic"] is True


def test_scores_cap_at_1() -> None:
    updated = update_profile(profile(), [event("missed_tap") for _ in range(20)])
    assert updated["scores"]["misclick_score"] == 1.0


def test_counters_are_monotonic() -> None:
    first = update_profile(profile(), [event("click")])
    second = update_profile(first, [event("click"), event("dismiss")])
    assert second["counters"]["clicks"] == 2
    assert second["counters"]["dismisses"] == 1


def test_conversion_reduces_frustration_score() -> None:
    start = profile(scores={"frustration_score": 0.5})
    updated = update_profile(start, [event("conversion")])
    assert updated["scores"]["frustration_score"] == 0.4


def test_conversion_does_not_reverse_traits() -> None:
    start = update_profile(profile(), [event("rage_tap"), event("rage_tap")])
    updated = update_profile(start, [event("conversion")])
    assert updated["traits"]["high_friction"] is True


def test_merge_sums_counters() -> None:
    merged = merge_profiles(
        profile(counters={"missed_taps": 1}),
        profile(counters={"missed_taps": 2}),
    )
    assert merged["counters"]["missed_taps"] == 3
    assert merged["traits"]["needs_larger_targets"] is True


def test_merge_subject_wins_on_conflict() -> None:
    merged = merge_profiles(
        profile(traits={"plan": "free"}, preferences={"density": "comfortable"}),
        profile(traits={"plan": "pro"}, preferences={"density": "compact"}),
    )
    assert merged["traits"]["plan"] == "pro"
    assert merged["preferences"]["density"] == "compact"
