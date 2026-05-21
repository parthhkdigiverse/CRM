"""
Target request/response schemas.
"""

from typing import Optional
from pydantic import BaseModel


class TargetCreate(BaseModel):
    title: str
    owner: Optional[str] = None
    department: Optional[str] = None
    period: Optional[str] = None
    target_value: float = 0.0
    current_value: float = 0.0
    unit: str = "₹"
    status: str = "active"


class TargetUpdate(BaseModel):
    title: Optional[str] = None
    owner: Optional[str] = None
    department: Optional[str] = None
    period: Optional[str] = None
    target_value: Optional[float] = None
    current_value: Optional[float] = None
    unit: Optional[str] = None
    status: Optional[str] = None
