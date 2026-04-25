from __future__ import annotations

import time
from abc import ABC, abstractmethod
from collections import defaultdict, deque

from fastapi import HTTPException


class RateLimiterInterface(ABC):
    @abstractmethod
    async def check(self, key: str, limit: int, window_seconds: int = 60) -> None:
        raise NotImplementedError


class InMemorySlidingWindowRateLimiter(RateLimiterInterface):
    def __init__(self) -> None:
        self._windows: dict[str, deque[float]] = defaultdict(deque)

    async def check(self, key: str, limit: int, window_seconds: int = 60) -> None:
        now = time.monotonic()
        window = self._windows[key]
        while window and now - window[0] >= window_seconds:
            window.popleft()
        if len(window) >= limit:
            retry_after = max(1, int(window_seconds - (now - window[0])))
            raise HTTPException(
                status_code=429,
                detail="Rate limit exceeded",
                headers={"Retry-After": str(retry_after)},
            )
        window.append(now)


sdk_rate_limiter = InMemorySlidingWindowRateLimiter()
