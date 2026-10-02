"""In-memory token-bucket rate limiter middleware (per client IP)."""
from __future__ import annotations

import threading
import time

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, per_minute: int) -> None:
        super().__init__(app)
        self.capacity = float(per_minute)
        self.rate = per_minute / 60.0
        self.buckets: dict[str, tuple[float, float]] = {}
        self.lock = threading.Lock()

    async def dispatch(self, request, call_next):
        if self.capacity <= 0 or request.url.path.startswith("/health"):
            return await call_next(request)
        key = request.client.host if request.client else "unknown"
        now = time.monotonic()
        with self.lock:
            tokens, last = self.buckets.get(key, (self.capacity, now))
            tokens = min(self.capacity, tokens + (now - last) * self.rate)
            allowed = tokens >= 1
            self.buckets[key] = (tokens - 1 if allowed else tokens, now)
        if not allowed:
            return JSONResponse({"detail": "Rate limit exceeded"}, status_code=429, headers={"Retry-After": "1"})
        return await call_next(request)
