"""
User profile schemas.
"""

from typing import Optional

from pydantic import BaseModel


class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    timezone: Optional[str] = None


class UserResponse(BaseModel):
    id: str
    email: str
    first_name: str
    last_name: str
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    timezone: str
    role: str
    org_id: Optional[str] = None
    is_active: bool
    is_email_verified: bool = False
    auth_provider: str = "local"
