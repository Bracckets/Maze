from datetime import UTC, datetime, timedelta

from app.liquid.service import (
    _assert_custom_trait_allowed,
    _builtin_trait_by_key,
    _builtin_trait_out,
    _clear_default_variant,
    _compute_behavior_traits,
    _merged_resolution_traits,
    _profile_conditions,
    _profile_out,
    _readiness_from_dependent_traits,
    list_liquid_keys,
)


class FakeMappingsResult:
    def __init__(self, rows):
        self._rows = rows

    def mappings(self):
        return self

    def all(self):
        return self._rows


class FakeSession:
    def __init__(self, rows):
        self.rows = rows
        self.calls = []

    def execute(self, statement, params):
        self.calls.append((str(statement), params))
        return FakeMappingsResult(self.rows)


def make_row():
    return {
        "id": "key-1",
        "key": "checkout.primary.cta",
        "label": "Checkout primary CTA",
        "description": None,
        "namespace": "checkout",
        "default_locale": "en",
        "enabled": True,
        "draft_variant_count": 1,
        "published_variant_count": 1,
        "bundle_count": 1,
        "published_revision": 1,
        "published_at": None,
        "updated_at": "2026-04-15T00:00:00Z",
    }


def test_list_liquid_keys_without_query_omits_search_filter(monkeypatch):
    db = FakeSession([make_row()])
    monkeypatch.setattr(
        "app.liquid.service._key_readiness",
        lambda db, workspace_id, key_id: {"dependentTraits": []},
    )

    result = list_liquid_keys(db, "workspace-id")

    sql, params = db.calls[0]
    assert "ILIKE :search" not in sql
    assert "search" not in params
    assert result[0]["key"] == "checkout.primary.cta"


def test_list_liquid_keys_with_query_includes_search_filter(monkeypatch):
    db = FakeSession([make_row()])
    monkeypatch.setattr(
        "app.liquid.service._key_readiness",
        lambda db, workspace_id, key_id: {"dependentTraits": []},
    )

    list_liquid_keys(db, "workspace-id", "checkout")

    sql, params = db.calls[0]
    assert "ILIKE :search" in sql
    assert params["search"] == "%checkout%"


def test_profile_conditions_build_typed_values():
    trait_map = {
        "age": {"label": "Age", "valueType": "range"},
        "subscriber": {"label": "Subscriber", "valueType": "boolean"},
        "sessions": {"label": "Sessions", "valueType": "int"},
        "plan": {"label": "Plan", "valueType": "text"},
    }

    conditions = _profile_conditions(
        [
            {"traitKey": "age", "minValue": 18, "maxValue": 34},
            {"traitKey": "subscriber", "boolValue": True},
            {"traitKey": "sessions", "intValue": 5},
            {"traitKey": "plan", "value": "pro"},
        ],
        trait_map,
    )

    assert conditions == {
        "all": [
            {"field": "age", "operator": "gte", "value": 18},
            {"field": "age", "operator": "lte", "value": 34},
            {"field": "subscriber", "operator": "eq", "value": True},
            {"field": "sessions", "operator": "eq", "value": 5},
            {"field": "plan", "operator": "eq", "value": "pro"},
        ],
        "any": [],
    }


def test_profile_out_groups_typed_trait_conditions():
    trait_map = {
        "age": {"id": "trait-age", "label": "Age", "valueType": "range"},
        "subscriber": {"id": "trait-subscriber", "label": "Subscriber", "valueType": "boolean"},
        "sessions": {"id": "trait-sessions", "label": "Sessions", "valueType": "int"},
    }

    profile = _profile_out(
        {
            "id": "profile-1",
            "segment_key": "power_users",
            "name": "Power users",
            "description": "High intent audience",
            "conditions": {
                "all": [
                    {"field": "age", "operator": "gte", "value": 18},
                    {"field": "age", "operator": "lte", "value": 34},
                    {"field": "subscriber", "operator": "eq", "value": True},
                    {"field": "sessions", "operator": "eq", "value": 5},
                ],
                "any": [],
            },
            "enabled": True,
            "updated_at": "2026-04-16T00:00:00Z",
        },
        trait_map,
    )

    assert profile["traits"] == [
        {
            "traitId": "trait-age",
            "traitKey": "age",
            "label": "Age",
            "valueType": "range",
            "sourceType": "app_profile",
            "sourceKey": None,
            "liveEligible": True,
            "coveragePercent": 0.0,
            "value": None,
            "intValue": None,
            "minValue": 18.0,
            "maxValue": 34.0,
            "boolValue": None,
            "displayValue": "18 to 34",
        },
        {
            "traitId": "trait-subscriber",
            "traitKey": "subscriber",
            "label": "Subscriber",
            "valueType": "boolean",
            "sourceType": "app_profile",
            "sourceKey": None,
            "liveEligible": True,
            "coveragePercent": 0.0,
            "value": None,
            "intValue": None,
            "minValue": None,
            "maxValue": None,
            "boolValue": True,
            "displayValue": "True",
        },
        {
            "traitId": "trait-sessions",
            "traitKey": "sessions",
            "label": "Sessions",
            "valueType": "int",
            "sourceType": "app_profile",
            "sourceKey": None,
            "liveEligible": True,
            "coveragePercent": 0.0,
            "value": None,
            "intValue": 5,
            "minValue": None,
            "maxValue": None,
            "boolValue": None,
            "displayValue": "5",
        },
    ]


def test_clear_default_variant_without_exclude_id_omits_exclude_clause():
    db = FakeSession([])

    _clear_default_variant(db, "workspace-id", "key-id", "en", None)

    sql, params = db.calls[0]
    assert "exclude_variant_id" not in params
    assert "id <> CAST(:exclude_variant_id AS uuid)" not in sql


def test_clear_default_variant_with_exclude_id_includes_exclude_clause():
    db = FakeSession([])

    _clear_default_variant(db, "workspace-id", "key-id", "en", "variant-id")

    sql, params = db.calls[0]
    assert params["exclude_variant_id"] == "variant-id"
    assert "id <> CAST(:exclude_variant_id AS uuid)" in sql


def test_readiness_marks_missing_source_as_blocking():
    readiness = _readiness_from_dependent_traits(
        [
            {
                "traitKey": "plan",
                "label": "Plan",
                "sourceType": "app_profile",
                "sourceKey": None,
                "liveEligible": True,
                "coveragePercent": 0,
                "status": "missing_source",
            }
        ],
        fallback_only=False,
    )

    assert readiness["state"] == "missing_source"
    assert readiness["blockingIssues"] == ["Plan is missing a runtime source."]


def test_merged_resolution_traits_prefers_preview_then_request_then_stored(monkeypatch):
    monkeypatch.setattr(
        "app.liquid.service._trait_definition_map",
        lambda db, workspace_id: {
            "plan": {"sourceType": "app_profile", "sourceKey": "user.plan", "liveEligible": True},
            "pollex.intent_level": {"sourceType": "pollex_computed", "sourceKey": "pollex.intent_level", "liveEligible": True},
            "preview_only": {"sourceType": "manual_test", "sourceKey": "preview_only", "liveEligible": False},
        },
    )
    monkeypatch.setattr(
        "app.liquid.service._subject_traits_for_subject",
        lambda db, workspace_id, subject_id: {"user": {"plan": "starter"}},
    )

    merged, diagnostics = _merged_resolution_traits(
        db=None,
        workspace_id="workspace-id",
        request_traits={"user": {"plan": "growth"}},
        subject_id="subject-1",
        computed_traits={"maze.intent_level": "high"},
        preview_overrides={"preview_only": "on"},
        stage="draft",
    )

    assert merged["plan"] == "growth"
    assert merged["pollex.intent_level"] == "high"
    assert "maze.intent_level" not in merged
    assert merged["preview_only"] == "on"
    assert diagnostics["missingTraits"] == []
    assert diagnostics["traitSources"]["preview_only"] == "manual_test"


def test_compute_behavior_traits_derives_safe_operational_fields():
    now = datetime.now(UTC)
    db = FakeSession(
        [
            {"occurred_at": now, "event_type": "screen", "screen": "checkout_paywall", "element_id": None},
            {"occurred_at": now - timedelta(hours=1), "event_type": "tap", "screen": "payment", "element_id": "primary_cta"},
            {"occurred_at": now - timedelta(hours=2), "event_type": "screen", "screen": "paywall_offer", "element_id": None},
            {"occurred_at": now - timedelta(hours=3), "event_type": "screen", "screen": "onboarding_step_1", "element_id": None},
            {"occurred_at": now - timedelta(hours=4), "event_type": "screen", "screen": "home", "element_id": None},
            {"occurred_at": now - timedelta(hours=5), "event_type": "tap", "screen": "checkout_review", "element_id": "submit"},
        ]
    )

    traits = _compute_behavior_traits(db, "workspace-id", "subject-1")

    assert traits["pollex.intent_level"] in {"medium", "high"}
    assert traits["pollex.usage_depth"] in {"active", "power"}
    assert traits["pollex.recent_activity"] == "active_24h"
    assert traits["pollex.paywall_fatigue"] is False
    assert traits["pollex.onboarding_stage"] in {"completed", "stalled", "in_progress"}


def test_builtin_pollex_trait_is_registered():
    trait = _builtin_trait_by_key("pollex.intent_level")

    assert trait is not None
    assert trait["sourceType"] == "pollex_computed"
    assert trait["traitKey"] == "pollex.intent_level"


def test_builtin_trait_lookup_accepts_legacy_maze_key():
    trait = _builtin_trait_by_key("maze.intent_level")

    assert trait is not None
    assert trait["traitKey"] == "pollex.intent_level"


def test_custom_traits_cannot_claim_pollex_computed_source():
    try:
        _assert_custom_trait_allowed(
            {
                "traitKey": "custom.intent",
                "sourceType": "pollex_computed",
            }
        )
    except ValueError as exc:
        assert "built in" in str(exc)
    else:
        raise AssertionError("Expected Pollex-computed trait creation to be rejected.")


def test_builtin_trait_out_is_live_eligible():
    db = FakeSession([])

    payload = _builtin_trait_out(
        db,
        "workspace-id",
        {
            "id": "builtin:pollex.intent_level",
            "traitKey": "pollex.intent_level",
            "label": "Intent level",
            "description": "Behavior-derived intent",
            "valueType": "select",
            "sourceType": "pollex_computed",
            "sourceKey": "pollex.intent_level",
            "exampleValues": ["low", "medium", "high"],
            "enabled": True,
        },
    )

    assert payload["liveEligible"] is True
    assert payload["coveragePercent"] == 0.0
