"""
User document model — accounts, authentication, sessions.
"""

from datetime import datetime, timezone
from typing import Optional, Dict, List

from beanie import Document, Indexed
from pydantic import EmailStr, Field
from beanie import PydanticObjectId


class User(Document):
    """User account with authentication and profile data."""

    email: Indexed(EmailStr, unique=True)
    hashed_password: Optional[str] = None  # None for OAuth-only users
    first_name: str = ""
    last_name: str = ""
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    timezone: str = "UTC"
    role: str = "employee"  # super_admin, admin, hr, employee
    org_id: Optional[PydanticObjectId] = None  # Nullable until org is set up
    is_active: bool = True
    is_email_verified: bool = False
    email_verification_otp: Optional[str] = None
    otp_expires_at: Optional[datetime] = None
    auth_provider: str = "local"  # local, google
    password_history: List[str] = Field(default_factory=list)  # Last 5 hashed passwords
    failed_login_attempts: int = 0
    locked_until: Optional[datetime] = None
    notification_preferences: Dict = Field(default_factory=dict)

    # Base fields — created_by is Optional because user creates themselves
    created_by: Optional[PydanticObjectId] = None
    updated_by: Optional[PydanticObjectId] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_deleted: bool = False
    deleted_at: Optional[datetime] = None
    deleted_by: Optional[PydanticObjectId] = None

    class Settings:
        name = "users"
        indexes = [
            "email",
            "org_id",
        ]

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"
