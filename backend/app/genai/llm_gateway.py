"""LLM gateway: one interface, pluggable providers, built for failure.

- Provider "gemini": Gemini Interactions API, stateless structured JSON output.
- Provider "anthropic": Claude via the official Anthropic SDK, bounded timeout,
  SDK retries, structured output and server-side refusal fallback.
- Provider "none": always unavailable -> callers use deterministic templates.
- Circuit breaker: after 3 consecutive failures the provider is skipped for 60 s,
  so a provider outage never slows the analyst console.

The LLM never makes risk decisions; it only narrates evidence (plan section 8).
"""
from __future__ import annotations

import json
import logging
import threading
import time
import urllib.error
import urllib.request

from app.core.config import Settings
from app.core.metrics import metrics

logger = logging.getLogger(__name__)

FAILURE_THRESHOLD = 3
OPEN_SECONDS = 60.0


class LLMUnavailable(RuntimeError):
    pass


class CircuitBreaker:
    def __init__(self) -> None:
        self.failures = 0
        self.opened_at: float | None = None
        self.lock = threading.Lock()

    def allow(self) -> bool:
        with self.lock:
            if self.opened_at is None:
                return True
            if time.time() - self.opened_at > OPEN_SECONDS:
                self.opened_at = None  # half-open: let one request through
                self.failures = FAILURE_THRESHOLD - 1
                return True
            return False

    def success(self) -> None:
        with self.lock:
            self.failures = 0
            self.opened_at = None

    def failure(self) -> None:
        with self.lock:
            self.failures += 1
            if self.failures >= FAILURE_THRESHOLD:
                self.opened_at = time.time()

    @property
    def state(self) -> str:
        return "open" if self.opened_at else "closed"


class LLMGateway:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.provider = settings.resolved_llm_provider
        self.model = settings.gemini_model if self.provider == "gemini" else settings.llm_model
        self.breaker = CircuitBreaker()
        self._client = None

    @property
    def available(self) -> bool:
        return self.provider != "none" and self.breaker.allow()

    def status(self) -> dict:
        return {"provider": self.provider, "model": self.model if self.provider != "none" else None,
                "circuit": self.breaker.state}

    def _anthropic(self):
        if self._client is None:
            import anthropic

            kwargs = {"timeout": self.settings.llm_timeout_seconds, "max_retries": 2}
            if self.settings.anthropic_api_key:
                kwargs["api_key"] = self.settings.anthropic_api_key
            self._client = anthropic.Anthropic(**kwargs)
        return self._client

    def generate_json(self, system: str, user: str, schema: dict, max_tokens: int = 4000) -> dict:
        """Return a dict matching `schema`, or raise LLMUnavailable."""
        if self.provider == "none":
            raise LLMUnavailable("no LLM provider configured")
        if not self.breaker.allow():
            raise LLMUnavailable("circuit open")
        started = time.perf_counter()
        try:
            if self.provider == "anthropic":
                data = self._call_anthropic(system, user, schema, max_tokens)
            elif self.provider == "gemini":
                data = self._call_gemini(system, user, schema, max_tokens)
            else:
                raise LLMUnavailable(f"unsupported provider {self.provider}")
        except LLMUnavailable:
            self.breaker.failure()
            metrics.inc("llm_failures_total", provider=self.provider)
            raise
        except Exception as exc:
            self.breaker.failure()
            metrics.inc("llm_failures_total", provider=self.provider)
            logger.warning("LLM call failed: %s", exc)
            raise LLMUnavailable(str(exc)) from exc
        self.breaker.success()
        metrics.observe_ms("llm_latency_ms", (time.perf_counter() - started) * 1000)
        metrics.inc("llm_calls_total", provider=self.provider)
        return data

    def _call_gemini(self, system: str, user: str, schema: dict, max_tokens: int) -> dict:
        if not self.settings.gemini_api_key:
            raise LLMUnavailable("GEMINI_API_KEY is not configured")
        body = json.dumps({
            "model": self.model,
            "input": user,
            "system_instruction": system,
            "generation_config": {"max_output_tokens": max_tokens},
            "response_format": {"type": "text", "mime_type": "application/json", "schema": schema},
            "store": False,
        }).encode()
        request = urllib.request.Request(
            "https://generativelanguage.googleapis.com/v1beta/interactions",
            data=body,
            headers={"Content-Type": "application/json", "x-goog-api-key": self.settings.gemini_api_key},
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=self.settings.llm_timeout_seconds) as response:
                result = json.loads(response.read())
        except urllib.error.HTTPError as exc:
            if exc.code == 429:
                raise LLMUnavailable("Gemini rate limit reached") from exc
            raise LLMUnavailable(f"Gemini API error: HTTP {exc.code}") from exc
        except (urllib.error.URLError, TimeoutError) as exc:
            raise LLMUnavailable(f"Gemini connection error: {exc}") from exc

        text = result.get("output_text")
        if not text:
            text = next(
                (part.get("text") for step in result.get("steps", []) if step.get("type") == "model_output"
                 for part in step.get("content", []) if part.get("type") == "text"),
                None,
            )
        if not text:
            raise LLMUnavailable("Gemini returned an empty response")
        return json.loads(text)

    def _call_anthropic(self, system: str, user: str, schema: dict, max_tokens: int) -> dict:
        import anthropic

        client = self._anthropic()
        try:
            resp = client.beta.messages.create(
                model=self.model,
                max_tokens=max_tokens,
                system=system,
                messages=[{"role": "user", "content": user}],
                output_config={"effort": self.settings.llm_effort, "format": {"type": "json_schema", "schema": schema}},
                # Server-side fallback: if a safety classifier declines, the API retries on
                # Anthropic's recommended fallback model inside the same call.
                betas=["server-side-fallback-2026-07-01"],
                fallbacks="default",
            )
        except anthropic.RateLimitError as exc:
            raise LLMUnavailable(f"rate limited: {exc.message}") from exc
        except anthropic.APIStatusError as exc:
            raise LLMUnavailable(f"API error {exc.status_code}: {exc.message}") from exc
        except anthropic.APIConnectionError as exc:
            raise LLMUnavailable(f"connection error: {exc}") from exc

        if resp.stop_reason == "refusal":
            raise LLMUnavailable("model declined the request")
        if resp.stop_reason == "max_tokens":
            raise LLMUnavailable("response truncated (max_tokens)")
        text = next((b.text for b in resp.content if b.type == "text"), None)
        if not text:
            raise LLMUnavailable("empty response")
        return json.loads(text)
