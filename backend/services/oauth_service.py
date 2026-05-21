"""
Google OAuth2 service — authorization URL, callback handling, user creation.
"""

import logging
from typing import Tuple

import httpx

from config import settings
from models.user import User
from services.token_service import create_access_token, create_refresh_token
import hashlib
from utils.security import hash_password
from utils.helpers import utc_now
from models.refresh_token import RefreshToken
from datetime import timedelta

logger = logging.getLogger(__name__)

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"


def get_google_auth_url() -> str:
    """Construct Google OAuth2 authorization URL."""
    if not settings.GOOGLE_CLIENT_ID:
        raise ValueError("Google OAuth is not configured. Set GOOGLE_CLIENT_ID.")
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "consent",
    }
    query = "&".join(f"{k}={v}" for k, v in params.items())
    return f"{GOOGLE_AUTH_URL}?{query}"


async def handle_google_callback(code: str) -> Tuple[User, str, str]:
    """
    Exchange authorization code for tokens, get user profile,
    create or find user, return (user, access_token, refresh_token).
    Google tokens are never stored.
    """
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise ValueError("Google OAuth is not configured")

    async with httpx.AsyncClient() as client:
        # Exchange code for tokens
        token_response = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": settings.GOOGLE_REDIRECT_URI,
                "grant_type": "authorization_code",
            },
        )
        if token_response.status_code != 200:
            raise ValueError("Failed to exchange authorization code")

        token_data = token_response.json()
        google_access_token = token_data.get("access_token")

        if not google_access_token:
            raise ValueError("No access token received from Google")

        # Get user profile
        userinfo_response = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {google_access_token}"},
        )
        if userinfo_response.status_code != 200:
            raise ValueError("Failed to get user profile from Google")

        profile = userinfo_response.json()

    email = profile.get("email", "").lower()
    if not email:
        raise ValueError("No email received from Google")

    # Find or create user
    user = await User.find_one(User.email == email)
    if not user:
        user = User(
            email=email,
            first_name=profile.get("given_name", ""),
            last_name=profile.get("family_name", ""),
            avatar_url=profile.get("picture"),
            auth_provider="google",
            is_email_verified=True,  # Google emails are already verified
            role="employee",
        )
        await user.insert()
    elif user.auth_provider == "local" and not user.is_email_verified:
        # If user exists with local auth, verify their email
        user.is_email_verified = True
        user.updated_at = utc_now()
        await user.save()

    # Generate JWT tokens
    org_id = str(user.org_id) if user.org_id else ""
    access_token = create_access_token(str(user.id), user.email, user.role, org_id)
    refresh_token_str, jti = create_refresh_token(str(user.id))

    # Store refresh token
    rt = RefreshToken(
        user_id=user.id,
        token_hash=hashlib.sha256(refresh_token_str.encode()).hexdigest(),
        jti=jti,
        device_info="Google OAuth",
        expires_at=utc_now() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )
    await rt.insert()

    return user, access_token, refresh_token_str
