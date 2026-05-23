"""
Expense request/response schemas.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class ExpenseCreate(BaseModel):
    expense_date: Optional[datetime] = None
    category: str = Field(..., min_length=1, max_length=80)
    amount: float = Field(..., gt=0)
    currency: str = "INR"
    payment_method: Optional[str] = None
    paid_by_user_id: Optional[str] = None
    vendor_name: Optional[str] = None
    description: Optional[str] = None
    receipt_url: Optional[str] = None
    status: str = "approved"
    related_type: Optional[str] = None
    related_id: Optional[str] = None


class ExpenseUpdate(BaseModel):
    expense_date: Optional[datetime] = None
    category: Optional[str] = Field(default=None, min_length=1, max_length=80)
    amount: Optional[float] = Field(default=None, gt=0)
    currency: Optional[str] = None
    payment_method: Optional[str] = None
    paid_by_user_id: Optional[str] = None
    vendor_name: Optional[str] = None
    description: Optional[str] = None
    receipt_url: Optional[str] = None
    status: Optional[str] = None
    related_type: Optional[str] = None
    related_id: Optional[str] = None


class ExpenseResponse(BaseModel):
    id: str
    expense_date: datetime
    category: str
    amount: float
    currency: str
    payment_method: Optional[str] = None
    paid_by_user_id: Optional[str] = None
    vendor_name: Optional[str] = None
    description: Optional[str] = None
    receipt_url: Optional[str] = None
    status: str
    related_type: Optional[str] = None
    related_id: Optional[str] = None
    approved_by_user_id: Optional[str] = None
    approved_at: Optional[datetime] = None
    created_by: str
    created_at: datetime
    updated_at: datetime
