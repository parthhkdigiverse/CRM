"""
Leave document model — Tracks employee leave requests.
"""

from datetime import datetime, timezone
from typing import Optional

from beanie import Document, PydanticObjectId
from pydantic import Field


class Leave(Document):
    """Leave record for employee time-off requests."""

    employee_id: PydanticObjectId
    leave_type: str  # sick, casual, unpaid
    duration_type: str = "multiple_days" # full_day, first_half, second_half, multiple_days
    start_date: str  # Format: YYYY-MM-DD
    end_date: str    # Format: YYYY-MM-DD
    reason: str
    status: str = "pending"  # pending, approved, rejected
    approver_id: Optional[PydanticObjectId] = None
    approver_notes: Optional[str] = None

    # Base fields
    org_id: PydanticObjectId
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "leaves"
        indexes = [
            ("org_id", "status"),
            "employee_id",
        ]
