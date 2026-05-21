"""
Security utilities — password hashing, encryption, sanitization, OTP generation.
"""

import re
import random
import string
import base64
import hashlib
from typing import Tuple

import bleach
import bcrypt

from cryptography.fernet import Fernet

from config import settings

# Derive a Fernet key from JWT_SECRET_KEY (must be 32 url-safe base64-encoded bytes)
_raw_key = hashlib.sha256(settings.JWT_SECRET_KEY.encode()).digest()
_fernet_key = base64.urlsafe_b64encode(_raw_key)
_fernet = Fernet(_fernet_key)


def hash_password(password: str) -> str:
    """Hash a password using raw bcrypt."""
    if len(password.encode()) > 72:
        password = password.encode()[:72].decode('utf-8', 'ignore')
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password.encode(), salt)
    return hashed.decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against a bcrypt hash."""
    if len(plain_password.encode()) > 72:
        plain_password = plain_password.encode()[:72].decode('utf-8', 'ignore')
    try:
        return bcrypt.checkpw(plain_password.encode(), hashed_password.encode())
    except Exception:
        return False


def encrypt_field(value: str) -> str:
    """Encrypt a string field using Fernet symmetric encryption."""
    if not value:
        return ""
    return _fernet.encrypt(value.encode()).decode()


def decrypt_field(encrypted_value: str) -> str:
    """Decrypt a Fernet-encrypted string field."""
    if not encrypted_value:
        return ""
    try:
        return _fernet.decrypt(encrypted_value.encode()).decode()
    except Exception:
        return ""


def sanitize_html(text: str) -> str:
    """Strip all HTML/script tags from input text."""
    if not text:
        return text
    return bleach.clean(text, tags=[], attributes={}, strip=True).strip()


def generate_otp() -> str:
    """Generate a 6-digit random OTP."""
    return "".join(random.choices(string.digits, k=6))


def validate_password_strength(password: str) -> Tuple[bool, str]:
    """
    Validate password meets minimum strength requirements:
    - At least 8 characters
    - At least 1 uppercase letter
    - At least 1 lowercase letter
    - At least 1 digit
    - At least 1 special character
    Returns (is_valid, error_message).
    """
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter"
    if not re.search(r"[a-z]", password):
        return False, "Password must contain at least one lowercase letter"
    if not re.search(r"\d", password):
        return False, "Password must contain at least one digit"
    if not re.search(r"[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>\/?`~]", password):
        return False, "Password must contain at least one special character"
    return True, ""
