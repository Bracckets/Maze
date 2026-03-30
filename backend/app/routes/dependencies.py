from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.services.platform import get_account_by_ids, resolve_api_key
from app.services.security import decode_access_token


def get_current_account(authorization: str | None = Header(default=None), db: Session = Depends(get_db)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token.")

    token = authorization.removeprefix("Bearer ").strip()
    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token.")

    account = get_account_by_ids(db, payload.get("user_id", ""), payload.get("workspace_id", ""))
    if account is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Account not found.")
    return account


def get_api_key_context(x_api_key: str | None = Header(default=None), db: Session = Depends(get_db)) -> dict:
    if not x_api_key:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing X-API-Key header.")

    context = resolve_api_key(db, x_api_key.strip())
    if context is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API key.")
    return context
