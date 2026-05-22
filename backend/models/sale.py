from datetime import datetime
from typing import Optional, List
from beanie import Document
from pydantic import BaseModel, Field
from utils.helpers import utc_now

class SaleItem(BaseModel):
    product_id: str
    product_name: str
    quantity: int
    unit_price: float
    total: float

class Sale(Document):
    org_id: str
    reference_number: str = Field(..., description="Unique sale reference (e.g. SL-1001)")
    sale_date: datetime = Field(default_factory=utc_now)
    customer_name: str
    items: List[SaleItem]
    
    subtotal: float
    discount: float = Field(default=0.0)
    tax: float = Field(default=0.0)
    total_amount: float
    
    status: str = Field(default="Completed", description="e.g. Completed, Pending, Cancelled")
    
    created_by: str  # User ID of who logged the sale
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)

    class Settings:
        name = "sales"
