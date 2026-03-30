from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.schemas import ApiKeyCreateIn, ApiKeyListOut, WorkspaceSettingsOut, WorkspaceSettingsUpdateIn
from app.routes.dependencies import get_current_account
from app.services.platform import create_workspace_api_key, get_workspace_settings, list_api_keys, update_workspace_settings

router = APIRouter(prefix="/workspace", tags=["workspace"])


@router.get("/api-keys", response_model=ApiKeyListOut)
def get_api_keys(account: dict = Depends(get_current_account), db: Session = Depends(get_db)):
    return {"keys": list_api_keys(db, account["workspace_id"])}


@router.post("/api-keys")
def post_api_key(payload: ApiKeyCreateIn, account: dict = Depends(get_current_account), db: Session = Depends(get_db)):
    return {"key": create_workspace_api_key(db, account["workspace_id"], payload.name, payload.environment)}


@router.get("/settings", response_model=WorkspaceSettingsOut)
def read_workspace_settings(account: dict = Depends(get_current_account), db: Session = Depends(get_db)):
    return get_workspace_settings(db, account["workspace_id"])


@router.put("/settings", response_model=WorkspaceSettingsOut)
def put_workspace_settings(
    payload: WorkspaceSettingsUpdateIn,
    account: dict = Depends(get_current_account),
    db: Session = Depends(get_db),
):
    return update_workspace_settings(db, account["workspace_id"], payload.model_dump())
