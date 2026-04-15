from app.liquid.resolver import BundleEntry, ResolutionContext, VariantCandidate, resolve_bundle_items, stable_bucket


def make_candidate(
    *,
    candidate_id: str,
    locale: str | None = None,
    text: str = "",
    segment_key: str | None = None,
    segment_conditions: dict | None = None,
    rule_key: str | None = None,
    rule_conditions: dict | None = None,
    experiment_key: str | None = None,
    experiment_status: str | None = None,
    experiment_seed: str | None = None,
    experiment_arm: str | None = None,
    experiment_traffic_allocation: int = 100,
    traffic_percentage: int = 100,
    priority: int = 100,
    is_default: bool = False,
) -> VariantCandidate:
    return VariantCandidate(
        id=candidate_id,
        locale=locale,
        content={
            "text": text,
            "icon": None,
            "visibility": "visible",
            "emphasis": "medium",
            "ordering": 0,
        },
        segment_key=segment_key,
        segment_enabled=True,
        segment_conditions=segment_conditions or {"all": [], "any": []},
        rule_key=rule_key,
        rule_enabled=True,
        rule_conditions=rule_conditions or {"all": [], "any": []},
        experiment_key=experiment_key,
        experiment_status=experiment_status,
        experiment_seed=experiment_seed,
        experiment_arm=experiment_arm,
        experiment_traffic_allocation=experiment_traffic_allocation,
        traffic_percentage=traffic_percentage,
        priority=priority,
        is_default=is_default,
        enabled=True,
    )


def test_resolver_prefers_exact_locale_targeted_content():
    entry = BundleEntry(
        key="paywall.headline",
        default_locale="en",
        order_index=0,
        variants=[
            make_candidate(candidate_id="default-en", locale="en", text="Default", is_default=True),
            make_candidate(
                candidate_id="segment-en-gb",
                locale="en-GB",
                text="Segmented",
                segment_key="uk-users",
                segment_conditions={"all": [{"field": "country", "operator": "eq", "value": "GB"}], "any": []},
                priority=200,
            ),
        ],
    )
    items = resolve_bundle_items(
        [entry],
        ResolutionContext(locale="en-GB", subject_id="user-1", platform="ios", app_version="2.1.0", country="GB", traits={}),
    )
    assert items[0]["text"] == "Segmented"
    assert items[0]["source"] == "segment"
    assert items[0]["locale"] == "en-GB"


def test_resolver_uses_default_when_targeting_does_not_match():
    entry = BundleEntry(
        key="home.cta",
        default_locale="en",
        order_index=0,
        variants=[
            make_candidate(
                candidate_id="priority-rule",
                locale="en",
                text="Rule",
                rule_key="android-only",
                rule_conditions={"all": [{"field": "platform", "operator": "eq", "value": "android"}], "any": []},
                priority=200,
            ),
            make_candidate(candidate_id="default", locale="en", text="Default", is_default=True),
        ],
    )
    items = resolve_bundle_items(
        [entry],
        ResolutionContext(locale="en", subject_id="user-2", platform="ios", app_version="2.1.0", country="US", traits={}),
    )
    assert items[0]["text"] == "Default"
    assert items[0]["source"] == "default"


def test_resolver_assigns_experiment_deterministically():
    entry = BundleEntry(
        key="onboarding.title",
        default_locale="en",
        order_index=0,
        variants=[
            make_candidate(candidate_id="control", locale="en", text="Control", experiment_key="hero-copy", experiment_status="active", experiment_seed="seed-a", experiment_arm="control", traffic_percentage=50),
            make_candidate(candidate_id="treatment", locale="en", text="Treatment", experiment_key="hero-copy", experiment_status="active", experiment_seed="seed-a", experiment_arm="treatment", traffic_percentage=50),
            make_candidate(candidate_id="default", locale="en", text="Default", is_default=True, priority=50),
        ],
    )
    context = ResolutionContext(locale="en", subject_id="stable-user", platform="ios", app_version="2.1.0", country="US", traits={})
    first = resolve_bundle_items([entry], context)[0]
    second = resolve_bundle_items([entry], context)[0]
    assert first == second
    assert first["source"] == "experiment"
    assert first["experiment"]["experimentKey"] == "hero-copy"
    assert first["experiment"]["arm"] in {"control", "treatment"}


def test_experiment_allocation_can_fall_back_to_default():
    bucket = stable_bucket("stable-user", "seed-b", "hero-copy")
    assert 0 <= bucket < 100

    entry = BundleEntry(
        key="upsell.headline",
        default_locale="en",
        order_index=0,
        variants=[
            make_candidate(candidate_id="arm-a", locale="en", text="Arm A", experiment_key="hero-copy", experiment_status="active", experiment_seed="seed-b", experiment_arm="control", experiment_traffic_allocation=0, traffic_percentage=100),
            make_candidate(candidate_id="default", locale="en", text="Default", is_default=True),
        ],
    )
    resolved = resolve_bundle_items(
        [entry],
        ResolutionContext(locale="en", subject_id="stable-user", platform="ios", app_version="2.1.0", country="US", traits={}),
    )[0]
    assert resolved["text"] == "Default"
    assert resolved["source"] == "default"


def test_safe_fallback_hides_missing_content():
    entry = BundleEntry(
        key="missing.block",
        default_locale="en",
        order_index=3,
        variants=[],
    )
    resolved = resolve_bundle_items(
        [entry],
        ResolutionContext(locale="en", subject_id=None, platform="ios", app_version="2.1.0", country="US", traits={}),
    )[0]
    assert resolved["source"] == "safe_fallback"
    assert resolved["visibility"] == "hidden"
    assert resolved["ordering"] == 3
