from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.schemas import UsageOut
from app.routes.dependencies import get_current_account
from app.services.platform import get_workspace_usage

router = APIRouter(tags=["usage"])


@router.get("/usage", response_model=UsageOut)
def read_usage(account: dict = Depends(get_current_account), db: Session = Depends(get_db)):
    return get_workspace_usage(db, account["workspace_id"])
