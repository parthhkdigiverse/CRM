"""
RefreshToken document model — active refresh tokens with device info.
"""

from datetime import datetime, timezone
from typing import Optional

from beanie import Document
from pydantic import Field
from beanie import PydanticObjectId


class RefreshToken(Document):
    """Active refresh token with device fingerprint tracking."""

    user_id: PydanticObjectId
    token_hash: str
    jti: str  # JWT ID for blacklisting
    device_info: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    expires_at: datetime
    is_revoked: bool = False

    # Base fields — no org_id needed for tokens
    org_id: Optional[PydanticObjectId] = None
    created_by: Optional[PydanticObjectId] = None
    updated_by: Optional[PydanticObjectId] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_deleted: bool = False
    deleted_at: Optional[datetime] = None
    deleted_by: Optional[PydanticObjectId] = None

    class Settings:
        name = "refresh_tokens"
        indexes = [
            "user_id",
            "jti",
        ]
