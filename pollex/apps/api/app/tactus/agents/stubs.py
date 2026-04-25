from __future__ import annotations

from app.tactus.agents.base import AgentInterface


class FrictionAnalystAgent(AgentInterface):
    """Deterministic stub. Returns input unchanged with no analysis."""

    def run(self, input: dict) -> dict:
        return {"status": "stub", "output": None}


class UXProfileAgent(FrictionAnalystAgent):
    pass


class AdaptationProposalAgent(FrictionAnalystAgent):
    pass


class ExplanationAgent(FrictionAnalystAgent):
    pass
