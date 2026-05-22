from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class InventoryProductBase(BaseModel):
    sku: str
    name: str
    description: Optional[str] = None
    category: str
    unit_price: float
    stock_quantity: int
    min_stock_level: int

class InventoryProductCreate(InventoryProductBase):
    pass

class InventoryProductUpdate(BaseModel):
    sku: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    unit_price: Optional[float] = None
    stock_quantity: Optional[int] = None
    min_stock_level: Optional[int] = None

class InventoryProductResponse(InventoryProductBase):
    id: str
    org_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
