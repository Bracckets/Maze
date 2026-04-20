from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.schemas import ScreenshotRefOut, ScreenshotUploadOut
from app.routes.dependencies import get_api_key_context, get_current_account
from app.services.platform import (
    list_workspace_screenshots,
    resolve_screenshot_file,
    store_screenshot_asset,
    verify_screenshot_token,
)
from app.settings import settings

router = APIRouter(tags=["screenshots"])

ALLOWED_MIME_TYPES = {"image/jpeg", "image/png"}


@router.post("/screenshots", response_model=ScreenshotUploadOut)
async def upload_screenshot(
    screenshot: UploadFile = File(...),
    screen: str | None = Form(default=None),
    session_id: str | None = Form(default=None),
    width: int | None = Form(default=None),
    height: int | None = Form(default=None),
    api_key_context: dict = Depends(get_api_key_context),
    db: Session = Depends(get_db),
):
    if screenshot.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=415, detail="Only image/jpeg and image/png are supported.")

    payload = await screenshot.read()
    if not payload:
        raise HTTPException(status_code=400, detail="Empty screenshot payload.")
    if len(payload) > settings.screenshot_max_upload_bytes:
        raise HTTPException(status_code=413, detail="Screenshot payload too large.")

    try:
        result = store_screenshot_asset(
            db=db,
            workspace_id=api_key_context["workspace_id"],
            session_id=session_id,
            screen=screen,
            content_type=screenshot.content_type,
            payload=payload,
            width=width,
            height=height,
        )
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=422, detail=f"Could not store screenshot: {exc}") from exc
    return ScreenshotUploadOut(screenshot_id=result["screenshot_id"])


@router.get("/screenshots", response_model=list[ScreenshotRefOut])
def get_screenshots(
    screen: str | None = Query(default=None),
    session_id: str | None = Query(default=None),
    device_class: str | None = Query(default=None),
    latest: bool = Query(default=False),
    limit: int = Query(default=10, ge=1, le=50),
    account: dict = Depends(get_current_account),
    db: Session = Depends(get_db),
):
    rows = list_workspace_screenshots(
        db=db,
        workspace_id=account["workspace_id"],
        screen=screen,
        session_id=session_id,
        device_class=device_class,
        limit=1 if latest else limit,
    )
    return [ScreenshotRefOut(**row) for row in rows]


@router.get("/screenshots/file/{screenshot_id}")
def get_screenshot_file(screenshot_id: str, token: str = Query(...), db: Session = Depends(get_db)):
    if not verify_screenshot_token(screenshot_id, token):
        raise HTTPException(status_code=401, detail="Invalid screenshot token.")

    resolved = resolve_screenshot_file(db, screenshot_id)
    if resolved is None:
        raise HTTPException(status_code=404, detail="Screenshot not found or expired.")
    return FileResponse(
        resolved["file_path"],
        media_type=resolved["content_type"],
        headers={"Cache-Control": "no-store, max-age=0"},
    )
