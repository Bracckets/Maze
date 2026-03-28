from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.models.entities import EventRecord
from app.repositories.event_repository import EventRepository
from app.seed.demo_data import build_demo_events
from app.services.pipeline import build_session_records, detect_issues, reconstruct_sessions
from app.settings import settings


def ingest_events(db: Session, events: list[EventRecord]) -> None:
    repo = EventRepository(db)
    repo.add_events(events)
    refresh_aggregates(db)


def refresh_aggregates(db: Session) -> None:
    repo = EventRepository(db)
    events = repo.list_events()
    snapshots = reconstruct_sessions(events)
    repo.replace_sessions(build_session_records(snapshots))
    repo.replace_issues(detect_issues(snapshots))


def seed_demo_data(db: Session) -> None:
    if not settings.seed_demo_data:
        refresh_aggregates(db)
        return
    if db.query(EventRecord).first():
        refresh_aggregates(db)
        return
    db.execute(delete(EventRecord))
    db.commit()
    ingest_events(db, build_demo_events())
