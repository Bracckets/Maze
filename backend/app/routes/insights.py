from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.schemas import InsightOut
from app.repositories.event_repository import EventRepository
from app.services.pipeline import issue_to_insight

router = APIRouter()


@router.get("/insights", response_model=list[InsightOut])
def list_insights(db: Session = Depends(get_db)):
    repo = EventRepository(db)
    insights = []
    for issue in repo.list_issues()[:5]:
        insight = issue_to_insight(issue)
        insights.append(
            InsightOut(
                **insight,
                issue_type=issue.type,
                screen=issue.screen,
                element_id=issue.element_id,
                frequency=issue.frequency,
                affected_users_count=issue.affected_users_count,
            )
        )
    return insights


@router.get("/issues")
def list_issues(db: Session = Depends(get_db)):
    repo = EventRepository(db)
    return [
        {
            "id": issue.id,
            "type": issue.type,
            "screen": issue.screen,
            "element_id": issue.element_id,
            "frequency": issue.frequency,
            "affected_users_count": issue.affected_users_count,
            "details": issue.details,
        }
        for issue in repo.list_issues()
    ]


@router.get("/sessions")
def list_sessions(db: Session = Depends(get_db)):
    repo = EventRepository(db)
    return [
        {
            "session_id": session.session_id,
            "user_id": session.user_id,
            "start_time": session.start_time,
            "end_time": session.end_time,
            "last_screen": session.last_screen,
            "dropped_off": session.dropped_off,
        }
        for session in repo.list_sessions()
    ]
