from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.schemas import IntegrationStatusOut
from app.routes.dependencies import get_current_account
from app.services.platform import build_integration_status

router = APIRouter(tags=["integrations"])


@router.get("/integrations/status", response_model=IntegrationStatusOut)
def get_integrations_status(account: dict = Depends(get_current_account), db: Session = Depends(get_db)):
    return build_integration_status(db, account["workspace_id"])
