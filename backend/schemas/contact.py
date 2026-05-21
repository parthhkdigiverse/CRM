"""
Contact request/response schemas.
"""

from datetime import datetime
from typing import Optional, List, Dict

from pydantic import BaseModel, EmailStr


class ContactCreate(BaseModel):
    first_name: str
    last_name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    company_id: Optional[str] = None
    job_title: Optional[str] = None
    lead_source: Optional[str] = None
    status: str = "active"
    assigned_to: Optional[str] = None
    tags: List[str] = []
    notes: Optional[str] = None
    custom_fields: Dict = {}


class ContactUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    company_id: Optional[str] = None
    job_title: Optional[str] = None
    lead_source: Optional[str] = None
    status: Optional[str] = None
    assigned_to: Optional[str] = None
    tags: Optional[List[str]] = None
    notes: Optional[str] = None
    custom_fields: Optional[Dict] = None


class ContactResponse(BaseModel):
    id: str
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    company_id: Optional[str] = None
    job_title: Optional[str] = None
    lead_source: Optional[str] = None
    status: str
    assigned_to: Optional[str] = None
    tags: List[str] = []
    notes: Optional[str] = None
    custom_fields: Dict = {}
    created_at: datetime
    updated_at: datetime
