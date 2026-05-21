"""
Rate limiter — in-memory sliding window rate limiting.
"""

import time
import logging
from collections import defaultdict
from typing import Dict, List

from fastapi import Request, HTTPException, status

logger = logging.getLogger(__name__)


class RateLimiter:
    """In-memory sliding window rate limiter."""

    def __init__(self):
        self._requests: Dict[str, List[float]] = defaultdict(list)

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
        self._cleanup(key, window_seconds)
        if len(self._requests[key]) >= max_requests:
            return False
        self._requests[key].append(time.time())
        return True

    def get_remaining(self, key: str, max_requests: int, window_seconds: int) -> int:
        """Get remaining requests in the current window."""
        self._cleanup(key, window_seconds)
        return max(0, max_requests - len(self._requests[key]))


# Global rate limiter instance
_limiter = RateLimiter()


def rate_limit(max_requests: int = 100, window_seconds: int = 60):
    """
    FastAPI dependency for rate limiting.
    Usage: Depends(rate_limit(10, 60)) for 10 requests per 60 seconds.
    """
    async def dependency(request: Request):
        client_ip = request.client.host if request.client else "unknown"
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
