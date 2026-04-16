from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator, model_validator

VisibilityValue = Literal["visible", "hidden"]
EmphasisValue = Literal["low", "medium", "high"]
ExperimentStatus = Literal["draft", "active", "paused", "completed"]
ConditionOperator = Literal["eq", "neq", "in", "not_in", "gte", "lte", "contains", "exists", "prefix"]
TraitValueType = Literal["text", "int", "range", "boolean", "select"]


class LiquidContentPayload(BaseModel):
    text: str = ""
    icon: str | None = Field(default=None, max_length=80)
    visibility: VisibilityValue = "visible"
    emphasis: EmphasisValue = "medium"
    ordering: int = 0

    @field_validator("icon")
    @classmethod
    def normalize_icon(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None


class LiquidCondition(BaseModel):
    field: str = Field(..., min_length=1, max_length=120)
    operator: ConditionOperator = "eq"
    value: Any = None


class LiquidConditionGroup(BaseModel):
    all: list[LiquidCondition] = Field(default_factory=list)
    any: list[LiquidCondition] = Field(default_factory=list)


class LiquidKeyCreateIn(BaseModel):
    key: str = Field(..., min_length=2, max_length=160, pattern=r"^[a-z0-9._/-]+$")
    label: str = Field(..., min_length=2, max_length=160)
    description: str | None = Field(default=None, max_length=600)
    namespace: str | None = Field(default=None, max_length=80)
    defaultLocale: str = Field(default="en", min_length=2, max_length=20)
    screenKey: str | None = Field(default=None, min_length=2, max_length=160)
    enabled: bool = True
    initialContent: LiquidContentPayload = Field(default_factory=LiquidContentPayload)


class LiquidKeyDraftUpdateIn(BaseModel):
    key: str = Field(..., min_length=2, max_length=160, pattern=r"^[a-z0-9._/-]+$")
    label: str = Field(..., min_length=2, max_length=160)
    description: str | None = Field(default=None, max_length=600)
    namespace: str | None = Field(default=None, max_length=80)
    defaultLocale: str = Field(default="en", min_length=2, max_length=20)
    screenKey: str | None = Field(default=None, min_length=2, max_length=160)
    enabled: bool = True


class LiquidKeySummaryOut(BaseModel):
    id: str
    key: str
    label: str
    description: str | None = None
    namespace: str | None = None
    defaultLocale: str
    enabled: bool
    draftVariantCount: int
    publishedVariantCount: int
    bundleCount: int
    publishedRevision: int
    publishedAt: datetime | None = None
    updatedAt: datetime


class LiquidVariantCreateIn(BaseModel):
    locale: str | None = Field(default=None, min_length=2, max_length=20)
    content: LiquidContentPayload = Field(default_factory=LiquidContentPayload)
    segmentId: str | None = None
    ruleId: str | None = None
    experimentId: str | None = None
    experimentArm: str | None = Field(default=None, max_length=80)
    trafficPercentage: int = Field(default=100, ge=0, le=100)
    priority: int = Field(default=100, ge=0, le=1000)
    isDefault: bool = False
    enabled: bool = True

    @model_validator(mode="after")
    def validate_experiment_arm(self) -> "LiquidVariantCreateIn":
        if self.experimentId and not self.experimentArm:
            raise ValueError("experimentArm is required when experimentId is set.")
        if not self.experimentId and self.experimentArm:
            raise ValueError("experimentArm requires experimentId.")
        return self


class LiquidVariantUpdateIn(LiquidVariantCreateIn):
    pass


class LiquidVariantOut(BaseModel):
    id: str
    stage: Literal["draft", "published"]
    locale: str | None = None
    content: LiquidContentPayload
    segmentId: str | None = None
    segmentKey: str | None = None
    ruleId: str | None = None
    ruleKey: str | None = None
    experimentId: str | None = None
    experimentKey: str | None = None
    experimentArm: str | None = None
    trafficPercentage: int
    priority: int
    isDefault: bool
    enabled: bool
    updatedAt: datetime


class LiquidBundleReferenceOut(BaseModel):
    id: str
    screenKey: str
    label: str
    orderIndex: int
    enabled: bool


class LiquidKeyDetailOut(BaseModel):
    id: str
    key: str
    label: str
    description: str | None = None
    namespace: str | None = None
    defaultLocale: str
    enabled: bool
    publishedRevision: int
    publishedAt: datetime | None = None
    draftUpdatedAt: datetime
    variants: list[LiquidVariantOut]
    bundles: list[LiquidBundleReferenceOut]


class LiquidSegmentUpsertIn(BaseModel):
    segmentKey: str = Field(..., min_length=2, max_length=120, pattern=r"^[a-z0-9._/-]+$")
    name: str = Field(..., min_length=2, max_length=160)
    description: str | None = Field(default=None, max_length=600)
    conditions: LiquidConditionGroup = Field(default_factory=LiquidConditionGroup)
    enabled: bool = True


class LiquidSegmentOut(BaseModel):
    id: str
    segmentKey: str
    name: str
    description: str | None = None
    conditions: LiquidConditionGroup
    enabled: bool
    updatedAt: datetime


class LiquidTraitUpsertIn(BaseModel):
    traitKey: str = Field(..., min_length=2, max_length=120, pattern=r"^[a-z0-9._/-]+$")
    label: str = Field(..., min_length=2, max_length=120)
    description: str | None = Field(default=None, max_length=400)
    valueType: TraitValueType = "text"
    enabled: bool = True


class LiquidTraitOut(BaseModel):
    id: str
    traitKey: str
    label: str
    description: str | None = None
    valueType: TraitValueType
    enabled: bool
    updatedAt: datetime


class LiquidProfileTraitValueIn(BaseModel):
    traitId: str | None = None
    traitKey: str = Field(..., min_length=2, max_length=120, pattern=r"^[a-z0-9._/-]+$")
    value: str | None = Field(default=None, max_length=160)
    intValue: int | None = None
    minValue: float | None = None
    maxValue: float | None = None
    boolValue: bool | None = None


class LiquidProfileTraitValueOut(BaseModel):
    traitId: str | None = None
    traitKey: str
    label: str
    valueType: TraitValueType = "text"
    value: str | None = None
    intValue: int | None = None
    minValue: float | None = None
    maxValue: float | None = None
    boolValue: bool | None = None
    displayValue: str


class LiquidProfileUpsertIn(BaseModel):
    profileKey: str = Field(..., min_length=2, max_length=120, pattern=r"^[a-z0-9._/-]+$")
    name: str = Field(..., min_length=2, max_length=160)
    description: str | None = Field(default=None, max_length=600)
    traits: list[LiquidProfileTraitValueIn] = Field(default_factory=list)
    enabled: bool = True


class LiquidProfileOut(BaseModel):
    id: str
    profileKey: str
    name: str
    description: str | None = None
    traits: list[LiquidProfileTraitValueOut]
    enabled: bool
    updatedAt: datetime


class LiquidRuleUpsertIn(BaseModel):
    ruleKey: str = Field(..., min_length=2, max_length=120, pattern=r"^[a-z0-9._/-]+$")
    name: str = Field(..., min_length=2, max_length=160)
    description: str | None = Field(default=None, max_length=600)
    conditions: LiquidConditionGroup = Field(default_factory=LiquidConditionGroup)
    priority: int = Field(default=100, ge=0, le=1000)
    enabled: bool = True


class LiquidRuleOut(BaseModel):
    id: str
    ruleKey: str
    name: str
    description: str | None = None
    conditions: LiquidConditionGroup
    priority: int
    enabled: bool
    updatedAt: datetime


class LiquidExperimentUpsertIn(BaseModel):
    experimentKey: str = Field(..., min_length=2, max_length=120, pattern=r"^[a-z0-9._/-]+$")
    name: str = Field(..., min_length=2, max_length=160)
    description: str | None = Field(default=None, max_length=600)
    status: ExperimentStatus = "draft"
    trafficAllocation: int = Field(default=100, ge=0, le=100)


class LiquidExperimentOut(BaseModel):
    id: str
    experimentKey: str
    name: str
    description: str | None = None
    status: ExperimentStatus
    trafficAllocation: int
    seed: str
    updatedAt: datetime


class LiquidBundleItemIn(BaseModel):
    keyId: str
    orderIndex: int = 0
    enabled: bool = True


class LiquidBundleUpsertIn(BaseModel):
    screenKey: str = Field(..., min_length=2, max_length=160, pattern=r"^[a-z0-9._/-]+$")
    label: str = Field(..., min_length=2, max_length=160)
    description: str | None = Field(default=None, max_length=600)
    enabled: bool = True
    items: list[LiquidBundleItemIn] = Field(default_factory=list)


class LiquidBundleItemOut(BaseModel):
    keyId: str
    key: str
    label: str
    orderIndex: int
    enabled: bool


class LiquidBundleSummaryOut(BaseModel):
    id: str
    screenKey: str
    label: str
    description: str | None = None
    enabled: bool
    draftKeyCount: int
    publishedKeyCount: int
    publishedRevision: int
    publishedAt: datetime | None = None
    updatedAt: datetime


class LiquidBundleDetailOut(BaseModel):
    id: str
    screenKey: str
    label: str
    description: str | None = None
    enabled: bool
    publishedRevision: int
    publishedAt: datetime | None = None
    draftItems: list[LiquidBundleItemOut]
    publishedItems: list[LiquidBundleItemOut]
    updatedAt: datetime


class LiquidResolutionRequestIn(BaseModel):
    screenKey: str = Field(..., min_length=2, max_length=160)
    locale: str | None = Field(default=None, min_length=2, max_length=20)
    subjectId: str | None = Field(default=None, max_length=160)
    platform: str | None = Field(default=None, max_length=80)
    appVersion: str | None = Field(default=None, max_length=80)
    country: str | None = Field(default=None, max_length=80)
    traits: dict[str, Any] = Field(default_factory=dict)


class LiquidExperimentAssignmentOut(BaseModel):
    experimentKey: str
    arm: str


class LiquidResolvedItemOut(BaseModel):
    key: str
    text: str
    icon: str | None = None
    visibility: VisibilityValue
    emphasis: EmphasisValue
    ordering: int
    locale: str
    source: Literal["experiment", "rule", "segment", "default", "safe_fallback"]
    experiment: LiquidExperimentAssignmentOut | None = None


class LiquidBundleResolveOut(BaseModel):
    screenKey: str
    stage: Literal["draft", "published"]
    revision: int
    etag: str
    ttlSeconds: int
    generatedAt: datetime
    items: list[LiquidResolvedItemOut]


class LiquidOverviewOut(BaseModel):
    keyCount: int
    bundleCount: int
    publishedKeyCount: int
    publishedBundleCount: int
    segmentCount: int
    activeExperimentCount: int
    runtimePath: str
    cachePolicy: str
