from __future__ import annotations

from dataclasses import dataclass
from hashlib import sha256
from typing import Any


@dataclass(slots=True)
class ResolutionContext:
    locale: str | None
    subject_id: str | None
    platform: str | None
    app_version: str | None
    country: str | None
    traits: dict[str, Any]


@dataclass(slots=True)
class VariantCandidate:
    id: str
    locale: str | None
    content: dict[str, Any]
    segment_key: str | None
    segment_enabled: bool
    segment_conditions: dict[str, Any]
    rule_key: str | None
    rule_enabled: bool
    rule_conditions: dict[str, Any]
    experiment_key: str | None
    experiment_status: str | None
    experiment_seed: str | None
    experiment_arm: str | None
    experiment_traffic_allocation: int
    traffic_percentage: int
    priority: int
    is_default: bool
    enabled: bool


@dataclass(slots=True)
class BundleEntry:
    key: str
    default_locale: str
    order_index: int
    variants: list[VariantCandidate]


def resolve_bundle_items(entries: list[BundleEntry], context: ResolutionContext) -> list[dict[str, Any]]:
    resolved_items = []
    for entry in entries:
        selection = resolve_entry(entry, context)
        content = selection["content"]
        resolved_items.append(
            {
                "key": entry.key,
                "text": str(content.get("text", "")),
                "icon": content.get("icon"),
                "visibility": content.get("visibility", "visible"),
                "emphasis": content.get("emphasis", "medium"),
                "ordering": int(content.get("ordering", entry.order_index)),
                "locale": selection["locale"],
                "source": selection["source"],
                "experiment": selection["experiment"],
            }
        )
    return sorted(resolved_items, key=lambda item: (item["ordering"], item["key"]))


def resolve_entry(entry: BundleEntry, context: ResolutionContext) -> dict[str, Any]:
    candidates = [candidate for candidate in entry.variants if candidate.enabled]
    experiment_selection = _select_experiment_candidate(candidates, entry.default_locale, context)
    if experiment_selection is not None:
        return experiment_selection

    targeted_candidates = []
    default_candidates = []
    fallback_candidates = []
    for candidate in candidates:
        if candidate.experiment_key:
            continue
        locale_score = _locale_score(candidate.locale, context.locale, entry.default_locale)
        if locale_score < 0:
            continue
        if not _matches_targeting(candidate, context):
            continue
        record = (locale_score, candidate.priority, candidate)
        fallback_candidates.append(record)
        if candidate.is_default:
            default_candidates.append(record)
        else:
            targeted_candidates.append(record)

    if targeted_candidates:
        _, _, candidate = sorted(targeted_candidates, key=lambda item: (-item[0], -item[1], item[2].id))[0]
        return _resolved_candidate(candidate, entry.default_locale, context, "rule" if candidate.rule_key else "segment")

    if default_candidates:
        _, _, candidate = sorted(default_candidates, key=lambda item: (-item[0], -item[1], item[2].id))[0]
        return _resolved_candidate(candidate, entry.default_locale, context, "default")

    if fallback_candidates:
        _, _, candidate = sorted(fallback_candidates, key=lambda item: (-item[0], -item[1], item[2].id))[0]
        return _resolved_candidate(candidate, entry.default_locale, context, "safe_fallback")

    return {
        "content": {
            "text": "",
            "icon": None,
            "visibility": "hidden",
            "emphasis": "medium",
            "ordering": entry.order_index,
        },
        "locale": context.locale or entry.default_locale,
        "source": "safe_fallback",
        "experiment": None,
    }


def stable_bucket(subject_id: str, seed: str, salt: str) -> int:
    digest = sha256(f"{subject_id}:{seed}:{salt}".encode("utf-8")).hexdigest()
    return int(digest[:8], 16) % 100


def evaluate_conditions(conditions: dict[str, Any], context: ResolutionContext) -> bool:
    all_conditions = conditions.get("all") or []
    any_conditions = conditions.get("any") or []
    if not all_conditions and not any_conditions:
        return True
    if all_conditions and not all(_evaluate_condition(condition, context) for condition in all_conditions):
        return False
    if any_conditions and not any(_evaluate_condition(condition, context) for condition in any_conditions):
        return False
    return True


def _select_experiment_candidate(
    candidates: list[VariantCandidate],
    default_locale: str,
    context: ResolutionContext,
) -> dict[str, Any] | None:
    grouped: dict[str, list[tuple[int, int, VariantCandidate]]] = {}
    for candidate in candidates:
        if not candidate.experiment_key or candidate.experiment_status != "active" or not candidate.experiment_arm:
            continue
        if not _matches_targeting(candidate, context):
            continue
        locale_score = _locale_score(candidate.locale, context.locale, default_locale)
        if locale_score < 0:
            continue
        grouped.setdefault(candidate.experiment_key, []).append((locale_score, candidate.priority, candidate))

    for experiment_key, entries in grouped.items():
        best_per_arm: dict[str, tuple[int, int, VariantCandidate]] = {}
        for record in entries:
            candidate = record[2]
            existing = best_per_arm.get(candidate.experiment_arm or "")
            if existing is None or record[:2] > existing[:2]:
                best_per_arm[candidate.experiment_arm or ""] = record

        chosen_candidates = [record[2] for record in best_per_arm.values()]
        if not chosen_candidates:
            continue
        seed = chosen_candidates[0].experiment_seed or experiment_key
        subject_id = context.subject_id or "anonymous"
        bucket = stable_bucket(subject_id, seed, experiment_key)
        allocation_ceiling = chosen_candidates[0].experiment_traffic_allocation
        if bucket >= allocation_ceiling:
            continue

        current = 0
        ordered_candidates = sorted(chosen_candidates, key=lambda candidate: (-candidate.traffic_percentage, -candidate.priority, candidate.id))
        for candidate in ordered_candidates:
            current += candidate.traffic_percentage
            if bucket < current:
                return _resolved_candidate(candidate, default_locale, context, "experiment")
    return None


def _resolved_candidate(
    candidate: VariantCandidate,
    default_locale: str,
    context: ResolutionContext,
    source: str,
) -> dict[str, Any]:
    experiment = None
    if source == "experiment" and candidate.experiment_key and candidate.experiment_arm:
        experiment = {"experimentKey": candidate.experiment_key, "arm": candidate.experiment_arm}
    return {
        "content": candidate.content,
        "locale": candidate.locale or context.locale or default_locale,
        "source": source,
        "experiment": experiment,
    }


def _matches_targeting(candidate: VariantCandidate, context: ResolutionContext) -> bool:
    if candidate.segment_key:
        if not candidate.segment_enabled or not evaluate_conditions(candidate.segment_conditions, context):
            return False
    if candidate.rule_key:
        if not candidate.rule_enabled or not evaluate_conditions(candidate.rule_conditions, context):
            return False
    return True


def _locale_score(variant_locale: str | None, requested_locale: str | None, default_locale: str) -> int:
    normalized_variant = (variant_locale or "").strip().lower()
    normalized_requested = (requested_locale or "").strip().lower()
    normalized_default = default_locale.strip().lower()
    if normalized_variant == normalized_requested and normalized_variant:
        return 4
    if normalized_requested and normalized_variant and normalized_variant.split("-")[0] == normalized_requested.split("-")[0]:
        return 3
    if normalized_variant == normalized_default and normalized_variant:
        return 2
    if not normalized_variant:
        return 1
    return -1


def _evaluate_condition(condition: dict[str, Any], context: ResolutionContext) -> bool:
    actual = _resolve_field(condition.get("field"), context)
    operator = condition.get("operator", "eq")
    expected = condition.get("value")

    if operator == "exists":
        return actual is not None
    if operator == "eq":
        return actual == expected
    if operator == "neq":
        return actual != expected
    if operator == "in":
        return isinstance(expected, list) and actual in expected
    if operator == "not_in":
        return isinstance(expected, list) and actual not in expected
    if operator == "contains":
        if isinstance(actual, str) and isinstance(expected, str):
            return expected.lower() in actual.lower()
        if isinstance(actual, list):
            return expected in actual
        return False
    if operator == "prefix":
        return isinstance(actual, str) and isinstance(expected, str) and actual.lower().startswith(expected.lower())
    if operator == "gte":
        return _compare(actual, expected, lambda left, right: left >= right)
    if operator == "lte":
        return _compare(actual, expected, lambda left, right: left <= right)
    return False


def _resolve_field(field: str | None, context: ResolutionContext) -> Any:
    if not field:
        return None
    if field == "locale":
        return context.locale
    if field == "platform":
        return context.platform
    if field == "appVersion":
        return context.app_version
    if field == "country":
        return context.country
    if field.startswith("traits."):
        return context.traits.get(field.removeprefix("traits."))
    return context.traits.get(field)


def _compare(actual: Any, expected: Any, predicate) -> bool:
    try:
        return predicate(float(actual), float(expected))
    except (TypeError, ValueError):
        return False
