"""
Security-focused logging helpers.
"""

import logging
import re
from typing import Any


SENSITIVE_KEYS = {
    "authorization",
    "cookie",
    "password",
    "token",
    "access_token",
    "refresh_token",
    "jwt",
    "secret",
    "api_key",
    "otp",
}

TOKEN_RE = re.compile(r"Bearer\s+[A-Za-z0-9._~+/=-]+", re.IGNORECASE)


def redact(value: Any) -> Any:
    """Recursively redact secrets before logging or audit persistence."""
    if isinstance(value, dict):
        return {
            key: "***REDACTED***" if key.lower() in SENSITIVE_KEYS else redact(val)
            for key, val in value.items()
        }
    if isinstance(value, list):
        return [redact(item) for item in value]
    if isinstance(value, str):
        return TOKEN_RE.sub("Bearer ***REDACTED***", value)
    return value


class RedactingFilter(logging.Filter):
    """Logging filter that removes common secret material from log messages."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.msg = redact(str(record.msg))
        if record.args:
            record.args = tuple(redact(arg) for arg in record.args)
        return True


def configure_secure_logging(level: int = logging.INFO) -> None:
    """Install consistent secure logging for application and libraries."""
    logging.basicConfig(
        level=level,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )
    redactor = RedactingFilter()
    root = logging.getLogger()
    for handler in root.handlers:
        handler.addFilter(redactor)
