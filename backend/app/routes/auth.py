from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.schemas import AuthOut, AuthPayload, ProfileUpdateIn, SignUpPayload
from app.routes.dependencies import get_current_account
from app.services.platform import create_user_and_workspace, get_account_by_email, update_account_profile
from app.services.security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=AuthOut, status_code=status.HTTP_201_CREATED)
def sign_up(payload: SignUpPayload, db: Session = Depends(get_db)):
    try:
        account = create_user_and_workspace(db, payload.email, hash_password(payload.password), payload.workspace_name)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account with that email already exists.") from exc

    token = create_access_token({"user_id": account["user_id"], "workspace_id": account["workspace_id"]})
    return {
        "user": {
            "id": account["user_id"],
            "email": account["email"],
            "workspace_id": account["workspace_id"],
            "workspace_name": account["workspace_name"],
            "plan_id": account.get("plan_id"),
            "plan_name": account.get("plan_name"),
        },
        "token": token,
    }


@router.post("/signin", response_model=AuthOut)
def sign_in(payload: AuthPayload, db: Session = Depends(get_db)):
    account = get_account_by_email(db, payload.email)
    if not account or not verify_password(payload.password, account["password_hash"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password.")

    token = create_access_token({"user_id": account["user_id"], "workspace_id": account["workspace_id"]})
    return {
        "user": {
            "id": account["user_id"],
            "email": account["email"],
            "workspace_id": account["workspace_id"],
            "workspace_name": account["workspace_name"],
            "plan_id": account.get("plan_id"),
            "plan_name": account.get("plan_name"),
        },
        "token": token,
    }


@router.get("/me")
def get_me(account: dict = Depends(get_current_account)):
    return {
        "user": {
            "id": account["user_id"],
            "email": account["email"],
            "workspace_id": account["workspace_id"],
            "workspace_name": account["workspace_name"],
            "plan_id": account.get("plan_id"),
            "plan_name": account.get("plan_name"),
        }
    }


@router.put("/me")
def update_me(payload: ProfileUpdateIn, account: dict = Depends(get_current_account), db: Session = Depends(get_db)):
    try:
        updated = update_account_profile(db, account["user_id"], account["workspace_id"], payload.email, payload.workspace_name)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="That email address is already in use.") from exc

    return {
        "user": {
            "id": updated["user_id"],
            "email": updated["email"],
            "workspace_id": updated["workspace_id"],
            "workspace_name": updated["workspace_name"],
            "plan_id": updated.get("plan_id"),
            "plan_name": updated.get("plan_name"),
        }
    }
