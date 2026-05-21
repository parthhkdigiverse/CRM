"""
Meeting request/response validation schemas.
"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


class MeetingCreate(BaseModel):
    title: str
    description: Optional[str] = None
    meeting_type: str = "online"
    start_time: datetime
    duration_minutes: int = 30
    location: Optional[str] = None
    attendee_ids: List[str] = []


class MeetingUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    meeting_type: Optional[str] = None
    start_time: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    location: Optional[str] = None
    attendee_ids: Optional[List[str]] = None
