"""
Leave request/response schemas.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class LeaveCreate(BaseModel):
    employee_id: Optional[str] = None
    leave_type: str
    duration_type: str = "multiple_days"
    start_date: str
    end_date: str
    reason: str


class LeaveUpdateStatus(BaseModel):
    status: str  # approved, rejected
    approver_notes: Optional[str] = None


class LeaveResponse(BaseModel):
    id: str
    employee_id: str
    employee_user_id: Optional[str] = None
    employee_name: Optional[str] = None
    leave_type: str
    duration_type: str = "multiple_days"
    start_date: str
    end_date: str
    reason: str
    status: str
    approver_id: Optional[str] = None
    approver_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
