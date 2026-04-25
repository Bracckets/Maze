from __future__ import annotations

from dataclasses import dataclass

from fastapi import Depends, Header, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import ApiKey, get_session, utcnow
from app.core.security import hash_api_key


@dataclass(frozen=True)
class ApiKeyContext:
    workspace_id: str
    project_id: str
    environment: str
    api_key_id: str


async def require_api_key(
    authorization: str | None = Header(default=None),
    session: AsyncSession = Depends(get_session),
) -> ApiKeyContext:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")

    token = authorization.split(" ", 1)[1].strip()
    result = await session.execute(
        select(ApiKey).where(ApiKey.key_hash == hash_api_key(token), ApiKey.revoked_at.is_(None))
    )
    api_key = result.scalar_one_or_none()
    if api_key is None:
        raise HTTPException(status_code=401, detail="Invalid API key")

    api_key.last_used_at = utcnow()
    await session.commit()
    return ApiKeyContext(
        workspace_id=api_key.workspace_id,
        project_id=api_key.project_id,
        environment=api_key.environment,
        api_key_id=api_key.id,
    )
