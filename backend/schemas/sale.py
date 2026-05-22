from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from models.sale import SaleItem

class SaleCreate(BaseModel):
    reference_number: str
    sale_date: Optional[datetime] = None
    customer_name: str
    items: List[SaleItem]
    subtotal: float
    discount: float = 0.0
    tax: float = 0.0
    total_amount: float
    status: str = "Completed"

class SaleUpdate(BaseModel):
    reference_number: Optional[str] = None
    sale_date: Optional[datetime] = None
    customer_name: Optional[str] = None
    items: Optional[List[SaleItem]] = None
    subtotal: Optional[float] = None
    discount: Optional[float] = None
    tax: Optional[float] = None
    total_amount: Optional[float] = None
    status: Optional[str] = None

class SaleResponse(BaseModel):
    id: str
    org_id: str
    reference_number: str
    sale_date: datetime
    customer_name: str
    items: List[SaleItem]
    subtotal: float
    discount: float
    tax: float
    total_amount: float
    status: str
    created_by: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
