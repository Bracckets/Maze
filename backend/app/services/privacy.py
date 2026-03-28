SENSITIVE_KEYS = {
    "password",
    "pin",
    "national_id",
    "ssn",
    "account_number",
    "card_number",
}


def sanitize_metadata(metadata: dict) -> dict:
    sanitized = {}
    for key, value in metadata.items():
        if key.lower() in SENSITIVE_KEYS:
            sanitized[key] = "***"
        else:
            sanitized[key] = value
    return sanitized
