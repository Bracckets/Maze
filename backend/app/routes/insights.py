from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.schemas import (
    HeatmapOut,
    HeatmapScenarioOut,
    HeatmapScenarioStepOut,
    InsightChatRequestIn,
    InsightChatResponseOut,
    InsightOut,
)
from app.routes.dependencies import get_current_account
from app.services.insight_chat import build_insight_chat_reply
from app.services.platform import (
    build_heatmap_payload,
    build_heatmap_scenario,
    list_workspace_insight_snapshots,
    list_workspace_issue_snapshots,
    list_workspace_sessions,
    normalize_heatmap_device_class,
    serialize_session,
)

router = APIRouter()


@router.get("/insights", response_model=list[InsightOut])
def list_insights(account: dict = Depends(get_current_account), db: Session = Depends(get_db)):
    insights = []
    for row in list_workspace_insight_snapshots(db, account["workspace_id"])[:5]:
        insight = row["payload"]
        insights.append(
            InsightOut(
                **insight,
                issue_type=row["issue_type"],
                screen=row["screen"] or "unknown",
                element_id=row["element_id"],
                frequency=row["frequency"],
                affected_users_count=row["affected_users_count"],
            )
        )
    return insights


@router.post("/insights/chat", response_model=InsightChatResponseOut)
def chat_about_insights(
    payload: InsightChatRequestIn,
    account: dict = Depends(get_current_account),
    db: Session = Depends(get_db),
):
    return InsightChatResponseOut(**build_insight_chat_reply(db, account["workspace_id"], payload.question, payload.focus))


@router.get("/issues")
def list_issues(account: dict = Depends(get_current_account), db: Session = Depends(get_db)):
    return list_workspace_issue_snapshots(db, account["workspace_id"])


@router.get("/sessions")
def list_sessions(
    account: dict = Depends(get_current_account),
    db: Session = Depends(get_db),
    limit: int | None = None,
):
    return [
        serialize_session(session)
        for session in list_workspace_sessions(db, account["workspace_id"], limit)
    ]


@router.get("/heatmap", response_model=HeatmapOut)
def get_heatmap(
    screen: str,
    device_class: str | None = Query(default=None),
    account: dict = Depends(get_current_account),
    db: Session = Depends(get_db),
):
    normalized_device_class = normalize_heatmap_device_class(device_class)
    if device_class is not None and normalized_device_class is None:
        raise HTTPException(status_code=422, detail="device_class must be 'phone' or 'desktop'.")

    try:
        payload = build_heatmap_payload(db, account["workspace_id"], screen, normalized_device_class)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return HeatmapOut(**payload)


@router.get("/heatmap/scenario", response_model=HeatmapScenarioOut)
def get_heatmap_scenario(account: dict = Depends(get_current_account), db: Session = Depends(get_db)):
    scenario = build_heatmap_scenario(db, account["workspace_id"])
    return HeatmapScenarioOut(
        id=scenario["id"],
        name=scenario["name"],
        summary=scenario["summary"],
        steps=[HeatmapScenarioStepOut(**step) for step in scenario["steps"]],
    )
