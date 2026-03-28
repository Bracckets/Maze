from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.entities import EventRecord
from app.models.schemas import EventBatchIn
from app.services.processor import ingest_events
from app.services.privacy import sanitize_metadata

router = APIRouter()


@router.post("/events")
def create_events(payload: EventBatchIn, db: Session = Depends(get_db)):
    event_records = [
        EventRecord(
            user_id=item.user_id,
            session_id=item.session_id,
            timestamp=item.timestamp,
            event_type=item.event_type,
            screen=item.screen,
            element_id=item.element_id,
            event_metadata=sanitize_metadata(item.metadata),
        )
        for item in payload.events
    ]
    ingest_events(db, event_records)
    return {"accepted": len(event_records)}
