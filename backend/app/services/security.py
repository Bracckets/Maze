import base64
import hashlib
import hmac
import json
import secrets
from datetime import UTC, datetime, timedelta

from app.settings import settings


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 600_000)
    return "pbkdf2_sha256$600000$%s$%s" % (salt.hex(), digest.hex())


def verify_password(password: str, password_hash: str) -> bool:
    try:
        algorithm, iterations, salt_hex, digest_hex = password_hash.split("$", 3)
    except ValueError:
        return False

    if algorithm != "pbkdf2_sha256":
        return False

    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        bytes.fromhex(salt_hex),
        int(iterations),
    )
    return hmac.compare_digest(digest.hex(), digest_hex)


def hash_api_key(api_key: str) -> str:
    return hashlib.sha256(api_key.encode("utf-8")).hexdigest()


def generate_api_key(prefix: str) -> str:
    return f"{prefix}{secrets.token_urlsafe(24)}"


def create_access_token(subject: dict[str, str]) -> str:
    if not settings.auth_secret:
        raise RuntimeError("AUTH_SECRET must be set before issuing access tokens.")

    payload = {
        **subject,
        "exp": int((datetime.now(UTC) + timedelta(minutes=settings.auth_token_ttl_minutes)).timestamp()),
    }
    encoded_payload = base64.urlsafe_b64encode(json.dumps(payload, separators=(",", ":")).encode("utf-8")).decode("utf-8")
    signature = hmac.new(settings.auth_secret.encode("utf-8"), encoded_payload.encode("utf-8"), hashlib.sha256).hexdigest()
    return f"{encoded_payload}.{signature}"


def decode_access_token(token: str) -> dict[str, str] | None:
    if not settings.auth_secret or "." not in token:
        return None

    encoded_payload, signature = token.rsplit(".", 1)
    expected = hmac.new(settings.auth_secret.encode("utf-8"), encoded_payload.encode("utf-8"), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(signature, expected):
        return None

    try:
        payload = json.loads(base64.urlsafe_b64decode(encoded_payload.encode("utf-8")))
    except Exception:
        return None

    if int(payload.get("exp", 0)) < int(datetime.now(UTC).timestamp()):
        return None

    return payload
