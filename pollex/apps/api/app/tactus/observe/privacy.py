from __future__ import annotations

import re
from copy import deepcopy
from typing import Any


SENSITIVE_KEY_RE = re.compile(r"(password|passcode|card|cc_|credit|cvv|cvc|ssn|raw_?input|keystroke|input_?value)", re.I)
EMAIL_RE = re.compile(r"\b[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}\b")
PHONE_RE = re.compile(r"(?<!\d)(?:\+?\d[\d\s().-]{7,}\d)(?!\d)")


def _sanitize_value(value: Any) -> Any:
    if isinstance(value, dict):
        clean: dict[str, Any] = {}
        for key, item in value.items():
            if SENSITIVE_KEY_RE.search(str(key)):
                continue
            clean[key] = _sanitize_value(item)
        return clean
    if isinstance(value, list):
        return [_sanitize_value(item) for item in value]
    if isinstance(value, str):
        without_email = EMAIL_RE.sub("[redacted]", value)
        return PHONE_RE.sub("[redacted]", without_email)
    return value


def sanitize_event(event: Any) -> Any:
    data = event.model_dump() if hasattr(event, "model_dump") else deepcopy(event)
    if "event_value" in data:
        data["event_value"] = _sanitize_value(data.get("event_value") or {})
    if "context" in data:
        data["context"] = _sanitize_value(data.get("context") or {})
    return data
