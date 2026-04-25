from __future__ import annotations

from datetime import timedelta

import pytest
from fastapi import HTTPException

from app.core.rate_limit import InMemorySlidingWindowRateLimiter
from app.core.database import utcnow
from app.sdk.routes import _valid_element_key, _valid_occurred_at, _strip_oversized_payload


@pytest.mark.asyncio
async def test_rate_limiter_returns_429_after_limit() -> None:
    limiter = InMemorySlidingWindowRateLimiter()
    await limiter.check("key", limit=2)
    await limiter.check("key", limit=2)
    with pytest.raises(HTTPException) as error:
        await limiter.check("key", limit=2)
    assert error.value.status_code == 429
    assert error.value.headers["Retry-After"]


def test_element_key_hardening() -> None:
    assert _valid_element_key("checkout.continue-1")
    assert not _valid_element_key("checkout/continue")
    assert not _valid_element_key("a" * 129)


def test_event_time_drift_hardening() -> None:
    assert _valid_occurred_at(utcnow())
    assert not _valid_occurred_at(utcnow() - timedelta(hours=25))
    assert not _valid_occurred_at(utcnow() + timedelta(seconds=31))


def test_oversized_payload_is_stripped() -> None:
    event = {"event_value": {"blob": "x" * 5000}, "context": {"page": "checkout"}}
    stripped = _strip_oversized_payload(event)
    assert stripped["event_value"] == {}
    assert stripped["context"] == {}
