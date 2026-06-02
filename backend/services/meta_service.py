"""
Meta (Facebook / Instagram) Lead Ads integration service — ORG-AWARE.

Each organization stores its own Meta credentials in the `meta_integrations`
collection (secrets encrypted at rest). All Graph API calls take a `MetaConfig`
resolved from that per-org record, so different organizations use different
Facebook/Instagram accounts.

Backend stack: FastAPI + MongoDB (Beanie). HTTP via httpx (already a dependency).
"""

import logging
import hashlib
import hmac
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

import httpx
from beanie import PydanticObjectId

from models.lead import Lead
from models.organization import Organization
from models.user import User
from models.meta_integration import MetaIntegration
from utils.crypto import encrypt_secret, decrypt_secret
from utils.helpers import utc_now

logger = logging.getLogger(__name__)

GRAPH_BASE = "https://graph.facebook.com"


class MetaConfigError(Exception):
    """Raised when Meta integration is not configured for an organization."""


class MetaAPIError(Exception):
    """Raised when the Meta Graph API returns an error."""


# ---------------------------------------------------------------------------
# Resolved per-org credentials
# ---------------------------------------------------------------------------

@dataclass
class MetaConfig:
    """Decrypted, ready-to-use Meta credentials for a single organization."""
    org_id: PydanticObjectId
    access_token: Optional[str]
    app_secret: Optional[str]
    ad_account_id: Optional[str]
    lead_form_ids: Optional[str]
    webhook_verify_token: Optional[str]
    graph_version: str = "v19.0"
    enabled: bool = True

    @property
    def is_configured(self) -> bool:
        return bool(self.enabled and self.access_token and self.lead_form_ids)

    @property
    def form_ids(self) -> List[str]:
        raw = self.lead_form_ids or ""
        return [f.strip() for f in raw.split(",") if f.strip()]

    @property
    def normalized_ad_account_id(self) -> str:
        acc = (self.ad_account_id or "").strip()
        if not acc:
            return ""
        return acc if acc.startswith("act_") else f"act_{acc}"

    def graph_url(self, path: str) -> str:
        version = self.graph_version or "v19.0"
        return f"{GRAPH_BASE}/{version}/{path.lstrip('/')}"


def config_from_integration(integ: MetaIntegration) -> MetaConfig:
    """Build a decrypted MetaConfig from a stored MetaIntegration document."""
    return MetaConfig(
        org_id=integ.org_id,
        access_token=decrypt_secret(integ.access_token_enc),
        app_secret=decrypt_secret(integ.app_secret_enc),
        ad_account_id=integ.ad_account_id,
        lead_form_ids=integ.lead_form_ids,
        webhook_verify_token=integ.webhook_verify_token,
        graph_version=integ.graph_version or "v19.0",
        enabled=integ.enabled,
    )


async def get_integration(org_id: PydanticObjectId) -> Optional[MetaIntegration]:
    """Fetch the MetaIntegration document for an org (or None)."""
    return await MetaIntegration.find_one(
        MetaIntegration.org_id == org_id,
        MetaIntegration.is_deleted == False,
    )


async def get_config(org_id: PydanticObjectId) -> Optional[MetaConfig]:
    """Resolve a decrypted MetaConfig for an org, or None if not set up."""
    integ = await get_integration(org_id)
    if not integ:
        return None
    return config_from_integration(integ)


async def find_integration_by_verify_token(token: str) -> Optional[MetaIntegration]:
    """Locate the org integration that owns a given webhook verify token."""
    if not token:
        return None
    return await MetaIntegration.find_one(
        MetaIntegration.webhook_verify_token == token,
        MetaIntegration.is_deleted == False,
    )


# ---------------------------------------------------------------------------
# Webhook signature
# ---------------------------------------------------------------------------

def verify_webhook_signature(payload: bytes, signature_header: Optional[str], app_secret: Optional[str]) -> bool:
    """
    Verify the X-Hub-Signature-256 header using the org's app secret.
    If no app secret is configured, signature verification is skipped (returns True).
    """
    if not app_secret:
        return True
    if not signature_header or not signature_header.startswith("sha256="):
        return False
    expected = hmac.new(app_secret.encode("utf-8"), msg=payload, digestmod=hashlib.sha256).hexdigest()
    provided = signature_header.split("=", 1)[1]
    return hmac.compare_digest(expected, provided)


# ---------------------------------------------------------------------------
# field_data parsing
# ---------------------------------------------------------------------------

_NAME_KEYS = {"full_name", "name", "first_name_last_name", "your_name"}
_EMAIL_KEYS = {"email", "email_address", "work_email"}
_PHONE_KEYS = {"phone_number", "phone", "mobile", "mobile_number", "contact_number"}
_CITY_KEYS = {"city", "town", "city_town", "your_city", "location"}
_COMPANY_KEYS = {"company_name", "company", "organisation", "organization", "business_name"}
_JOB_KEYS = {"job_title", "designation", "role", "position"}


def parse_field_data(field_data: List[Dict[str, Any]]) -> Dict[str, Optional[str]]:
    """Convert Meta's field_data list into a flat dict of canonical CRM fields."""
    parsed: Dict[str, Optional[str]] = {
        "full_name": None, "email": None, "phone": None, "city": None,
        "company": None, "job_title": None, "first_name": None, "last_name": None,
    }

    for field in field_data or []:
        key = (field.get("name") or "").strip().lower()
        values = field.get("values") or []
        value = str(values[0]).strip() if values else None
        if not value:
            continue

        if key in _NAME_KEYS:
            parsed["full_name"] = value
        elif key == "first_name":
            parsed["first_name"] = value
        elif key == "last_name":
            parsed["last_name"] = value
        elif key in _EMAIL_KEYS:
            parsed["email"] = value
        elif key in _PHONE_KEYS:
            parsed["phone"] = value
        elif key in _CITY_KEYS:
            parsed["city"] = value
        elif key in _COMPANY_KEYS:
            parsed["company"] = value
        elif key in _JOB_KEYS:
            parsed["job_title"] = value

    if not parsed["full_name"]:
        combined = " ".join(p for p in [parsed.get("first_name"), parsed.get("last_name")] if p)
        parsed["full_name"] = combined or None

    return parsed


# ---------------------------------------------------------------------------
# HTTP helpers
# ---------------------------------------------------------------------------

async def _get(client: httpx.AsyncClient, url: str, params: Dict[str, Any]) -> Dict[str, Any]:
    resp = await client.get(url, params=params)
    if resp.status_code >= 400:
        try:
            err = resp.json().get("error", {})
            msg = err.get("message", resp.text)
        except Exception:
            msg = resp.text
        raise MetaAPIError(f"Meta API error ({resp.status_code}): {msg}")
    return resp.json()


LEAD_FIELDS = (
    "id,created_time,field_data,ad_id,ad_name,"
    "campaign_id,campaign_name,adset_id,adset_name,form_id,platform"
)


async def fetch_leads_for_form(client: httpx.AsyncClient, cfg: MetaConfig, form_id: str) -> List[Dict[str, Any]]:
    """Fetch all leads for a single form, following paging.next until exhausted."""
    leads: List[Dict[str, Any]] = []
    url = cfg.graph_url(f"{form_id}/leads")
    params: Dict[str, Any] = {
        "access_token": cfg.access_token,
        "fields": LEAD_FIELDS,
        "limit": 100,
    }

    page_guard = 0
    while url and page_guard < 100:
        page_guard += 1
        data = await _get(client, url, params)
        batch = data.get("data", [])
        for item in batch:
            item.setdefault("form_id", form_id)
        leads.extend(batch)

        next_url = (data.get("paging") or {}).get("next")
        if next_url:
            url = next_url
            params = {}
        else:
            url = None

    return leads


async def fetch_single_lead(cfg: MetaConfig, leadgen_id: str) -> Dict[str, Any]:
    """Fetch a single lead by its leadgen_id (used by the realtime webhook)."""
    if not cfg.access_token:
        raise MetaConfigError("Access token is not configured for this organization")
    url = cfg.graph_url(leadgen_id)
    params = {"access_token": cfg.access_token, "fields": LEAD_FIELDS}
    async with httpx.AsyncClient(timeout=30.0) as client:
        return await _get(client, url, params)


# ---------------------------------------------------------------------------
# Persistence
# ---------------------------------------------------------------------------

async def _resolve_attribution_user(org_id: PydanticObjectId, user_id: Optional[PydanticObjectId]) -> Optional[PydanticObjectId]:
    """Pick a user to set as created_by for synced leads (admin preferred)."""
    if user_id is not None:
        return user_id
    admin = await User.find_one(User.org_id == org_id, User.role == "admin")
    if not admin:
        admin = await User.find_one(User.org_id == org_id)
    return admin.id if admin else None


def _platform_to_source(platform: Optional[str]) -> str:
    if platform == "instagram":
        return "instagram"
    if platform == "facebook":
        return "facebook"
    return "meta_ads"


async def save_meta_lead(
    raw_lead: Dict[str, Any],
    org_id: PydanticObjectId,
    user_id: Optional[PydanticObjectId] = None,
) -> Tuple[Optional[Lead], bool]:
    """
    Persist a single raw Meta lead into the leads collection for a given org.
    Returns (lead, created) where created=False means duplicate / skipped.
    Dedup is scoped per-org by (org_id, meta_lead_id).
    """
    meta_lead_id = str(raw_lead.get("id") or "").strip()
    if not meta_lead_id:
        return None, False

    existing = await Lead.find_one(Lead.org_id == org_id, Lead.meta_lead_id == meta_lead_id)
    if existing:
        return existing, False

    target_user = await _resolve_attribution_user(org_id, user_id)
    if target_user is None:
        logger.warning("Meta sync: no user available for org %s; skipping lead %s", org_id, meta_lead_id)
        return None, False

    field_data = raw_lead.get("field_data", []) or []
    parsed = parse_field_data(field_data)

    platform = (raw_lead.get("platform") or "").lower() or None
    source = _platform_to_source(platform)

    created_at = datetime.now(timezone.utc)
    ct = raw_lead.get("created_time")
    if ct:
        try:
            created_at = datetime.fromisoformat(ct.replace("Z", "+00:00"))
        except Exception:
            pass

    lead = Lead(
        name=parsed.get("full_name") or "Unknown Lead",
        email=parsed.get("email") or None,
        phone=parsed.get("phone") or None,
        company=parsed.get("company") or None,
        job_title=parsed.get("job_title") or None,
        source=source,
        status="new",
        org_id=org_id,
        created_by=target_user,
        created_at=created_at,
        updated_at=datetime.now(timezone.utc),
        meta_lead_id=meta_lead_id,
        meta_platform=platform,
        meta_ad_id=raw_lead.get("ad_id"),
        meta_ad_name=raw_lead.get("ad_name"),
        meta_campaign_id=raw_lead.get("campaign_id"),
        meta_campaign_name=raw_lead.get("campaign_name"),
        meta_adset_id=raw_lead.get("adset_id"),
        meta_adset_name=raw_lead.get("adset_name"),
        meta_form_id=raw_lead.get("form_id"),
        meta_form_name=raw_lead.get("form_name"),
        meta_city=parsed.get("city"),
        meta_raw_fields=field_data,
    )
    try:
        await lead.insert()
    except Exception as e:
        logger.warning("Meta sync: insert failed for %s (%s); retrying without email", meta_lead_id, e)
        lead.email = None
        await lead.insert()

    return lead, True


async def sync_all_leads(cfg: MetaConfig, user_id: Optional[PydanticObjectId] = None) -> Dict[str, Any]:
    """Bulk fetch leads across all configured forms for an org and persist new ones."""
    if not cfg.is_configured:
        raise MetaConfigError("Meta integration is not configured (missing access token or form ids)")

    form_ids = cfg.form_ids
    created = skipped = fetched = 0
    errors: List[str] = []

    async with httpx.AsyncClient(timeout=60.0) as client:
        for form_id in form_ids:
            try:
                raw_leads = await fetch_leads_for_form(client, cfg, form_id)
                fetched += len(raw_leads)
                for raw in raw_leads:
                    _, was_created = await save_meta_lead(raw, cfg.org_id, user_id)
                    if was_created:
                        created += 1
                    else:
                        skipped += 1
            except Exception as e:
                logger.error("Meta sync failed for form %s (org %s): %s", form_id, cfg.org_id, e)
                errors.append(f"form {form_id}: {e}")

    summary = {
        "created": created,
        "skipped": skipped,
        "fetched": fetched,
        "forms": len(form_ids),
        "errors": errors,
        "synced_at": datetime.now(timezone.utc).isoformat(),
    }

    # Persist sync status onto the integration record.
    try:
        integ = await get_integration(cfg.org_id)
        if integ:
            integ.last_synced_at = utc_now()
            integ.last_error = "; ".join(errors) if errors else None
            integ.last_sync_created = created
            integ.updated_at = utc_now()
            await integ.save()
    except Exception as e:
        logger.error("Failed to persist Meta sync status for org %s: %s", cfg.org_id, e)

    logger.info("Meta sync complete (org %s): %s", cfg.org_id, summary)
    return summary


# ---------------------------------------------------------------------------
# Ads insights (spend, geo, campaigns)
# ---------------------------------------------------------------------------

async def fetch_insights(cfg: MetaConfig, date_preset: str = "last_30d") -> Dict[str, Any]:
    """Fetch ads insights for the org's account with a region breakdown."""
    if not cfg.access_token:
        raise MetaConfigError("Access token is not configured for this organization")
    account_id = cfg.normalized_ad_account_id
    if not account_id:
        raise MetaConfigError("Ad account id is not configured for this organization")

    region_url = cfg.graph_url(f"{account_id}/insights")
    region_params = {
        "access_token": cfg.access_token,
        "fields": "impressions,clicks,spend,actions,campaign_name",
        "breakdowns": "region",
        "date_preset": date_preset,
        "level": "account",
        "limit": 500,
    }
    campaign_url = cfg.graph_url(f"{account_id}/insights")
    campaign_params = {
        "access_token": cfg.access_token,
        "fields": "impressions,clicks,spend,actions,campaign_name",
        "date_preset": date_preset,
        "level": "campaign",
        "limit": 500,
    }

    def _extract_leads(row: Dict[str, Any]) -> int:
        for action in row.get("actions", []) or []:
            if action.get("action_type") in ("leadgen_grouped", "lead", "onsite_conversion.lead_grouped"):
                try:
                    return int(float(action.get("value", 0)))
                except (TypeError, ValueError):
                    return 0
        return 0

    total_spend = 0.0
    total_impressions = total_clicks = total_leads = 0
    regions: List[Dict[str, Any]] = []
    campaigns: List[Dict[str, Any]] = []

    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            region_data = await _get(client, region_url, region_params)
            for row in region_data.get("data", []):
                spend = float(row.get("spend", 0) or 0)
                impressions = int(row.get("impressions", 0) or 0)
                clicks = int(row.get("clicks", 0) or 0)
                leads = _extract_leads(row)
                total_spend += spend
                total_impressions += impressions
                total_clicks += clicks
                total_leads += leads
                regions.append({
                    "region": row.get("region", "Unknown"),
                    "spend": round(spend, 2),
                    "impressions": impressions,
                    "clicks": clicks,
                    "leads": leads,
                })
        except Exception as e:
            logger.error("Meta region insights failed (org %s): %s", cfg.org_id, e)

        try:
            campaign_data = await _get(client, campaign_url, campaign_params)
            for row in campaign_data.get("data", []):
                campaigns.append({
                    "campaign_name": row.get("campaign_name", "Unknown"),
                    "spend": round(float(row.get("spend", 0) or 0), 2),
                    "impressions": int(row.get("impressions", 0) or 0),
                    "clicks": int(row.get("clicks", 0) or 0),
                    "leads": _extract_leads(row),
                })
        except Exception as e:
            logger.error("Meta campaign insights failed (org %s): %s", cfg.org_id, e)

    if total_spend == 0 and campaigns:
        total_spend = sum(c["spend"] for c in campaigns)
        total_impressions = sum(c["impressions"] for c in campaigns)
        total_clicks = sum(c["clicks"] for c in campaigns)
        total_leads = sum(c["leads"] for c in campaigns)

    regions.sort(key=lambda r: r["leads"], reverse=True)
    campaigns.sort(key=lambda c: c["leads"], reverse=True)
    cost_per_lead = round(total_spend / total_leads, 2) if total_leads > 0 else 0.0

    return {
        "date_preset": date_preset,
        "totals": {
            "spend": round(total_spend, 2),
            "impressions": total_impressions,
            "clicks": total_clicks,
            "leads": total_leads,
            "cost_per_lead": cost_per_lead,
        },
        "regions": regions,
        "campaigns": campaigns,
        "top_region": regions[0] if regions else None,
        "top_campaign": campaigns[0] if campaigns else None,
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }


# ---------------------------------------------------------------------------
# Settings persistence (used by the admin Settings router)
# ---------------------------------------------------------------------------

async def upsert_integration(
    org_id: PydanticObjectId,
    user_id: PydanticObjectId,
    *,
    access_token: Optional[str] = None,
    app_secret: Optional[str] = None,
    ad_account_id: Optional[str] = None,
    lead_form_ids: Optional[str] = None,
    webhook_verify_token: Optional[str] = None,
    graph_version: Optional[str] = None,
    enabled: Optional[bool] = None,
    auto_sync_enabled: Optional[bool] = None,
    sync_interval_minutes: Optional[int] = None,
    clear_access_token: bool = False,
    clear_app_secret: bool = False,
) -> MetaIntegration:
    """
    Create or update an org's Meta integration. Secret fields are encrypted.
    Passing None for a secret leaves it unchanged; use clear_* to remove it.
    """
    integ = await get_integration(org_id)
    if not integ:
        integ = MetaIntegration(org_id=org_id, created_by=user_id)

    if clear_access_token:
        integ.access_token_enc = None
    elif access_token is not None and access_token != "":
        integ.access_token_enc = encrypt_secret(access_token)

    if clear_app_secret:
        integ.app_secret_enc = None
    elif app_secret is not None and app_secret != "":
        integ.app_secret_enc = encrypt_secret(app_secret)

    if ad_account_id is not None:
        integ.ad_account_id = ad_account_id.strip() or None
    if lead_form_ids is not None:
        integ.lead_form_ids = lead_form_ids.strip() or None
    if webhook_verify_token is not None:
        integ.webhook_verify_token = webhook_verify_token.strip() or None
    if graph_version is not None and graph_version.strip():
        integ.graph_version = graph_version.strip()
    if enabled is not None:
        integ.enabled = enabled
    if auto_sync_enabled is not None:
        integ.auto_sync_enabled = auto_sync_enabled
    if sync_interval_minutes is not None:
        integ.sync_interval_minutes = max(5, sync_interval_minutes)

    integ.updated_by = user_id
    integ.updated_at = utc_now()
    await integ.save()
    return integ
