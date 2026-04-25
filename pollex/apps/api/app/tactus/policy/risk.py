LOW_RISK_FIELDS = {"text", "size", "tooltip", "helper_text", "aria_label"}
MEDIUM_RISK_FIELDS = {"icon_visibility", "density", "ordering"}
HIGH_RISK_FIELDS = {
    "color",
    "position",
    "layout",
    "navigation",
    "pricing",
    "legal_text",
    "checkout_flow",
    "medical_content",
    "financial_content",
}


def risk_level(field: str) -> str:
    if field in HIGH_RISK_FIELDS:
        return "high"
    if field in MEDIUM_RISK_FIELDS:
        return "medium"
    return "low"
