"""
Employee request/response schemas.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr


class EmployeeCreate(BaseModel):
    name: str
    email: EmailStr
    password: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = "employee"
    department: Optional[str] = None
    join_date: Optional[datetime] = None
    salary: Optional[float] = None
    status: str = "active"
    reporting_to: Optional[str] = None
    avatar_url: Optional[str] = None
    user_id: Optional[str] = None


class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    department: Optional[str] = None
    join_date: Optional[datetime] = None
    salary: Optional[float] = None
    status: Optional[str] = None
    reporting_to: Optional[str] = None
    avatar_url: Optional[str] = None


class EmployeeResponse(BaseModel):
    id: str
    user_id: Optional[str] = None
    name: str
    email: str
    phone: Optional[str] = None
    role: Optional[str] = None
    department: Optional[str] = None
    join_date: Optional[datetime] = None
    salary: Optional[float] = None  # Only populated for admin/super_admin
    status: str
    reporting_to: Optional[str] = None
    avatar_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime
