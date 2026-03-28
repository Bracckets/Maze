from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class EventRecord(Base):
    __tablename__ = "events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[str] = mapped_column(String(128), index=True)
    session_id: Mapped[str] = mapped_column(String(128), index=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime, index=True)
    event_type: Mapped[str] = mapped_column(String(64), index=True)
    screen: Mapped[str] = mapped_column(String(128), index=True)
    element_id: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    event_metadata: Mapped[dict] = mapped_column("metadata", JSON, default=dict)


class SessionRecord(Base):
    __tablename__ = "sessions"

    session_id: Mapped[str] = mapped_column(String(128), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(128), index=True)
    start_time: Mapped[datetime] = mapped_column(DateTime)
    end_time: Mapped[datetime] = mapped_column(DateTime)
    last_screen: Mapped[str] = mapped_column(String(128), index=True)
    dropped_off: Mapped[bool] = mapped_column(Boolean, default=False)


class IssueRecord(Base):
    __tablename__ = "issues"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    type: Mapped[str] = mapped_column(String(64), index=True)
    screen: Mapped[str] = mapped_column(String(128), index=True)
    element_id: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    frequency: Mapped[int] = mapped_column(Integer, default=0)
    affected_users_count: Mapped[int] = mapped_column(Integer, default=0)
    details: Mapped[dict] = mapped_column(JSON, default=dict)
