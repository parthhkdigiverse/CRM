"""
Company document model — business entities linked to contacts and deals.
"""

from datetime import datetime, timezone
from typing import Optional, Dict, List

from beanie import Document
from pydantic import EmailStr, Field
from beanie import PydanticObjectId


class Company(Document):
    """Company record with linked contacts, deals, and invoices."""

    name: str
    industry: Optional[str] = None
    size: Optional[str] = None
    website: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[Dict] = None  # {street, city, state, country, zip}
    annual_revenue: Optional[float] = None
    assigned_to: Optional[PydanticObjectId] = None
    tags: List[str] = Field(default_factory=list)
    notes: Optional[str] = None

    # Base fields
    org_id: PydanticObjectId
    created_by: PydanticObjectId
    updated_by: Optional[PydanticObjectId] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_deleted: bool = False
    deleted_at: Optional[datetime] = None
    deleted_by: Optional[PydanticObjectId] = None

    class Settings:
        name = "companies"
        indexes = [
            "org_id",
            "name",
        ]
