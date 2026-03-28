from contextlib import asynccontextmanager

from fastapi import FastAPI
from sqlalchemy import text

from app.db import Base, SessionLocal, engine
from app.models.schemas import HealthOut
from app.routes.events import router as events_router
from app.routes.insights import router as insights_router
from app.services.processor import seed_demo_data
from app.settings import settings


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_demo_data(db)
    finally:
        db.close()
    yield


app = FastAPI(title="Mobile UX Insight Engine", version="0.1.0", lifespan=lifespan)
app.include_router(events_router)
app.include_router(insights_router)


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
        "seed_demo_data": settings.seed_demo_data,
    }
