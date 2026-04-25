from __future__ import annotations

import asyncio
import json
import urllib.error
import urllib.request
from dataclasses import dataclass
from typing import Any, Protocol

from app.core.config import get_settings


class LLMClient(Protocol):
    async def complete_json(self, payload: dict[str, Any]) -> dict[str, Any] | None:
        raise NotImplementedError


class DisabledLLMClient:
    async def complete_json(self, payload: dict[str, Any]) -> dict[str, Any] | None:
        return None


@dataclass(frozen=True)
class OpenAICompatibleLLMClient:
    api_key: str
    base_url: str
    model: str
    timeout_seconds: float

    async def complete_json(self, payload: dict[str, Any]) -> dict[str, Any] | None:
        body = {
            "model": self.model,
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You propose safe UI adaptations for Pollex Tactus. "
                        "Return JSON only with keys: adaptations, confidence, reason. "
                        "Use only allowed fields. Never emit HTML, CSS, secrets, or layout changes."
                    ),
                },
                {"role": "user", "content": json.dumps(payload, ensure_ascii=False, sort_keys=True)},
            ],
            "response_format": {"type": "json_object"},
        }
        headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}
        result = await _post_json(f"{self.base_url}/chat/completions", body, headers, self.timeout_seconds)
        try:
            content = result["choices"][0]["message"]["content"]
            parsed = json.loads(content)
            return parsed if isinstance(parsed, dict) else None
        except (KeyError, IndexError, TypeError, json.JSONDecodeError):
            return None


@dataclass(frozen=True)
class OllamaLLMClient:
    base_url: str
    model: str
    timeout_seconds: float

    async def complete_json(self, payload: dict[str, Any]) -> dict[str, Any] | None:
        body = {
            "model": self.model,
            "stream": False,
            "format": "json",
            "prompt": (
                "Return JSON only with keys adaptations, confidence, reason. "
                "Use only allowed Pollex UI adaptation fields.\n"
                f"{json.dumps(payload, ensure_ascii=False, sort_keys=True)}"
            ),
        }
        result = await _post_json(f"{self.base_url}/api/generate", body, {"Content-Type": "application/json"}, self.timeout_seconds)
        try:
            parsed = json.loads(result.get("response", "{}"))
            return parsed if isinstance(parsed, dict) else None
        except json.JSONDecodeError:
            return None


def build_llm_client() -> LLMClient:
    settings = get_settings()
    if settings.tactus_llm_provider == "openai" and settings.openai_api_key:
        return OpenAICompatibleLLMClient(
            api_key=settings.openai_api_key,
            base_url=settings.openai_base_url,
            model=settings.tactus_llm_model,
            timeout_seconds=settings.tactus_llm_timeout_seconds,
        )
    if settings.tactus_llm_provider == "ollama":
        return OllamaLLMClient(
            base_url=settings.ollama_base_url,
            model=settings.tactus_llm_model,
            timeout_seconds=settings.tactus_llm_timeout_seconds,
        )
    return DisabledLLMClient()


async def _post_json(url: str, body: dict[str, Any], headers: dict[str, str], timeout_seconds: float) -> dict[str, Any]:
    def send() -> dict[str, Any]:
        data = json.dumps(body).encode("utf-8")
        request = urllib.request.Request(url, data=data, headers=headers, method="POST")
        try:
            with urllib.request.urlopen(request, timeout=timeout_seconds) as response:
                return json.loads(response.read().decode("utf-8"))
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError):
            return {}

    return await asyncio.to_thread(send)
