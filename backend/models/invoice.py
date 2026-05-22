"""
Invoice document model — invoices with line items and payment tracking.
"""

from datetime import datetime, timezone
from typing import Optional, List

from beanie import Document
from pydantic import BaseModel, Field
from beanie import PydanticObjectId


class LineItem(BaseModel):
    """Embedded line item within an invoice."""

    description: str
    quantity: float = 1.0
    unit_price: float = 0.0
    tax_percent: float = 0.0
    amount: float = 0.0  # Calculated: quantity * unit_price * (1 + tax_percent/100)


class Invoice(Document):
    """Invoice with line items, auto-numbering, and payment tracking."""

    invoice_number: str  # Auto-generated: INV-YYYY-XXXX
    contact_id: Optional[PydanticObjectId] = None
    company_id: Optional[PydanticObjectId] = None
    customer_name: Optional[str] = None
    line_items: List[LineItem] = Field(default_factory=list)
    subtotal: float = 0.0
    tax_amount: float = 0.0
    discount: float = 0.0
    total: float = 0.0
    currency: str = "INR"
    status: str = "draft"  # draft, sent, paid, overdue, cancelled
    due_date: Optional[datetime] = None
    payment_date: Optional[datetime] = None
    payment_method: Optional[str] = None
    notes: Optional[str] = None
    payment_terms: Optional[str] = None

    # Base fields
    org_id: PydanticObjectId
    created_by: PydanticObjectId
    updated_by: Optional[PydanticObjectId] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_deleted: bool = False
    deleted_at: Optional[datetime] = None
    deleted_by: Optional[PydanticObjectId] = None

    class Settings:
        name = "invoices"
        indexes = [
            "org_id",
            "status",
            "invoice_number",
        ]

    def calculate_totals(self) -> None:
        """Recalculate subtotal, tax_amount, and total from line items."""
        self.subtotal = 0.0
        self.tax_amount = 0.0
        for item in self.line_items:
            base = item.quantity * item.unit_price
            tax = base * (item.tax_percent / 100.0)
            item.amount = round(base + tax, 2)
            self.subtotal += round(base, 2)
            self.tax_amount += round(tax, 2)
        self.total = round(self.subtotal + self.tax_amount - self.discount, 2)
