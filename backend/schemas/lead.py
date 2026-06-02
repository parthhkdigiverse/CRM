"""
Lead request/response schemas.
"""

from datetime import datetime
from typing import Optional, List, Dict

from pydantic import BaseModel, EmailStr


class LeadCreate(BaseModel):
    name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    source: str = "web"
    status: str = "new"
    value: float = 0.0
    job_title: Optional[str] = None
    assigned_to: Optional[str] = None
    follow_up_date: Optional[datetime] = None
    notes: Optional[str] = None
    address: Optional[str] = None


class LeadUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    source: Optional[str] = None
    status: Optional[str] = None
    value: Optional[float] = None
    job_title: Optional[str] = None
    assigned_to: Optional[str] = None
    follow_up_date: Optional[datetime] = None
    notes: Optional[str] = None
    address: Optional[str] = None


class LeadResponse(BaseModel):
    id: str
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    source: str
    status: str
    value: float
    job_title: Optional[str] = None
    assigned_to: Optional[str] = None
    follow_up_date: Optional[datetime] = None
    notes: Optional[str] = None
    address: Optional[str] = None
    converted_deal_id: Optional[str] = None
    # Meta Lead Ads fields
    meta_lead_id: Optional[str] = None
    meta_platform: Optional[str] = None
    meta_ad_id: Optional[str] = None
    meta_ad_name: Optional[str] = None
    meta_campaign_id: Optional[str] = None
    meta_campaign_name: Optional[str] = None
    meta_adset_id: Optional[str] = None
    meta_adset_name: Optional[str] = None
    meta_form_id: Optional[str] = None
    meta_form_name: Optional[str] = None
    meta_city: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class BulkAssignRequest(BaseModel):
    lead_ids: List[str]
    assigned_to: str
