"""
Lightweight symmetric encryption for sensitive integration credentials at rest
(e.g. Meta access tokens / app secrets stored per organization).

Uses Fernet (AES-128-CBC + HMAC) from the `cryptography` package, which is already
a project dependency. The key is derived from settings.ENCRYPTION_KEY so no extra
key management is required.
"""

import base64
import hashlib
import logging
from typing import Optional

from cryptography.fernet import Fernet, InvalidToken

from config import settings

logger = logging.getLogger(__name__)


def _get_fernet() -> Fernet:
    """Derive a stable 32-byte urlsafe-base64 Fernet key from ENCRYPTION_KEY."""
    raw = (settings.ENCRYPTION_KEY or "").encode("utf-8")
    # Derive exactly 32 bytes regardless of the configured key length.
    digest = hashlib.sha256(raw).digest()
    key = base64.urlsafe_b64encode(digest)
    return Fernet(key)


def encrypt_secret(plaintext: Optional[str]) -> Optional[str]:
    """Encrypt a string. Returns None for empty/None input."""
    if not plaintext:
        return None
    try:
        token = _get_fernet().encrypt(plaintext.encode("utf-8"))
        return token.decode("utf-8")
    except Exception as e:  # pragma: no cover - defensive
        logger.error("Failed to encrypt secret: %s", e)
        raise


def decrypt_secret(ciphertext: Optional[str]) -> Optional[str]:
    """Decrypt a previously encrypted string. Returns None on failure/empty."""
    if not ciphertext:
        return None
    try:
        return _get_fernet().decrypt(ciphertext.encode("utf-8")).decode("utf-8")
    except (InvalidToken, Exception) as e:
        logger.error("Failed to decrypt secret: %s", type(e).__name__)
        return None


def mask_secret(value: Optional[str], visible: int = 4) -> str:
    """Return a masked representation for display: '••••••••cdef'."""
    if not value:
        return ""
    if len(value) <= visible:
        return "•" * len(value)
    return "•" * 8 + value[-visible:]
