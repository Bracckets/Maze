from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class EventIn(BaseModel):
    user_id: str = Field(..., min_length=1)
    session_id: str = Field(..., min_length=1)
    timestamp: datetime
    event_type: str = Field(..., alias="event")
    screen: str = Field(..., min_length=1)
    element_id: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)

    model_config = {"populate_by_name": True}


class EventBatchIn(BaseModel):
    events: list[EventIn]


class InsightOut(BaseModel):
    title: str
    impact: str
    reason: list[str]
    suggestions: list[str]
    issue_type: str
    screen: str
    element_id: str | None = None
    frequency: int
    affected_users_count: int


class HealthOut(BaseModel):
    status: str
