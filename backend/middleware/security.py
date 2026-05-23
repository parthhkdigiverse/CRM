"""
Global defensive middleware for headers, request IDs, payload limits, and abuse throttling.
"""

import logging
from typing import Callable

from fastapi import Request, Response, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from config import settings
from middleware.rate_limiter import get_client_ip, global_limiter
from schemas.common import ErrorDetail, ErrorResponse
from utils.helpers import generate_request_id

logger = logging.getLogger(__name__)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Attach browser and transport hardening headers to every response."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "no-referrer")
        response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
        response.headers.setdefault("Cross-Origin-Resource-Policy", "same-site")
        response.headers.setdefault("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'")
        if settings.is_production:
            response.headers.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
        return response


class RequestSecurityMiddleware(BaseHTTPMiddleware):
    """Enforce request IDs, body limits, and a global per-client throttle."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        request_id = request.headers.get("X-Request-ID") or generate_request_id()
        request.state.request_id = request_id

        content_length = request.headers.get("content-length")
        try:
            if content_length and int(content_length) > settings.MAX_REQUEST_BODY_BYTES:
                return self._error(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "PAYLOAD_TOO_LARGE", request_id)
        except ValueError:
            return self._error(status.HTTP_400_BAD_REQUEST, "INVALID_CONTENT_LENGTH", request_id)

        client_ip = get_client_ip(request)
        key = f"global:{client_ip}"
        allowed = global_limiter.check(
            key,
            settings.GLOBAL_RATE_LIMIT_REQUESTS,
            settings.GLOBAL_RATE_LIMIT_WINDOW_SECONDS,
        )
        if not allowed:
            return self._error(status.HTTP_429_TOO_MANY_REQUESTS, "RATE_LIMIT_EXCEEDED", request_id)

        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response

    @staticmethod
    def _error(status_code: int, code: str, request_id: str) -> JSONResponse:
        body = ErrorResponse(
            success=False,
            request_id=request_id,
            error=ErrorDetail(code=code, message="Request rejected by security policy"),
        )
        return JSONResponse(status_code=status_code, content=body.model_dump())
