from datetime import datetime, timezone
from typing import Optional
from beanie import Document, PydanticObjectId
from pydantic import Field

class Overtime(Document):
    employee_id: str
    org_id: str
    date: datetime
    hours: float
    rate: float  # The hourly rate at the time of logging
    amount: float # hours * rate
    description: Optional[str] = None
    month: str  # e.g., "May 2026", used to match payroll
    created_by: PydanticObjectId
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "overtimes"
        indexes = [
            "org_id",
            "employee_id",
            "month"
        ]
