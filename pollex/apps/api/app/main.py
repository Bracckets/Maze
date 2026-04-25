from __future__ import annotations

import asyncio
import logging
import sys

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.database import init_database
from app.sdk.routes import router as sdk_router
from app.studio.routes import router as studio_router


if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

logger = logging.getLogger("uvicorn.error")
settings = get_settings()
app = FastAPI(title=settings.app_name)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(sdk_router)
app.include_router(studio_router)


@app.on_event("startup")
async def startup() -> None:
    try:
        await init_database()
    except Exception as exc:
        logger.warning("Database initialization skipped: %s", exc)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
