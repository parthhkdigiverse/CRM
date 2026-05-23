"""
Rate limiter — in-memory sliding window rate limiting.
"""

import time
import logging
from collections import defaultdict
from threading import RLock
from typing import Dict, List

from fastapi import Request, HTTPException, status
from config import settings

logger = logging.getLogger(__name__)


class RateLimiter:
    """In-memory sliding window rate limiter."""

    def __init__(self):
        self._requests: Dict[str, List[float]] = defaultdict(list)
        self._lock = RLock()

    def _cleanup(self, key: str, window_seconds: int) -> None:
        """Remove expired timestamps."""
        cutoff = time.time() - window_seconds
        self._requests[key] = [
            t for t in self._requests[key] if t > cutoff
        ]

    def check(self, key: str, max_requests: int, window_seconds: int) -> bool:
        """
        Check if a request is allowed.
        Returns True if allowed, False if rate limited.
        """
        with self._lock:
            self._cleanup(key, window_seconds)
            if len(self._requests[key]) >= max_requests:
                return False
            self._requests[key].append(time.time())
            return True

    def get_remaining(self, key: str, max_requests: int, window_seconds: int) -> int:
        """Get remaining requests in the current window."""
        with self._lock:
            self._cleanup(key, window_seconds)
            return max(0, max_requests - len(self._requests[key]))


# Global rate limiter instance
_limiter = RateLimiter()
global_limiter = RateLimiter()


def get_client_ip(request: Request) -> str:
    """Resolve the client IP while only honoring proxy headers from trusted proxies."""
    direct_ip = request.client.host if request.client else "unknown"
    trusted = {ip.strip() for ip in settings.TRUSTED_PROXY_IPS.split(",") if ip.strip()}
    if direct_ip in trusted:
        forwarded = request.headers.get("x-forwarded-for", "")
        if forwarded:
            return forwarded.split(",")[0].strip()
    return direct_ip


def rate_limit(max_requests: int = 100, window_seconds: int = 60):
    """
    FastAPI dependency for rate limiting.
    Usage: Depends(rate_limit(10, 60)) for 10 requests per 60 seconds.
    """
    async def dependency(request: Request):
        client_ip = get_client_ip(request)
        key = f"{client_ip}:{request.url.path}"

        if not _limiter.check(key, max_requests, window_seconds):
            remaining = _limiter.get_remaining(key, max_requests, window_seconds)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded. Try again later.",
                headers={
                    "X-RateLimit-Limit": str(max_requests),
                    "X-RateLimit-Remaining": str(remaining),
                    "X-RateLimit-Window": str(window_seconds),
                },
            )
    return dependency
