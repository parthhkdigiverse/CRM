"""
Employee document model — HR records with encrypted salary.
"""

from datetime import datetime, timezone
from typing import Optional

from beanie import Document
from pydantic import EmailStr, Field
from beanie import PydanticObjectId


class Employee(Document):
    """Employee/HR record with encrypted salary and department assignment."""

    user_id: Optional[PydanticObjectId] = None
    name: str
    email: EmailStr
    phone: Optional[str] = None
    role: Optional[str] = None
    department: Optional[str] = None
    join_date: Optional[datetime] = None
    salary_encrypted: Optional[str] = None  # Encrypted via Fernet
    overtime_rate: float = 0.0
    status: str = "active"  # active, inactive
    reporting_to: Optional[PydanticObjectId] = None
    avatar_url: Optional[str] = None
    address: Optional[str] = None
    skills: Optional[str] = None
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
        name = "employees"
        indexes = [
            "org_id",
            "department",
        ]
