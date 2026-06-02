"""
Meta (Facebook / Instagram) Lead Ads request/response schemas.
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel


class MetaSyncResult(BaseModel):
    created: int = 0
    skipped: int = 0
    fetched: int = 0
    forms: int = 0
    errors: List[str] = []
    synced_at: Optional[str] = None


class MetaPlatformCounts(BaseModel):
    today: int = 0
    week: int = 0
    month: int = 0


class MetaSummaryResponse(BaseModel):
    configured: bool = False
    facebook: MetaPlatformCounts = MetaPlatformCounts()
    instagram: MetaPlatformCounts = MetaPlatformCounts()
    total: MetaPlatformCounts = MetaPlatformCounts()
    top_city: Optional[Dict[str, Any]] = None
    top_campaign: Optional[Dict[str, Any]] = None
    city_breakdown: List[Dict[str, Any]] = []
    total_spent: float = 0.0
    cost_per_lead: float = 0.0
    last_synced_at: Optional[str] = None
    insights_available: bool = False
    warning: Optional[str] = None


class MetaSettingsUpdate(BaseModel):
    """Admin updates to the org's Meta integration. Secret fields are write-only."""
    access_token: Optional[str] = None         # leave omitted to keep existing
    app_secret: Optional[str] = None           # leave omitted to keep existing
    ad_account_id: Optional[str] = None
    lead_form_ids: Optional[str] = None
    webhook_verify_token: Optional[str] = None
    graph_version: Optional[str] = None
    enabled: Optional[bool] = None
    auto_sync_enabled: Optional[bool] = None
    sync_interval_minutes: Optional[int] = None
    clear_access_token: bool = False
    clear_app_secret: bool = False


class MetaSettingsResponse(BaseModel):
    """Safe representation of the org's Meta integration (secrets masked)."""
    configured: bool = False
    enabled: bool = True
    auto_sync_enabled: bool = True
    sync_interval_minutes: int = 15
    ad_account_id: Optional[str] = None
    lead_form_ids: Optional[str] = None
    webhook_verify_token: Optional[str] = None
    graph_version: str = "v19.0"
    # Secret presence indicators (never the raw value)
    has_access_token: bool = False
    has_app_secret: bool = False
    access_token_masked: Optional[str] = None
    # Status
    last_synced_at: Optional[str] = None
    last_error: Optional[str] = None
    webhook_callback_url: Optional[str] = None
