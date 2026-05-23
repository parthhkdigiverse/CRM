"""
Auth service — registration, login, password management, session management.
"""

import logging
from datetime import datetime, timezone, timedelta
from typing import Tuple, List, Optional

from beanie import PydanticObjectId
import hashlib
from jose import JWTError

from config import settings
from models.user import User
from models.refresh_token import RefreshToken
from schemas.auth import RegisterRequest
from services.token_service import (
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
    blacklist_token,
)
from services.email_service import send_verification_email, send_password_reset_email
from utils.security import (
    hash_password,
    verify_password,
    generate_otp,
    validate_password_strength,
)
from utils.helpers import utc_now

logger = logging.getLogger(__name__)


async def register_user(data: RegisterRequest) -> User:
    """Register a new user with email verification."""
    # Validate password strength
    is_valid, error_msg = validate_password_strength(data.password)
    if not is_valid:
        raise ValueError(error_msg)

    # Check duplicate email
    existing = await User.find_one(User.email == data.email.lower())
    if existing:
        raise ValueError("An account with this email already exists")

    # Hash password
    hashed = hash_password(data.password)

    # Generate OTP for email verification
    otp = generate_otp()

    user = User(
        email=data.email.lower(),
        hashed_password=hashed,
        first_name=data.first_name,
        last_name=data.last_name,
        auth_provider="local",
        email_verification_otp=otp,
        otp_expires_at=utc_now() + timedelta(minutes=15),
        password_history=[hashed],
        role="employee",  # Default role; promoted to admin when creating an org
    )
    await user.insert()

    # Send verification email (non-blocking, skip if no key)
    try:
        await send_verification_email(user.email, otp)
    except Exception as e:
        logger.warning(f"Could not send verification email: {e}")

    return user


async def verify_email(email: str, otp: str) -> bool:
    """Verify a user's email using OTP."""
    user = await User.find_one(User.email == email.lower())
    if not user:
        raise ValueError("User not found")

    if user.is_email_verified:
        return True

    if not user.email_verification_otp or user.email_verification_otp != otp:
        raise ValueError("Invalid OTP")

    if user.otp_expires_at and user.otp_expires_at < utc_now():
        raise ValueError("OTP has expired")

    user.is_email_verified = True
    user.email_verification_otp = None
    user.otp_expires_at = None
    user.updated_at = utc_now()
    await user.save()
    return True


async def login_user(
    email: str,
    password: str,
    remember_me: bool,
    ip: str,
    user_agent: str,
) -> Tuple[User, str, str]:
    """
    Authenticate user with email/password.
    Returns (user, access_token, refresh_token).
    Raises ValueError on failure.
    """
    user = await User.find_one(User.email == email.lower())
    if not user:
        raise ValueError("Invalid email or password")

    if not user.is_active:
        raise ValueError("Account is deactivated. Contact your administrator.")

    # Check lockout
    if user.locked_until and user.locked_until > utc_now():
        remaining = (user.locked_until - utc_now()).seconds // 60
        raise ValueError(f"Account is locked. Try again in {remaining + 1} minutes.")

    # Verify password
    if not user.hashed_password or not verify_password(password, user.hashed_password):
        user.failed_login_attempts += 1
        if user.failed_login_attempts >= 5:
            user.locked_until = utc_now() + timedelta(minutes=15)
            user.failed_login_attempts = 0
            await user.save()
            raise ValueError("Account locked due to too many failed attempts. Try again in 15 minutes.")
        await user.save()
        raise ValueError("Invalid email or password")

    # Reset failed attempts on success
    user.failed_login_attempts = 0
    user.locked_until = None
    user.updated_at = utc_now()
    await user.save()

    # Generate tokens
    org_id = str(user.org_id) if user.org_id else ""
    access_token = create_access_token(str(user.id), user.email, user.role, org_id)
    refresh_token_str, jti = create_refresh_token(str(user.id), remember_me)

    # Store refresh token (use SHA256 instead of bcrypt since JWT exceeds bcrypt 72-byte limit)
    rt = RefreshToken(
        user_id=user.id,
        token_hash=hashlib.sha256(refresh_token_str.encode()).hexdigest(),
        jti=jti,
        device_info=user_agent[:100] if user_agent else None,
        ip_address=ip,
        user_agent=user_agent[:255] if user_agent else None,
        expires_at=utc_now() + timedelta(days=30 if remember_me else settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )
    await rt.insert()

    return user, access_token, refresh_token_str


async def refresh_access_token(
    refresh_token: str, ip: str, user_agent: str
) -> Tuple[str, str]:
    """
    Validate and rotate refresh token.
    Returns (new_access_token, new_refresh_token).
    """
    try:
        payload = decode_refresh_token(refresh_token)
    except JWTError:
        raise ValueError("Invalid or expired refresh token")

    user_id = payload.get("sub")
    jti = payload.get("jti")

    if not user_id or not jti:
        raise ValueError("Invalid refresh token")

    # Find the stored refresh token
    stored_rt = await RefreshToken.find_one(
        RefreshToken.jti == jti,
        RefreshToken.is_revoked == False,
    )
    if not stored_rt:
        raise ValueError("Refresh token not found or already revoked")

    # Revoke old token
    stored_rt.is_revoked = True
    stored_rt.updated_at = utc_now()
    await stored_rt.save()

    # Get user
    user = await User.get(PydanticObjectId(user_id))
    if not user or not user.is_active:
        raise ValueError("User not found or deactivated")

    # Generate new tokens
    org_id = str(user.org_id) if user.org_id else ""
    new_access = create_access_token(str(user.id), user.email, user.role, org_id)
    new_refresh, new_jti = create_refresh_token(str(user.id))

    # Store new refresh token
    new_rt = RefreshToken(
        user_id=user.id,
        token_hash=hashlib.sha256(new_refresh.encode()).hexdigest(),
        jti=new_jti,
        device_info=user_agent[:100] if user_agent else None,
        ip_address=ip,
        user_agent=user_agent[:255] if user_agent else None,
        expires_at=utc_now() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )
    await new_rt.insert()

    return new_access, new_refresh


async def logout_user(refresh_token: str) -> None:
    """Revoke a refresh token and blacklist it."""
    try:
        payload = decode_refresh_token(refresh_token)
        jti = payload.get("jti")
        exp = payload.get("exp")

        if jti:
            # Revoke in DB
            stored = await RefreshToken.find_one(RefreshToken.jti == jti)
            if stored:
                stored.is_revoked = True
                stored.updated_at = utc_now()
                await stored.save()

            # Blacklist
            exp_dt = datetime.fromtimestamp(exp, tz=timezone.utc) if exp else utc_now() + timedelta(days=7)
            await blacklist_token(jti, exp_dt)
    except JWTError:
        pass  # Token already invalid, nothing to do


async def forgot_password(email: str) -> None:
    """Send a password reset email with a 1-hour token."""
    user = await User.find_one(User.email == email.lower())
    if not user:
        return  # Don't reveal whether email exists

    from jose import jwt as jose_jwt
    token_payload = {
        "sub": str(user.id),
        "type": "password_reset",
        "iss": settings.JWT_ISSUER,
        "aud": settings.JWT_AUDIENCE,
        "iat": utc_now(),
        "exp": utc_now() + timedelta(hours=1),
    }
    reset_token = jose_jwt.encode(
        token_payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM
    )

    reset_link = f"{settings.FRONTEND_URL}/reset-password?token={reset_token}"
    try:
        await send_password_reset_email(user.email, reset_link)
    except Exception as e:
        logger.warning(f"Could not send password reset email: {e}")


async def reset_password(token: str, new_password: str) -> None:
    """Reset password using a valid reset token."""
    from jose import jwt as jose_jwt

    try:
        payload = jose_jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
            issuer=settings.JWT_ISSUER,
            audience=settings.JWT_AUDIENCE,
            options={"require_exp": True, "require_iat": True, "require_sub": True},
        )
    except JWTError:
        raise ValueError("Invalid or expired reset token")

    if payload.get("type") != "password_reset":
        raise ValueError("Invalid token type")

    user_id = payload.get("sub")
    user = await User.get(PydanticObjectId(user_id))
    if not user:
        raise ValueError("User not found")

    # Validate password strength
    is_valid, error_msg = validate_password_strength(new_password)
    if not is_valid:
        raise ValueError(error_msg)

    # Check password history
    new_hash = hash_password(new_password)
    for old_hash in user.password_history[-5:]:
        if verify_password(new_password, old_hash):
            raise ValueError("Cannot reuse any of your last 5 passwords")

    user.hashed_password = new_hash
    user.password_history.append(new_hash)
    if len(user.password_history) > 5:
        user.password_history = user.password_history[-5:]
    user.updated_at = utc_now()
    await user.save()


async def change_password(user_id: str, current_password: str, new_password: str) -> None:
    """Change password for an authenticated user."""
    user = await User.get(PydanticObjectId(user_id))
    if not user:
        raise ValueError("User not found")

    if not verify_password(current_password, user.hashed_password):
        raise ValueError("Current password is incorrect")

    is_valid, error_msg = validate_password_strength(new_password)
    if not is_valid:
        raise ValueError(error_msg)

    # Check history
    for old_hash in user.password_history[-5:]:
        if verify_password(new_password, old_hash):
            raise ValueError("Cannot reuse any of your last 5 passwords")

    new_hash = hash_password(new_password)
    user.hashed_password = new_hash
    user.password_history.append(new_hash)
    if len(user.password_history) > 5:
        user.password_history = user.password_history[-5:]
    user.updated_at = utc_now()
    await user.save()


async def get_user_sessions(user_id: str) -> List[dict]:
    """Get all active (non-revoked) sessions for a user."""
    tokens = await RefreshToken.find(
        RefreshToken.user_id == PydanticObjectId(user_id),
        RefreshToken.is_revoked == False,
        RefreshToken.expires_at > utc_now(),
    ).to_list()
    return [
        {
            "id": str(t.id),
            "device_info": t.device_info,
            "ip_address": t.ip_address,
            "created_at": t.created_at.isoformat() if t.created_at else None,
            "expires_at": t.expires_at.isoformat() if t.expires_at else None,
        }
        for t in tokens
    ]


async def revoke_session(user_id: str, session_id: str) -> None:
    """Revoke a specific session (refresh token)."""
    token = await RefreshToken.get(PydanticObjectId(session_id))
    if not token or str(token.user_id) != user_id:
        raise ValueError("Session not found")
    token.is_revoked = True
    token.updated_at = utc_now()
    await token.save()
    await blacklist_token(token.jti, token.expires_at)
