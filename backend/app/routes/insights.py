from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.schemas import HeatmapOut, HeatmapScenarioOut, HeatmapScenarioStepOut, InsightOut
from app.routes.dependencies import get_current_account
from app.services.platform import (
    build_heatmap_points,
    build_heatmap_scenario,
    list_workspace_insight_snapshots,
    list_workspace_issue_snapshots,
    list_workspace_sessions,
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
def get_heatmap(screen: str, account: dict = Depends(get_current_account), db: Session = Depends(get_db)):
    return HeatmapOut(screen=screen, points=build_heatmap_points(db, account["workspace_id"], screen))


@router.get("/heatmap/scenario", response_model=HeatmapScenarioOut)
def get_heatmap_scenario(account: dict = Depends(get_current_account), db: Session = Depends(get_db)):
    scenario = build_heatmap_scenario(db, account["workspace_id"])
    return HeatmapScenarioOut(
        id=scenario["id"],
        name=scenario["name"],
        summary=scenario["summary"],
        steps=[HeatmapScenarioStepOut(**step) for step in scenario["steps"]],
    )
