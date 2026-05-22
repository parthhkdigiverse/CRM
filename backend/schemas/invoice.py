"""
Invoice request/response schemas.
"""

from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel


class LineItemSchema(BaseModel):
    description: str
    quantity: float = 1.0
    unit_price: float = 0.0
    tax_percent: float = 0.0


class InvoiceCreate(BaseModel):
    contact_id: Optional[str] = None
    company_id: Optional[str] = None
    customer_name: Optional[str] = None
    line_items: List[LineItemSchema] = []
    discount: float = 0.0
    currency: str = "INR"
    status: str = "draft"
    due_date: Optional[datetime] = None
    notes: Optional[str] = None
    payment_terms: Optional[str] = None


class InvoiceUpdate(BaseModel):
    contact_id: Optional[str] = None
    company_id: Optional[str] = None
    customer_name: Optional[str] = None
    line_items: Optional[List[LineItemSchema]] = None
    discount: Optional[float] = None
    currency: Optional[str] = None
    status: Optional[str] = None
    due_date: Optional[datetime] = None
    notes: Optional[str] = None
    payment_terms: Optional[str] = None


class MarkPaidRequest(BaseModel):
    payment_date: Optional[datetime] = None
    payment_method: Optional[str] = None


class InvoiceResponse(BaseModel):
    id: str
    invoice_number: str
    contact_id: Optional[str] = None
    company_id: Optional[str] = None
    customer_name: Optional[str] = None
    line_items: List[dict] = []
    subtotal: float
    tax_amount: float
    discount: float
    total: float
    currency: str
    status: str
    due_date: Optional[datetime] = None
    payment_date: Optional[datetime] = None
    payment_method: Optional[str] = None
    notes: Optional[str] = None
    payment_terms: Optional[str] = None
    created_at: datetime
    updated_at: datetime
