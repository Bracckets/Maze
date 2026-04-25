from __future__ import annotations

import time
from abc import ABC, abstractmethod
from typing import Any


class CacheInterface(ABC):
    @abstractmethod
    async def get(self, key: str) -> Any | None:
        raise NotImplementedError

    @abstractmethod
    async def set(self, key: str, value: Any, ttl: int = 300) -> None:
        raise NotImplementedError

    @abstractmethod
    async def delete(self, key: str) -> None:
        raise NotImplementedError


class InMemoryCache(CacheInterface):
    """Simple dict-based cache for development. Not safe for multi-process."""

    def __init__(self) -> None:
        self._values: dict[str, tuple[Any, float]] = {}

    async def get(self, key: str) -> Any | None:
        record = self._values.get(key)
        if record is None:
            return None
        value, expires_at = record
        if expires_at < time.time():
            self._values.pop(key, None)
            return None
        return value

    async def set(self, key: str, value: Any, ttl: int = 300) -> None:
        self._values[key] = (value, time.time() + ttl)

    async def delete(self, key: str) -> None:
        self._values.pop(key, None)
