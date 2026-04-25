from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, model_validator


class IdentifyRequest(BaseModel):
    subject_id: str | None = None
    anonymous_id: str | None = None
    traits: dict[str, Any] = Field(default_factory=dict)

    @model_validator(mode="after")
    def require_identity(self) -> "IdentifyRequest":
        if not self.subject_id and not self.anonymous_id:
            raise ValueError("subject_id or anonymous_id is required")
        return self


class ProfileSummary(BaseModel):
    subject_id: str
    anonymous_id: str | None = None
    traits: dict[str, Any]
    scores: dict[str, Any]
    counters: dict[str, Any]
    preferences: dict[str, Any]


class EventIn(BaseModel):
    element_key: str
    event_type: str
    event_value: dict[str, Any] = Field(default_factory=dict)
    context: dict[str, Any] = Field(default_factory=dict)
    occurred_at: datetime


class EventsRequest(BaseModel):
    subject_id: str | None = None
    anonymous_id: str | None = None
    session_id: str | None = None
    events: list[EventIn]


class EventsResponse(BaseModel):
    accepted: int


class ResolveElement(BaseModel):
    key: str
    type: str
    intent: str | None = None
    default_props: dict[str, Any] = Field(default_factory=dict)


class ResolveRequest(BaseModel):
    subject_id: str | None = None
    anonymous_id: str | None = None
    session_id: str | None = None
    element: ResolveElement
    allow: dict[str, bool] = Field(default_factory=dict)
    constraints: dict[str, Any] = Field(default_factory=dict)
    context: dict[str, Any] = Field(default_factory=dict)
    traits: dict[str, Any] = Field(default_factory=dict)


class BatchResolveRequest(BaseModel):
    subject_id: str | None = None
    anonymous_id: str | None = None
    session_id: str | None = None
    elements: list[ResolveElement]
    allow: dict[str, bool] = Field(default_factory=dict)
    constraints: dict[str, Any] = Field(default_factory=dict)
    context: dict[str, Any] = Field(default_factory=dict)
    traits: dict[str, Any] = Field(default_factory=dict)

    def to_single(self, element: ResolveElement) -> ResolveRequest:
        return ResolveRequest(
            subject_id=self.subject_id,
            anonymous_id=self.anonymous_id,
            session_id=self.session_id,
            element=element,
            allow=self.allow,
            constraints=self.constraints,
            context=self.context,
            traits=self.traits,
        )


class ResolveDecision(BaseModel):
    element_key: str
    adaptations: dict[str, Any]
    confidence: float
    reason: str
    policy_passed: bool
    fallback: bool
    mode: str
