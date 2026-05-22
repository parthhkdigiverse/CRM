from datetime import datetime
from typing import Optional
from beanie import Document
from pydantic import Field
from utils.helpers import utc_now

class InventoryProduct(Document):
    org_id: str
    sku: str = Field(..., description="Stock Keeping Unit / Item Code")
    name: str
    description: Optional[str] = None
    category: str
    unit_price: float = Field(default=0.0)
    stock_quantity: int = Field(default=0)
    min_stock_level: int = Field(default=5)
    
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)

    class Settings:
        name = "inventory_products"
