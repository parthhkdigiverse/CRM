"""
BlacklistedToken document model — invalidated JWTs.
"""

from datetime import datetime, timezone
from typing import Optional

from beanie import Document
from pydantic import Field
from beanie import PydanticObjectId


class BlacklistedToken(Document):
    """Blacklisted JWT identified by JTI — prevents reuse of revoked tokens."""

    jti: str
    expires_at: datetime

    # Base fields — no org_id needed for token blacklist
    org_id: Optional[PydanticObjectId] = None
    created_by: Optional[PydanticObjectId] = None
    updated_by: Optional[PydanticObjectId] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_deleted: bool = False
    deleted_at: Optional[datetime] = None
    deleted_by: Optional[PydanticObjectId] = None

    class Settings:
        name = "blacklisted_tokens"
        indexes = [
            "jti",
        ]
