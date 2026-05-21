"""
Attendance document model — Check-in/check-out tracking for employees.
"""

from datetime import datetime, timezone
from typing import Optional

from beanie import Document, PydanticObjectId
from pydantic import Field


class Attendance(Document):
    """Attendance record for check-ins, check-outs, and active hours."""

    employee_id: PydanticObjectId
    date: str  # Format: YYYY-MM-DD
    check_in: Optional[datetime] = None
    check_out: Optional[datetime] = None
    status: str = "present"  # present, late, absent, on_leave

    # Base fields
    org_id: PydanticObjectId
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "attendance"
        indexes = [
            ("org_id", "date"),
            "employee_id",
        ]
