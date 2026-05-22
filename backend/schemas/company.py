"""
Company request/response schemas.
"""

from datetime import datetime
from typing import Optional, List, Dict

from pydantic import BaseModel, EmailStr


class CompanyCreate(BaseModel):
    name: str
    industry: Optional[str] = None
    size: Optional[str] = None
    website: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[Dict] = None
    annual_revenue: Optional[float] = None
    assigned_to: Optional[str] = None
    contact_name: Optional[str] = None
    tags: List[str] = []
    notes: Optional[str] = None


class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    industry: Optional[str] = None
    size: Optional[str] = None
    website: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[Dict] = None
    annual_revenue: Optional[float] = None
    assigned_to: Optional[str] = None
    contact_name: Optional[str] = None
    tags: Optional[List[str]] = None
    notes: Optional[str] = None


class CompanyResponse(BaseModel):
    id: str
    name: str
    industry: Optional[str] = None
    size: Optional[str] = None
    website: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[Dict] = None
    annual_revenue: Optional[float] = None
    assigned_to: Optional[str] = None
    contact_name: Optional[str] = None
    tags: List[str] = []
    notes: Optional[str] = None
    linked_lead_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
