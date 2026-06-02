"""
Lead document model — sales leads with scoring and conversion tracking.
"""

from datetime import datetime, timezone
from typing import Optional, List, Dict

from beanie import Document
from pydantic import EmailStr, Field
from beanie import PydanticObjectId


class Lead(Document):
    """Lead record with scoring engine and pipeline tracking."""

    name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    source: str = "web"  # web, referral, social, cold, event
    status: str = "new"  # new, qualified, in_process, converted
    score: int = 0  # 1-100
    value: float = 0.0  # Estimated deal size/budget
    job_title: Optional[str] = None  # Contact's job title/designation
    assigned_to: Optional[PydanticObjectId] = None
    follow_up_date: Optional[datetime] = None
    notes: Optional[str] = None
    address: Optional[str] = None
    score_history: List[Dict] = Field(default_factory=list)  # [{score, reason, timestamp}]
    converted_deal_id: Optional[PydanticObjectId] = None

    # --- Meta (Facebook / Instagram) Lead Ads fields (additive, all optional) ---
    meta_lead_id: Optional[str] = None        # unique leadgen id from Facebook (dedup key)
    meta_platform: Optional[str] = None       # "facebook" or "instagram"
    meta_ad_id: Optional[str] = None
    meta_ad_name: Optional[str] = None
    meta_campaign_id: Optional[str] = None
    meta_campaign_name: Optional[str] = None
    meta_adset_id: Optional[str] = None
    meta_adset_name: Optional[str] = None
    meta_form_id: Optional[str] = None
    meta_form_name: Optional[str] = None
    meta_city: Optional[str] = None           # from field_data or geo breakdown
    meta_raw_fields: Optional[List[Dict]] = None  # full field_data payload as JSON

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
        name = "leads"
        indexes = [
            "org_id",
            "status",
            "assigned_to",
            "meta_lead_id",
        ]
