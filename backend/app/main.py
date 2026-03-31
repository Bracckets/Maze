from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.db import engine, ensure_runtime_schema, verify_required_schema
from app.models.schemas import HealthOut
from app.routes.auth import router as auth_router
from app.routes.events import router as events_router
from app.routes.integrations import router as integrations_router
from app.routes.insights import router as insights_router
from app.routes.screenshots import router as screenshots_router
from app.routes.usage import router as usage_router
from app.routes.workspace import router as workspace_router
from app.settings import settings


@asynccontextmanager
async def lifespan(_: FastAPI):
    if not settings.auth_secret:
        raise RuntimeError("AUTH_SECRET must be set before starting the backend.")
    verify_required_schema()
    ensure_runtime_schema()
    yield


app = FastAPI(title="Mobile UX Insight Engine", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.cors_allow_origins),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(auth_router)
app.include_router(events_router)
app.include_router(insights_router)
app.include_router(workspace_router)
app.include_router(integrations_router)
app.include_router(usage_router)
app.include_router(screenshots_router)


@app.get("/health", response_model=HealthOut)
def health_check():
    return HealthOut(status="ok")


@app.get("/ready")
def readiness_check():
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))

    return {
        "status": "ready",
        "environment": settings.app_env,
        "database": "postgresql",
    }
