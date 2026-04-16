from app.liquid.service import _clear_default_variant, _profile_conditions, _profile_out, list_liquid_keys


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


def test_list_liquid_keys_without_query_omits_search_filter():
    db = FakeSession([make_row()])

    result = list_liquid_keys(db, "workspace-id")

    sql, params = db.calls[0]
    assert "ILIKE :search" not in sql
    assert "search" not in params
    assert result[0]["key"] == "checkout.primary.cta"


def test_list_liquid_keys_with_query_includes_search_filter():
    db = FakeSession([make_row()])

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
