from collections.abc import Iterable

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models.entities import EventRecord, IssueRecord, SessionRecord


class EventRepository:
    def __init__(self, db: Session):
        self.db = db

    def add_events(self, events: Iterable[EventRecord]) -> None:
        self.db.add_all(list(events))
        self.db.commit()

    def list_events(self) -> list[EventRecord]:
        return list(self.db.scalars(select(EventRecord).order_by(EventRecord.timestamp.asc())))

    def replace_sessions(self, sessions: Iterable[SessionRecord]) -> None:
        self.db.execute(delete(SessionRecord))
        self.db.add_all(list(sessions))
        self.db.commit()

    def replace_issues(self, issues: Iterable[IssueRecord]) -> None:
        self.db.execute(delete(IssueRecord))
        self.db.add_all(list(issues))
        self.db.commit()

    def list_sessions(self) -> list[SessionRecord]:
        return list(self.db.scalars(select(SessionRecord).order_by(SessionRecord.start_time.asc())))

    def list_issues(self) -> list[IssueRecord]:
        return list(self.db.scalars(select(IssueRecord).order_by(IssueRecord.frequency.desc(), IssueRecord.id.asc())))
