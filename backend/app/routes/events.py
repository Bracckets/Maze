from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.schemas import EventBatchIn
from app.routes.dependencies import get_api_key_context
from app.services.platform import ingest_events

router = APIRouter()


@router.post("/events")
def create_events(
    payload: EventBatchIn,
    api_key_context: dict = Depends(get_api_key_context),
    db: Session = Depends(get_db),
):
    try:
        accepted = ingest_events(
            db,
            api_key_context["workspace_id"],
            api_key_context["api_key_id"],
            [item.model_dump(by_alias=False) for item in payload.events],
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return {"accepted": accepted}
