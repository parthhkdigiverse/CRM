"""
Organization document model — multi-tenant org profiles and settings.
"""

from datetime import datetime, timezone
from typing import Optional, Dict

from beanie import Document
from pydantic import Field
from beanie import PydanticObjectId


class Organization(Document):
    """Organization profile with settings and invite management."""

    name: str
    industry: Optional[str] = None
    size: Optional[str] = None  # e.g., "1-10", "11-50", "51-200", "201-500", "500+"
    logo_url: Optional[str] = None
    website: Optional[str] = None
    address: Optional[Dict] = None  # {street, city, state, country, zip}
    tax_id: Optional[str] = None
    currency: str = "INR"
    timezone: str = "Asia/Kolkata"
    invite_token: Optional[str] = None
    invite_token_expires: Optional[datetime] = None
    settings: Dict = Field(default_factory=lambda: {
        "pipeline_stages": [
            "prospecting", "qualification", "proposal",
            "negotiation", "closed_won", "closed_lost"
        ],
        "custom_fields": {},
        "departments": [],
    })

    # Base fields — org_id is Optional (org doesn't belong to another org)
    org_id: Optional[PydanticObjectId] = None
    created_by: Optional[PydanticObjectId] = None
    updated_by: Optional[PydanticObjectId] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_deleted: bool = False
    deleted_at: Optional[datetime] = None
    deleted_by: Optional[PydanticObjectId] = None

    class Settings:
        name = "organizations"
