from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any

from app.tactus.policy.risk import risk_level
from app.tactus.propose.rules import Proposal


EMOJI_RE = re.compile(r"[\U0001F300-\U0001FAFF]")
RAW_CSS_RE = re.compile(r"({\s*[^}]+:\s*[^}]+}|[A-Za-z-]+\s*:\s*[^;]+;)")
RAW_HTML_RE = re.compile(r"<\/?[A-Za-z][^>]*>")


@dataclass
class ValidationResult:
    allowed: bool
    filtered_adaptations: dict[str, Any]
    blocked: list[dict[str, str]] = field(default_factory=list)
    reason: str = ""


def _data(value: Any) -> dict[str, Any]:
    if value is None:
        return {}
    if isinstance(value, dict):
        return value
    if hasattr(value, "model_dump"):
        return value.model_dump()
    return {
        key: getattr(value, key)
        for key in dir(value)
        if not key.startswith("_") and key in {"mode", "allowed_adaptations", "blocked_adaptations", "risk_policy", "sensitive_context_rules"}
    }


def _enabled(container: Any, field: str) -> bool:
    if isinstance(container, list | set | tuple):
        return field in container
    if isinstance(container, dict):
        return bool(container.get(field))
    return False


class PolicyValidator:
    def validate(
        self,
        proposal: Proposal,
        policy: Any,
        design_system: Any,
        context: dict[str, Any],
        constraints: dict[str, Any] | None = None,
    ) -> ValidationResult:
        policy_data = _data(policy)
        design_data = _data(design_system)
        constraints = constraints or {}
        mode = policy_data.get("mode", "observe")

        if mode == "observe":
            return ValidationResult(True, {}, [{"field": "*", "reason": "Observe mode blocks adaptations."}], "Observe mode: no adaptations applied.")

        blocked: list[dict[str, str]] = []
        filtered: dict[str, Any] = {}
        allowed_adaptations = policy_data.get("allowed_adaptations", {})
        blocked_adaptations = policy_data.get("blocked_adaptations", {})
        risk_policy = policy_data.get("risk_policy", {})
        sensitive_rules = policy_data.get("sensitive_context_rules", {})

        for field_name, value in proposal.adaptations.items():
            reason = self._blocked_reason(
                field_name,
                value,
                allowed_adaptations,
                blocked_adaptations,
                risk_policy,
                sensitive_rules,
                design_data,
                context,
                constraints,
                mode,
            )
            if reason:
                blocked.append({"field": field_name, "reason": reason})
            else:
                filtered[field_name] = value

        if mode == "suggest":
            return ValidationResult(True, filtered, blocked, "Suggest mode: proposal stored for review.")

        return ValidationResult(bool(filtered), filtered, blocked, "Allowed." if filtered else "All proposed adaptations were blocked.")

    def _blocked_reason(
        self,
        field_name: str,
        value: Any,
        allowed_adaptations: Any,
        blocked_adaptations: Any,
        risk_policy: dict[str, Any],
        sensitive_rules: dict[str, Any],
        design_system: dict[str, Any],
        context: dict[str, Any],
        constraints: dict[str, Any],
        mode: str,
    ) -> str | None:
        if field_name in {"position", "layout"}:
            return f"{field_name} changes are always blocked."
        if isinstance(value, str) and RAW_HTML_RE.search(value):
            return "Raw HTML is blocked."
        if isinstance(value, str) and RAW_CSS_RE.search(value):
            return "Raw CSS is blocked."
        if _enabled(blocked_adaptations, field_name):
            return "Blocked by adaptation policy."
        if not _enabled(allowed_adaptations, field_name):
            return "Not allowed by adaptation policy."

        level = risk_level(field_name)
        if level == "high" and not bool(risk_policy.get("allow_high_risk")):
            return "High-risk adaptation blocked."
        if level == "medium" and mode == "autopilot" and not bool(risk_policy.get("allow_medium_risk")):
            return "Medium-risk adaptation blocked in autopilot."
        if context.get("sensitive") is True and mode == "autopilot":
            if level in {"medium", "high"}:
                return "Sensitive context blocks medium and high risk adaptations."
            if field_name == "text" and not bool(sensitive_rules.get("allow_text")):
                return "Sensitive context blocks text changes."

        if field_name == "text" and isinstance(value, str):
            max_text_length = constraints.get("maxTextLength")
            if max_text_length is not None and len(value) > int(max_text_length):
                return "Text exceeds maxTextLength."
            if constraints.get("emoji") is False and EMOJI_RE.search(value):
                return "Emoji is disabled by constraints."
            if constraints.get("tone") == "clear" and (value.count("!") > 1 or value.isupper() and len(value) > 3):
                return "Text does not match clear tone."

        tokens = design_system.get("tokens", {})
        if field_name == "size" and tokens.get("sizes") and value not in tokens["sizes"]:
            return "Size token is not approved by the design system."
        if field_name == "variant" and tokens.get("variants") and value not in tokens["variants"]:
            return "Variant token is not approved by the design system."
        return None
