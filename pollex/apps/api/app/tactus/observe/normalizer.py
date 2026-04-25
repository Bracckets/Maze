from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any

from app.tactus.observe.schemas import NormalizedInteractionEvent


ELEMENT_KEY_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9.-]{0,127}$")


def _parse_datetime(value: Any) -> datetime:
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if isinstance(value, str):
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    raise ValueError("occurred_at must be an ISO datetime")


def normalize_event(raw_event: Any) -> NormalizedInteractionEvent:
    data = raw_event.model_dump() if hasattr(raw_event, "model_dump") else dict(raw_event)
    element_key = str(data.get("element_key", ""))
    if not ELEMENT_KEY_RE.match(element_key):
        raise ValueError("element_key may contain only alphanumerics, dots, and hyphens")

    return NormalizedInteractionEvent(
        element_key=element_key,
        event_type=str(data.get("event_type", "")).lower(),
        event_value=data.get("event_value") or {},
        context=data.get("context") or {},
        occurred_at=_parse_datetime(data.get("occurred_at")),
        received_at=datetime.now(timezone.utc),
    )
