from __future__ import annotations

from collections.abc import AsyncGenerator

from fastapi.testclient import TestClient
from sqlalchemy.exc import SQLAlchemyError

from app.main import app
from app.studio.routes import LOCAL_PROJECTS, get_session


class FailingSession:
    async def execute(self, statement: object) -> None:
        raise SQLAlchemyError("database unavailable")

    async def rollback(self) -> None:
        return None


async def failing_session() -> AsyncGenerator[FailingSession, None]:
    yield FailingSession()


def test_project_create_uses_local_fallback_with_cors_headers() -> None:
    LOCAL_PROJECTS.clear()
    app.dependency_overrides[get_session] = failing_session
    try:
        with TestClient(app, raise_server_exceptions=False) as client:
            login = client.post(
                "/studio/auth/login",
                headers={"Origin": "http://localhost:5173"},
                json={"email": "dev@pollex.local", "password": "dev"},
            )
            token = login.json()["token"]

            created = client.post(
                "/studio/projects",
                headers={"Origin": "http://localhost:5173", "Authorization": f"Bearer {token}"},
                json={"name": "Checkout", "slug": "checkout"},
            )

            duplicate = client.post(
                "/studio/projects",
                headers={"Origin": "http://localhost:5173", "Authorization": f"Bearer {token}"},
                json={"name": "Checkout", "slug": "checkout"},
            )

            assert created.status_code == 200
            assert created.headers["access-control-allow-origin"] == "http://localhost:5173"
            assert created.json()["slug"] == "checkout"
            assert duplicate.status_code == 409
            assert duplicate.headers["access-control-allow-origin"] == "http://localhost:5173"
    finally:
        app.dependency_overrides.clear()
        LOCAL_PROJECTS.clear()


def test_studio_collections_degrade_with_cors_headers_when_database_is_down() -> None:
    app.dependency_overrides[get_session] = failing_session
    try:
        with TestClient(app, raise_server_exceptions=False) as client:
            login = client.post(
                "/studio/auth/login",
                headers={"Origin": "http://127.0.0.1:5174"},
                json={"email": "dev@pollex.local", "password": "dev"},
            )
            token = login.json()["token"]
            headers = {"Origin": "http://127.0.0.1:5174", "Authorization": f"Bearer {token}"}

            for path in ["/studio/elements", "/studio/profiles", "/studio/decisions", "/studio/policies", "/studio/projects"]:
                response = client.get(path, headers=headers)
                assert response.status_code == 200
                assert response.headers["access-control-allow-origin"] == "http://127.0.0.1:5174"
                assert isinstance(response.json(), list)

            overview = client.get("/studio/overview", headers=headers)
            design_system = client.get("/studio/design-system", headers=headers)

            assert overview.status_code == 200
            assert overview.headers["access-control-allow-origin"] == "http://127.0.0.1:5174"
            assert overview.json()["total_observed_elements"] == 0
            assert design_system.status_code == 200
            assert design_system.headers["access-control-allow-origin"] == "http://127.0.0.1:5174"
            assert design_system.json()["name"]
    finally:
        app.dependency_overrides.clear()
