from app.liquid.service import list_liquid_keys


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
