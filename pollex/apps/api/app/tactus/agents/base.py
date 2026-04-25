from __future__ import annotations

from abc import ABC, abstractmethod


class AgentInterface(ABC):
    @abstractmethod
    def run(self, input: dict) -> dict:
        raise NotImplementedError
