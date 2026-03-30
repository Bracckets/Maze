from dataclasses import dataclass
from datetime import datetime


@dataclass(slots=True)
class SessionEvent:
    session_id: str
    device_id: str
    occurred_at: datetime
    event_type: str
    screen: str | None
    element_id: str | None
    x: float | None
    y: float | None


@dataclass(slots=True)
class SessionSummary:
    session_id: str
    device_id: str
    start_time: datetime
    end_time: datetime
    last_screen: str | None
    dropped_off: bool


@dataclass(slots=True)
class IssueSummary:
    issue_type: str
    screen: str | None
    element_id: str | None
    frequency: int
    affected_users_count: int
    details: dict[str, str | int | float]
    severity: str
