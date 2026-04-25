from __future__ import annotations

import hashlib
import hmac
import base64
import json
import secrets
import time
from typing import Any

from app.core.config import get_settings


def hash_api_key(api_key: str) -> str:
    return hashlib.sha256(api_key.encode("utf-8")).hexdigest()


def verify_api_key(api_key: str, key_hash: str) -> bool:
    return hmac.compare_digest(hash_api_key(api_key), key_hash)


def generate_api_key() -> str:
    return f"px_{secrets.token_urlsafe(32)}"


def create_studio_token(subject: str, secret: str | None = None, ttl_seconds: int | None = None) -> str:
    settings = get_settings()
    signing_secret = secret or settings.supabase_jwt_secret or "local-dev-studio-secret-change-me"
    ttl = ttl_seconds or settings.studio_token_ttl_seconds
    payload = {"sub": subject, "email": subject, "exp": int(time.time()) + ttl}
    body = base64.urlsafe_b64encode(json.dumps(payload, separators=(",", ":")).encode("utf-8")).decode("ascii").rstrip("=")
    signature = hmac.new(signing_secret.encode("utf-8"), body.encode("ascii"), hashlib.sha256).digest()
    sig = base64.urlsafe_b64encode(signature).decode("ascii").rstrip("=")
    return f"{body}.{sig}"


def verify_studio_token(token: str, secret: str | None = None) -> str | None:
    claims = verify_supabase_jwt(token, secret)
    return str(claims.get("email") or claims.get("sub") or "") if claims else None


def verify_supabase_jwt(token: str, secret: str | None = None) -> dict[str, Any] | None:
    try:
        signing_secret = secret or get_settings().supabase_jwt_secret
        if not signing_secret:
            return None
        parts = token.split(".")
        if len(parts) == 2:
            body, sig = parts
            signed = body
            payload_part = body
        elif len(parts) == 3:
            header, payload_part, sig = parts
            signed = f"{header}.{payload_part}"
            header_json = _decode_json(header)
            if header_json.get("alg") != "HS256":
                return None
        else:
            return None

        expected = hmac.new(signing_secret.encode("utf-8"), signed.encode("ascii"), hashlib.sha256).digest()
        expected_sig = _b64url_encode(expected)
        if not hmac.compare_digest(sig, expected_sig):
            return None
        payload = _decode_json(payload_part)
        if int(payload.get("exp", 0)) < int(time.time()):
            return None
        return payload
    except Exception:
        return None


def _decode_json(value: str) -> dict[str, Any]:
    padded = value + "=" * (-len(value) % 4)
    return json.loads(base64.urlsafe_b64decode(padded.encode("ascii")))


def _b64url_encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).decode("ascii").rstrip("=")
