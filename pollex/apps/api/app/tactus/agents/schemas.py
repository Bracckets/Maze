from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.tactus.propose.rules import Proposal


class AgentContext(BaseModel):
    model_config = ConfigDict(extra="forbid")

    profile: dict[str, Any] = Field(default_factory=dict)
    element: dict[str, Any] = Field(default_factory=dict)
    allow: dict[str, Any] = Field(default_factory=dict)
    constraints: dict[str, Any] = Field(default_factory=dict)
    context: dict[str, Any] = Field(default_factory=dict)
    signals: list[str] = Field(default_factory=list)


class CompactLLMPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    element: dict[str, Any] = Field(default_factory=dict)
    allowed_fields: list[str] = Field(default_factory=list)
    constraints: dict[str, Any] = Field(default_factory=dict)
    context: dict[str, Any] = Field(default_factory=dict)
    traits: dict[str, Any] = Field(default_factory=dict)
    scores: dict[str, Any] = Field(default_factory=dict)
    signals: list[str] = Field(default_factory=list)


class ModelProposal(BaseModel):
    model_config = ConfigDict(extra="ignore")

    adaptations: dict[str, Any] = Field(default_factory=dict)
    confidence: float = 0.5
    reason: str = "LLM specialist proposed a safe adaptation."

    @field_validator("confidence")
    @classmethod
    def clamp_confidence(cls, value: float) -> float:
        return min(0.85, max(0.0, value))


class AgentResult(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    proposal: Proposal | None
    signals: list[str]
    used_llm: bool
    reason: Literal["deterministic", "llm_specialist", "fallback_to_deterministic"]
