"""
Attendance request/response schemas.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class AttendanceCheckIn(BaseModel):
    employee_id: Optional[str] = None  # Optional, defaults to current user's employee ID


class AttendanceCheckOut(BaseModel):
    employee_id: Optional[str] = None  # Optional, defaults to current user's employee ID


class AttendanceBreakIn(BaseModel):
    employee_id: Optional[str] = None


class AttendanceBreakOut(BaseModel):
    employee_id: Optional[str] = None


class AttendanceResponse(BaseModel):
    id: str
    employee_id: str
    date: str
    check_in: Optional[datetime] = None
    check_out: Optional[datetime] = None
    breaks: list = []
    status: str
    created_at: datetime
    updated_at: datetime
