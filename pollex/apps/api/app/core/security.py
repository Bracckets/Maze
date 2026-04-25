from __future__ import annotations

import hashlib
import hmac
import base64
import json
import time


def hash_api_key(api_key: str) -> str:
    return hashlib.sha256(api_key.encode("utf-8")).hexdigest()


def verify_api_key(api_key: str, key_hash: str) -> bool:
    return hmac.compare_digest(hash_api_key(api_key), key_hash)


def create_studio_token(subject: str, secret: str = "pollex-studio-dev-secret", ttl_seconds: int = 60 * 60 * 24) -> str:
    payload = {"sub": subject, "exp": int(time.time()) + ttl_seconds}
    body = base64.urlsafe_b64encode(json.dumps(payload, separators=(",", ":")).encode("utf-8")).decode("ascii").rstrip("=")
    signature = hmac.new(secret.encode("utf-8"), body.encode("ascii"), hashlib.sha256).digest()
    sig = base64.urlsafe_b64encode(signature).decode("ascii").rstrip("=")
    return f"{body}.{sig}"


def verify_studio_token(token: str, secret: str = "pollex-studio-dev-secret") -> str | None:
    try:
        body, sig = token.split(".", 1)
        expected = hmac.new(secret.encode("utf-8"), body.encode("ascii"), hashlib.sha256).digest()
        expected_sig = base64.urlsafe_b64encode(expected).decode("ascii").rstrip("=")
        if not hmac.compare_digest(sig, expected_sig):
            return None
        padded = body + "=" * (-len(body) % 4)
        payload = json.loads(base64.urlsafe_b64decode(padded.encode("ascii")))
        if int(payload.get("exp", 0)) < int(time.time()):
            return None
        return str(payload.get("sub") or "")
    except Exception:
        return None
