"""
Deal request/response schemas.
"""

from datetime import datetime
from typing import Optional, List, Dict

from pydantic import BaseModel


class DealCreate(BaseModel):
    title: str
    contact_id: Optional[str] = None
    company_id: Optional[str] = None
    value: float = 0.0
    currency: str = "INR"
    stage: str = "prospecting"
    probability: int = 0
    expected_close_date: Optional[datetime] = None
    assigned_to: Optional[str] = None
    notes: Optional[str] = None


class DealUpdate(BaseModel):
    title: Optional[str] = None
    contact_id: Optional[str] = None
    company_id: Optional[str] = None
    value: Optional[float] = None
    currency: Optional[str] = None
    stage: Optional[str] = None
    probability: Optional[int] = None
    expected_close_date: Optional[datetime] = None
    assigned_to: Optional[str] = None
    notes: Optional[str] = None
    won_lost_reason: Optional[str] = None


class DealStageUpdate(BaseModel):
    stage: str
    won_lost_reason: Optional[str] = None


class DealResponse(BaseModel):
    id: str
    title: str
    contact_id: Optional[str] = None
    company_id: Optional[str] = None
    value: float
    currency: str
    stage: str
    probability: int
    expected_close_date: Optional[datetime] = None
    assigned_to: Optional[str] = None
    notes: Optional[str] = None
    won_lost_reason: Optional[str] = None
    stage_history: List[Dict] = []
    created_at: datetime
    updated_at: datetime
