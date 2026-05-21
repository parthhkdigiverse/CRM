"""
Token service — JWT access/refresh token generation, validation, and blacklisting.
"""

import logging
from uuid import uuid4
from datetime import datetime, timezone, timedelta
from typing import Tuple, Optional

from jose import jwt, JWTError

from config import settings
from models.blacklisted_token import BlacklistedToken

logger = logging.getLogger(__name__)


def create_access_token(
    user_id: str,
    email: str,
    role: str,
    org_id: Optional[str] = None,
) -> str:
    """Create a JWT access token with 30-minute expiry."""
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "org_id": org_id or "",
        "jti": str(uuid4()),
        "iat": now,
        "exp": now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        "type": "access",
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(user_id: str, remember_me: bool = False) -> Tuple[str, str]:
    """
    Create a JWT refresh token.
    Returns (token_string, jti).
    If remember_me, extends expiry to 30 days.
    """
    now = datetime.now(timezone.utc)
    jti = str(uuid4())
    days = 30 if remember_me else settings.REFRESH_TOKEN_EXPIRE_DAYS
    payload = {
        "sub": user_id,
        "jti": jti,
        "iat": now,
        "exp": now + timedelta(days=days),
        "type": "refresh",
    }
    token = jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return token, jti


def decode_access_token(token: str) -> dict:
    """
    Decode and validate an access token.
    Raises JWTError if invalid/expired.
    """
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        if payload.get("type") != "access":
            raise JWTError("Invalid token type")
        return payload
    except JWTError:
        raise


def decode_refresh_token(token: str) -> dict:
    """
    Decode and validate a refresh token.
    Raises JWTError if invalid/expired.
    """
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        if payload.get("type") != "refresh":
            raise JWTError("Invalid token type")
        return payload
    except JWTError:
        raise


async def blacklist_token(jti: str, expires_at: datetime) -> None:
    """Add a token JTI to the blacklist."""
    try:
        bl = BlacklistedToken(jti=jti, expires_at=expires_at)
        await bl.insert()
    except Exception as e:
        logger.error(f"Failed to blacklist token: {e}")


async def is_token_blacklisted(jti: str) -> bool:
    """Check if a token JTI is blacklisted."""
    try:
        token = await BlacklistedToken.find_one(BlacklistedToken.jti == jti)
        return token is not None
    except Exception:
        return False
