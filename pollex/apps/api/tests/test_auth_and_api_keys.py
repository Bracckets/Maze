from __future__ import annotations

import pytest
from fastapi import HTTPException

from app.core.database import ApiKey, Project
from app.core.security import create_studio_token, hash_api_key, verify_supabase_jwt
from app.studio.routes import ApiKeyCreateRequest, StudioAuthContext, create_api_key, revoke_api_key


def test_supabase_jwt_validation_accepts_local_hs256_shape() -> None:
    token = create_studio_token("user@example.com", secret="test-secret", ttl_seconds=60)
    claims = verify_supabase_jwt(token, secret="test-secret")
    assert claims
    assert claims["email"] == "user@example.com"


def test_supabase_jwt_validation_rejects_expired_and_bad_signature() -> None:
    expired = create_studio_token("user@example.com", secret="test-secret", ttl_seconds=-1)
    valid = create_studio_token("user@example.com", secret="test-secret", ttl_seconds=60)
    assert verify_supabase_jwt(expired, secret="test-secret") is None
    assert verify_supabase_jwt(valid, secret="wrong-secret") is None


class FakeResult:
    def __init__(self, row: object | None) -> None:
        self.row = row

    def scalar_one_or_none(self) -> object | None:
        return self.row


class FakeSession:
    def __init__(self, row: object | None) -> None:
        self.row = row
        self.added: object | None = None
        self.committed = False

    async def execute(self, statement: object) -> FakeResult:
        return FakeResult(self.row)

    def add(self, row: object) -> None:
        self.added = row
        self.row = row

    async def commit(self) -> None:
        self.committed = True

    async def refresh(self, row: object) -> None:
        return None


@pytest.mark.asyncio
async def test_create_api_key_returns_plaintext_once_and_stores_hash() -> None:
    project = Project(id="project-1", workspace_id="workspace-1", name="Checkout", slug="checkout")
    session = FakeSession(project)

    auth = StudioAuthContext(user_id="user-1", email="user@example.com")
    response = await create_api_key("project-1", ApiKeyCreateRequest(name="Browser", environment="production"), auth, session=session)  # type: ignore[arg-type]
    stored = session.added

    assert isinstance(stored, ApiKey)
    assert response["key"].startswith("px_")
    assert stored.key_hash == hash_api_key(response["key"])
    assert stored.key_hash != response["key"]
    assert response["key_prefix"] == response["key"][:6]
    assert response["last_four"] == response["key"][-4:]


@pytest.mark.asyncio
async def test_create_api_key_requires_project() -> None:
    with pytest.raises(HTTPException) as error:
        await create_api_key("missing", ApiKeyCreateRequest(), StudioAuthContext("user-1", "user@example.com"), session=FakeSession(None))  # type: ignore[arg-type]
    assert error.value.status_code == 404


@pytest.mark.asyncio
async def test_revoke_api_key_sets_revoked_timestamp() -> None:
    key = ApiKey(
        id="key-1",
        workspace_id="workspace-1",
        project_id="project-1",
        environment="development",
        key_hash="hash",
        key_prefix="px_abc",
        last_four="1234",
        name="Browser",
    )
    response = await revoke_api_key("key-1", StudioAuthContext("user-1", "user@example.com"), session=FakeSession(key))  # type: ignore[arg-type]
    assert response["revoked_at"]
