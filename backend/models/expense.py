"""
Expense document model - organization expenses used by finance and reports.
"""

from datetime import datetime, timezone
from typing import Optional

from beanie import Document, PydanticObjectId
from pydantic import Field


class Expense(Document):
    """Business expense with approval/payment status and optional entity linkage."""

    org_id: PydanticObjectId
    expense_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    category: str
    amount: float
    currency: str = "INR"
    payment_method: Optional[str] = None
    paid_by_user_id: Optional[PydanticObjectId] = None
    vendor_name: Optional[str] = None
    description: Optional[str] = None
    receipt_url: Optional[str] = None
    status: str = "approved"  # draft, submitted, approved, rejected, paid
    related_type: Optional[str] = None
    related_id: Optional[str] = None
    approved_by_user_id: Optional[PydanticObjectId] = None
    approved_at: Optional[datetime] = None

    created_by: PydanticObjectId
    updated_by: Optional[PydanticObjectId] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_deleted: bool = False
    deleted_at: Optional[datetime] = None
    deleted_by: Optional[PydanticObjectId] = None

    class Settings:
        name = "expenses"
        indexes = [
            "org_id",
            "expense_date",
            "category",
            "status",
        ]
