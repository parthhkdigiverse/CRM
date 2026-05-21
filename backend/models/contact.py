"""
Contact document model — CRM contacts with custom fields and tags.
"""

from datetime import datetime, timezone
from typing import Optional, Dict, List

from beanie import Document
from pydantic import EmailStr, Field
from beanie import PydanticObjectId


class Contact(Document):
    """Contact record linked to companies, deals, and activities."""

    first_name: str
    last_name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    company_id: Optional[PydanticObjectId] = None
    job_title: Optional[str] = None
    lead_source: Optional[str] = None
    status: str = "active"  # active, inactive, archived
    assigned_to: Optional[PydanticObjectId] = None
    tags: List[str] = Field(default_factory=list)
    notes: Optional[str] = None
    custom_fields: Dict = Field(default_factory=dict)

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
        name = "contacts"
        indexes = [
            "org_id",
            "email",
            "assigned_to",
        ]

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"
