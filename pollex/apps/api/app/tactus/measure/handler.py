from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AdaptationOutcome


async def record_outcome(outcome: AdaptationOutcome, db: AsyncSession) -> None:
    db.add(outcome)
    await db.commit()
