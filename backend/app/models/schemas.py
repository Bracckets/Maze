from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field


class EventIn(BaseModel):
    event_id: str = Field(..., min_length=1)
    session_id: str = Field(..., min_length=1)
    device_id: str = Field(..., min_length=1)
    occurred_at: datetime
    event_type: str = Field(..., alias="event")
    screen: str | None = None
    element_id: str | None = None
    x: float | None = None
    y: float | None = None
    screen_width: float | None = None
    screen_height: float | None = None
    app_version: str | None = None
    screenshot_id: UUID | None = None
    platform: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)

    model_config = {"populate_by_name": True}


class EventBatchIn(BaseModel):
    events: list[EventIn]


class ScreenshotUploadOut(BaseModel):
    screenshot_id: str


class ScreenshotRefOut(BaseModel):
    screenshot_id: str
    session_id: str | None = None
    screen: str | None = None
    signed_url: str
    content_type: str
    width: int | None = None
    height: int | None = None
    byte_size: int
    uploaded_at: str
    expires_at: str


class AuthPayload(BaseModel):
    email: str = Field(..., min_length=3)
    password: str = Field(..., min_length=8)


class SignUpPayload(AuthPayload):
    workspace_name: str = Field(..., min_length=2, max_length=100)


class UserOut(BaseModel):
    id: str
    email: str
    workspace_id: str
    workspace_name: str
    plan_id: str | None = None
    plan_name: str | None = None


class AuthOut(BaseModel):
    user: UserOut
    token: str


class ProfileUpdateIn(BaseModel):
    email: str = Field(..., min_length=3)
    workspace_name: str = Field(..., min_length=2, max_length=100)


class ApiKeyCreateIn(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    environment: str = Field(default="live", pattern="^(test|live)$")


class ApiKeyOut(BaseModel):
    id: str
    name: str
    prefix: str | None = None
    token: str | None = None
    createdAt: datetime
    lastUsedAt: datetime | None = None


class ApiKeyListOut(BaseModel):
    keys: list[ApiKeyOut]


class WorkspaceSettingsOut(BaseModel):
    workspaceId: str
    workspaceName: str
    apiBaseUrl: str
    authProvider: str
    ingestionMode: str
    masking: str
    planId: str | None = None
    planName: str | None = None


class WorkspaceSettingsUpdateIn(BaseModel):
    apiBaseUrl: str = Field(..., min_length=1)
    authProvider: str = Field(..., min_length=1)
    ingestionMode: str = Field(..., min_length=1)
    masking: str = Field(..., min_length=1)


class IntegrationServiceOut(BaseModel):
    name: str
    status: str
    path: str


class IntegrationStatusOut(BaseModel):
    services: list[IntegrationServiceOut]


class UsageMetricOut(BaseModel):
    used: int
    limit: int | None = None
    percent: float | None = None


class UsageDailyTrendOut(BaseModel):
    date: str
    events: int
    sessions: int
    apiRequests: int


class UsageOut(BaseModel):
    workspaceId: str
    workspaceName: str
    planId: str | None = None
    planName: str | None = None
    monthStart: str
    monthEnd: str
    events: UsageMetricOut
    sessions: UsageMetricOut
    apiRequests: UsageMetricOut
    daily: list[UsageDailyTrendOut]
    updatedAt: str


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


class HeatmapPointOut(BaseModel):
    x: float
    y: float
    count: int


class HeatmapOut(BaseModel):
    screen: str
    deviceClass: Literal["phone", "desktop"]
    availableDeviceClasses: list[Literal["phone", "desktop"]]
    points: list[HeatmapPointOut]


class HeatmapScenarioStepOut(BaseModel):
    screen: str
    title: str
    summary: str
    focus_area: str
    total_taps: int
    clustered_points: int


class HeatmapScenarioOut(BaseModel):
    id: str
    name: str
    summary: str
    steps: list[HeatmapScenarioStepOut]
