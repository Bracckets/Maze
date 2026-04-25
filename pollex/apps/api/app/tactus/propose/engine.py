from __future__ import annotations

import re
from typing import Any

from app.tactus.propose.rules import Proposal, build_candidates


EMOJI_RE = re.compile(r"[\U0001F300-\U0001FAFF]")


class ProposalEngine:
    def propose(
        self,
        profile: dict[str, Any],
        element: dict[str, Any],
        allow: dict[str, Any],
        constraints: dict[str, Any],
        context: dict[str, Any],
    ) -> Proposal | None:
        valid = [
            candidate
            for candidate in build_candidates(profile, element, allow, constraints, context)
            if self._passes_constraints(candidate, constraints)
        ]
        if not valid:
            return None
        return max(valid, key=lambda proposal: proposal.confidence)

    def _passes_constraints(self, proposal: Proposal, constraints: dict[str, Any]) -> bool:
        text = proposal.adaptations.get("text")
        if isinstance(text, str):
            max_text_length = constraints.get("maxTextLength")
            if max_text_length is not None and len(text) > int(max_text_length):
                return False
            if constraints.get("emoji") is False and EMOJI_RE.search(text):
                return False
        return True
