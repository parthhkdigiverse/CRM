"""
Meeting/Event document model — Track scheduled team meetings and events.
"""

from datetime import datetime, timezone
from typing import Optional, List

from beanie import Document, PydanticObjectId
from pydantic import Field


class Meeting(Document):
    """Meeting document representing online or in-person team events."""

    title: str
    description: Optional[str] = None
    meeting_type: str = "online"  # online, in_person
    start_time: datetime
    duration_minutes: int = 30  # e.g., 30, 45, 60
    location: Optional[str] = None  # Google Meet, Conference Room A
    attendee_ids: List[PydanticObjectId] = Field(default_factory=list)

    # Base fields
    org_id: PydanticObjectId
    created_by: PydanticObjectId
    updated_by: Optional[PydanticObjectId] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_deleted: bool = False

    class Settings:
        name = "meetings"
        indexes = [
            "org_id",
            "start_time",
        ]
