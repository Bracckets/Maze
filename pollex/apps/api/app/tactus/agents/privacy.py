from __future__ import annotations

from typing import Any


SAFE_CONTEXT_KEYS = {"screen", "screen_key", "page_type", "locale", "country", "sensitive", "device_class"}
SAFE_CONSTRAINT_KEYS = {"maxTextLength", "tone", "emoji"}
SAFE_ADAPTATION_FIELDS = {"text", "size", "tooltip", "helper_text", "aria_label", "icon"}
SENSITIVE_MARKERS = ("password", "otp", "token", "secret", "card", "ssn", "bank", "email", "phone")


def compact_llm_payload(
    profile: dict[str, Any],
    element: dict[str, Any],
    allow: dict[str, Any],
    constraints: dict[str, Any],
    context: dict[str, Any],
    signals: list[str],
) -> dict[str, Any]:
    return {
        "element": {
            "type": str(element.get("type") or "unknown"),
            "intent": str(element.get("intent") or "unknown"),
            "default_text": _safe_text((element.get("default_props") or {}).get("text")),
        },
        "allowed_fields": [field for field, enabled in allow.items() if enabled and field in SAFE_ADAPTATION_FIELDS],
        "constraints": {key: constraints[key] for key in SAFE_CONSTRAINT_KEYS if key in constraints},
        "context": {key: context[key] for key in SAFE_CONTEXT_KEYS if key in context},
        "signals": signals,
        "traits": _safe_flags(profile.get("traits", {})),
        "scores": _safe_scores(profile.get("scores", {})),
    }


def sanitize_adaptations(adaptations: Any, allowed_fields: set[str]) -> dict[str, Any]:
    if not isinstance(adaptations, dict):
        return {}
    clean: dict[str, Any] = {}
    for key, value in adaptations.items():
        if key not in allowed_fields or key not in SAFE_ADAPTATION_FIELDS:
            continue
        if isinstance(value, str):
            value = _safe_text(value)
            if not value:
                continue
        elif key != "size":
            continue
        clean[key] = value
    return clean


def _safe_flags(value: Any) -> dict[str, bool]:
    if not isinstance(value, dict):
        return {}
    return {
        str(key): bool(flag)
        for key, flag in value.items()
        if isinstance(flag, bool) and not _looks_sensitive(str(key))
    }


def _safe_scores(value: Any) -> dict[str, float]:
    if not isinstance(value, dict):
        return {}
    safe: dict[str, float] = {}
    for key, score in value.items():
        if _looks_sensitive(str(key)):
            continue
        if isinstance(score, int | float):
            safe[str(key)] = round(float(score), 3)
    return safe


def _safe_text(value: Any) -> str | None:
    if not isinstance(value, str):
        return None
    if _looks_sensitive(value):
        return None
    return value[:120]


def _looks_sensitive(value: str) -> bool:
    normalized = value.lower()
    return any(marker in normalized for marker in SENSITIVE_MARKERS)

