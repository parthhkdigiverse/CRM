"""
Organization request/response schemas.
"""

from datetime import datetime
from typing import Optional, Dict

from pydantic import BaseModel, EmailStr


class OrgCreate(BaseModel):
    name: str
    industry: Optional[str] = None
    size: Optional[str] = None
    website: Optional[str] = None
    address: Optional[Dict] = None
    tax_id: Optional[str] = None
    currency: str = "INR"
    timezone: str = "Asia/Kolkata"


class AdminOrgCreate(BaseModel):
    name: str
    admin_email: EmailStr
    admin_password: str
    industry: Optional[str] = None


class AdminOrgUpdate(BaseModel):
    name: Optional[str] = None
    industry: Optional[str] = None
    admin_password: Optional[str] = None


class OrgUpdate(BaseModel):
    name: Optional[str] = None
    industry: Optional[str] = None
    size: Optional[str] = None
    website: Optional[str] = None
    address: Optional[Dict] = None
    tax_id: Optional[str] = None
    currency: Optional[str] = None
    timezone: Optional[str] = None


class OrgResponse(BaseModel):
    id: str
    name: str
    industry: Optional[str] = None
    size: Optional[str] = None
    logo_url: Optional[str] = None
    website: Optional[str] = None
    address: Optional[Dict] = None
    tax_id: Optional[str] = None
    currency: str
    timezone: str
    settings: Dict = {}
    created_at: datetime
    updated_at: datetime


class InviteMemberRequest(BaseModel):
    email: EmailStr
    role: str = "viewer"


class JoinOrgRequest(BaseModel):
    invite_token: str
