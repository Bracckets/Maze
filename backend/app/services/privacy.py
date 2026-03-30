from collections.abc import Mapping, Sequence

BASE_SENSITIVE_KEYS = {
    "password",
    "pin",
    "national_id",
    "ssn",
    "account_number",
    "card_number",
}

EMAIL_KEYS = {"email", "email_address"}
CARD_KEYS = {"card", "card_number", "pan"}
ACCOUNT_KEYS = {"account", "account_number"}

STRICT_MASKING_RULES = {
    "mask_passwords",
    "mask_pins",
    "mask_national_ids",
    "mask_ssn",
    "mask_accounts",
    "mask_cards",
    "mask_emails",
}


def _normalize_rules(masking: str | None) -> set[str]:
    value = (masking or "strict").strip().lower()
    if not value or value in {"strict", "default"}:
        return set(STRICT_MASKING_RULES)
    if value in {"none", "off", "disabled"}:
        return set()
    return {item.strip() for item in value.split(",") if item.strip()}


def _should_mask(key: str, rules: set[str]) -> bool:
    normalized = key.lower()
    if normalized in BASE_SENSITIVE_KEYS:
        return True
    if "mask_emails" in rules and normalized in EMAIL_KEYS:
        return True
    if "mask_cards" in rules and normalized in CARD_KEYS:
        return True
    if "mask_accounts" in rules and normalized in ACCOUNT_KEYS:
        return True
    if "mask_passwords" in rules and normalized == "password":
        return True
    if "mask_pins" in rules and normalized == "pin":
        return True
    if "mask_national_ids" in rules and normalized == "national_id":
        return True
    if "mask_ssn" in rules and normalized == "ssn":
        return True
    return False


def _sanitize_value(value, rules: set[str]):
    if isinstance(value, Mapping):
        return {str(key): ("***" if _should_mask(str(key), rules) else _sanitize_value(item, rules)) for key, item in value.items()}
    if isinstance(value, Sequence) and not isinstance(value, (str, bytes, bytearray)):
        return [_sanitize_value(item, rules) for item in value]
    return value


def sanitize_metadata(metadata: dict, masking: str | None = "strict") -> dict:
    rules = _normalize_rules(masking)
    return {key: ("***" if _should_mask(key, rules) else _sanitize_value(value, rules)) for key, value in metadata.items()}
