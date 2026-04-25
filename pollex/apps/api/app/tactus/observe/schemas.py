from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class NormalizedInteractionEvent(BaseModel):
    element_key: str
    event_type: str
    event_value: dict[str, Any] = Field(default_factory=dict)
    context: dict[str, Any] = Field(default_factory=dict)
    occurred_at: datetime
    received_at: datetime
