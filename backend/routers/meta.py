"""
Meta (Facebook / Instagram) Lead Ads routes — ORG-AWARE.

Credentials are stored per-organization (admin Settings → Integrations), so every
authenticated call resolves the caller's org config from the database.

Routers:
- `router`         -> /api/v1/meta/*       (authenticated CRM endpoints)
- `webhook_router` -> /api/webhook/meta    (public Meta webhook: verify + receive)
"""

import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Query, status
from fastapi.responses import PlainTextResponse
from beanie import PydanticObjectId

from config import settings
from middleware.auth_middleware import get_current_user, get_current_org, org_filter
from middleware.rbac import require_module_read, require_module_write, require_module_full
from models.user import User
from models.organization import Organization
from models.lead import Lead
from models.meta_integration import MetaIntegration
from schemas.common import SuccessResponse
from schemas.meta import MetaSettingsUpdate
from services import meta_service
from services.meta_service import MetaConfigError, MetaAPIError
from utils.crypto import mask_secret, decrypt_secret

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/meta", tags=["Meta Ads"])
webhook_router = APIRouter(prefix="/api/webhook", tags=["Meta Webhook"])


def _require_org(org: Optional[Organization]) -> Organization:
    if org is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No organization context. Super admins manage Meta per organization.",
        )
    return org


# ---------------------------------------------------------------------------
# Settings (admin) — store per-org credentials
# ---------------------------------------------------------------------------

def _settings_response(integ: Optional[MetaIntegration]) -> dict:
    callback = f"{settings.BACKEND_URL.rstrip('/')}/api/webhook/meta"
    if not integ:
        return {
            "configured": False,
            "enabled": True,
            "auto_sync_enabled": True,
            "sync_interval_minutes": 15,
            "ad_account_id": None,
            "lead_form_ids": None,
            "webhook_verify_token": None,
            "graph_version": "v19.0",
            "has_access_token": False,
            "has_app_secret": False,
            "access_token_masked": None,
            "last_synced_at": None,
            "last_error": None,
            "webhook_callback_url": callback,
        }
    token_plain = decrypt_secret(integ.access_token_enc)
    cfg = meta_service.config_from_integration(integ)
    return {
        "configured": cfg.is_configured,
        "enabled": integ.enabled,
        "auto_sync_enabled": integ.auto_sync_enabled,
        "sync_interval_minutes": integ.sync_interval_minutes,
        "ad_account_id": integ.ad_account_id,
        "lead_form_ids": integ.lead_form_ids,
        "webhook_verify_token": integ.webhook_verify_token,
        "graph_version": integ.graph_version,
        "has_access_token": bool(integ.access_token_enc),
        "has_app_secret": bool(integ.app_secret_enc),
        "access_token_masked": mask_secret(token_plain) if token_plain else None,
        "last_synced_at": integ.last_synced_at.isoformat() if integ.last_synced_at else None,
        "last_error": integ.last_error,
        "webhook_callback_url": callback,
    }


@router.get("/settings", response_model=SuccessResponse)
async def get_meta_settings(
    current_user: User = Depends(require_module_full("settings")),
    org: Optional[Organization] = Depends(get_current_org),
):
    """Return the org's Meta integration config (secrets masked). Admin only."""
    org = _require_org(org)
    integ = await meta_service.get_integration(org.id)
    return SuccessResponse(data=_settings_response(integ))


@router.put("/settings", response_model=SuccessResponse)
async def update_meta_settings(
    data: MetaSettingsUpdate,
    current_user: User = Depends(require_module_full("settings")),
    org: Optional[Organization] = Depends(get_current_org),
):
    """Create/update the org's Meta credentials. Admin only. Secrets are encrypted."""
    org = _require_org(org)
    integ = await meta_service.upsert_integration(
        org.id,
        current_user.id,
        access_token=data.access_token,
        app_secret=data.app_secret,
        ad_account_id=data.ad_account_id,
        lead_form_ids=data.lead_form_ids,
        webhook_verify_token=data.webhook_verify_token,
        graph_version=data.graph_version,
        enabled=data.enabled,
        auto_sync_enabled=data.auto_sync_enabled,
        sync_interval_minutes=data.sync_interval_minutes,
        clear_access_token=data.clear_access_token,
        clear_app_secret=data.clear_app_secret,
    )
    return SuccessResponse(data=_settings_response(integ), message="Meta settings saved")


@router.post("/test-connection", response_model=SuccessResponse)
async def test_meta_connection(
    current_user: User = Depends(require_module_full("settings")),
    org: Optional[Organization] = Depends(get_current_org),
):
    """Validate the stored credentials by making a lightweight Graph API call."""
    org = _require_org(org)
    cfg = await meta_service.get_config(org.id)
    if not cfg or not cfg.access_token:
        raise HTTPException(status_code=400, detail="No access token configured")
    if not cfg.form_ids:
        raise HTTPException(status_code=400, detail="No lead form ids configured")

    import httpx
    form_id = cfg.form_ids[0]
    url = cfg.graph_url(f"{form_id}")
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            data = await meta_service._get(client, url, {"access_token": cfg.access_token, "fields": "id,name"})
        return SuccessResponse(
            data={"form_id": data.get("id"), "form_name": data.get("name")},
            message="Connection successful",
        )
    except MetaAPIError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e))


# ---------------------------------------------------------------------------
# Status / sync / data
# ---------------------------------------------------------------------------

@router.get("/status", response_model=SuccessResponse)
async def meta_status(
    current_user: User = Depends(require_module_read("leads")),
    org: Optional[Organization] = Depends(get_current_org),
):
    """Whether Meta is configured for this org + last sync info."""
    if org is None:
        return SuccessResponse(data={"configured": False})
    integ = await meta_service.get_integration(org.id)
    if not integ:
        return SuccessResponse(data={"configured": False, "last_synced_at": None})
    cfg = meta_service.config_from_integration(integ)
    return SuccessResponse(data={
        "configured": cfg.is_configured,
        "enabled": integ.enabled,
        "form_count": len(cfg.form_ids),
        "ad_account_configured": bool(cfg.normalized_ad_account_id),
        "last_synced_at": integ.last_synced_at.isoformat() if integ.last_synced_at else None,
        "last_error": integ.last_error,
        "auto_sync_enabled": integ.auto_sync_enabled,
        "sync_interval_minutes": integ.sync_interval_minutes,
    })


@router.get("/sync", response_model=SuccessResponse)
@router.post("/sync", response_model=SuccessResponse)
async def meta_sync(
    current_user: User = Depends(require_module_write("leads")),
    org: Optional[Organization] = Depends(get_current_org),
):
    """Manually trigger a Meta lead fetch for the caller's org."""
    org = _require_org(org)
    cfg = await meta_service.get_config(org.id)
    if not cfg or not cfg.is_configured:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Meta integration is not configured. Add your credentials in Settings → Integrations.",
        )
    try:
        summary = await meta_service.sync_all_leads(cfg, user_id=current_user.id)
    except MetaConfigError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except MetaAPIError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e))
    return SuccessResponse(data=summary, message=f"Synced {summary['created']} new lead(s) from Meta")


@router.get("/leads", response_model=SuccessResponse)
async def meta_leads(
    current_user: User = Depends(require_module_read("leads")),
    org: Optional[Organization] = Depends(get_current_org),
):
    """All leads that originated from Meta for this org."""
    query = org_filter(org, {"meta_lead_id": {"$ne": None}})
    leads = await Lead.find(query).sort([("created_at", -1)]).to_list()
    data = []
    for item in leads:
        d = item.model_dump()
        d["id"] = str(d.pop("_id", item.id))
        for k in ("assigned_to", "org_id", "created_by"):
            if d.get(k):
                d[k] = str(d[k])
        data.append(d)
    return SuccessResponse(data=data)


@router.get("/insights", response_model=SuccessResponse)
async def meta_insights(
    date_preset: str = Query("last_30d"),
    current_user: User = Depends(require_module_read("leads")),
    org: Optional[Organization] = Depends(get_current_org),
):
    """Ads performance + geo (region) breakdown from Meta Insights for this org."""
    org = _require_org(org)
    cfg = await meta_service.get_config(org.id)
    if not cfg or not cfg.normalized_ad_account_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ad account id is not configured.")
    try:
        insights = await meta_service.fetch_insights(cfg, date_preset=date_preset)
    except MetaConfigError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except MetaAPIError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e))
    return SuccessResponse(data=insights)


@router.get("/summary", response_model=SuccessResponse)
async def meta_summary(
    current_user: User = Depends(require_module_read("leads")),
    org: Optional[Organization] = Depends(get_current_org),
):
    """Aggregated Meta Ads summary for the dashboard section (per org)."""
    now = datetime.now(timezone.utc)
    start_of_today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    start_of_week = start_of_today - timedelta(days=start_of_today.weekday())
    start_of_month = start_of_today.replace(day=1)

    base = org_filter(org, {"meta_lead_id": {"$ne": None}})
    meta_leads_list = await Lead.find(base).to_list()

    def _count(platform: Optional[str], since: datetime) -> int:
        c = 0
        for l in meta_leads_list:
            created = l.created_at
            if created and created.tzinfo is None:
                created = created.replace(tzinfo=timezone.utc)
            if created and created >= since:
                if platform is None or l.meta_platform == platform:
                    c += 1
        return c

    city_counts: dict = {}
    for l in meta_leads_list:
        city = (l.meta_city or "").strip()
        if city:
            city_counts[city] = city_counts.get(city, 0) + 1
    city_breakdown = sorted(
        [{"city": k, "leads": v} for k, v in city_counts.items()],
        key=lambda x: x["leads"], reverse=True,
    )
    top_city = city_breakdown[0] if city_breakdown else None

    campaign_counts: dict = {}
    for l in meta_leads_list:
        camp = (l.meta_campaign_name or "").strip()
        if camp:
            campaign_counts[camp] = campaign_counts.get(camp, 0) + 1
    top_campaign = None
    if campaign_counts:
        name, leads = max(campaign_counts.items(), key=lambda kv: kv[1])
        top_campaign = {"campaign_name": name, "leads": leads}

    # Optional: enrich with live ad spend / cost-per-lead from this org's config
    total_spent = 0.0
    cost_per_lead = 0.0
    insights_available = False
    warning = None
    configured = False
    last_synced_at = None

    if org is not None:
        integ = await meta_service.get_integration(org.id)
        if integ:
            cfg = meta_service.config_from_integration(integ)
            configured = cfg.is_configured
            last_synced_at = integ.last_synced_at.isoformat() if integ.last_synced_at else None
            if cfg.normalized_ad_account_id and cfg.access_token:
                try:
                    insights = await meta_service.fetch_insights(cfg, date_preset="last_30d")
                    total_spent = insights["totals"]["spend"]
                    cost_per_lead = insights["totals"]["cost_per_lead"]
                    insights_available = True
                    if not top_campaign and insights.get("top_campaign"):
                        tc = insights["top_campaign"]
                        top_campaign = {"campaign_name": tc.get("campaign_name"), "leads": tc.get("leads", 0)}
                    if not top_city and insights.get("top_region"):
                        tr = insights["top_region"]
                        top_city = {"city": tr.get("region"), "leads": tr.get("leads", 0)}
                except Exception as e:
                    warning = f"Ads insights unavailable: {e}"
                    logger.warning("Meta summary insights failed (org %s): %s", org.id, e)

    data = {
        "configured": configured,
        "facebook": {
            "today": _count("facebook", start_of_today),
            "week": _count("facebook", start_of_week),
            "month": _count("facebook", start_of_month),
        },
        "instagram": {
            "today": _count("instagram", start_of_today),
            "week": _count("instagram", start_of_week),
            "month": _count("instagram", start_of_month),
        },
        "total": {
            "today": _count(None, start_of_today),
            "week": _count(None, start_of_week),
            "month": _count(None, start_of_month),
        },
        "top_city": top_city,
        "top_campaign": top_campaign,
        "city_breakdown": city_breakdown[:12],
        "total_spent": total_spent,
        "cost_per_lead": cost_per_lead,
        "insights_available": insights_available,
        "last_synced_at": last_synced_at,
        "warning": warning,
    }
    return SuccessResponse(data=data)


# ---------------------------------------------------------------------------
# Public webhook endpoints (no auth — verified via per-org tokens/signature)
# ---------------------------------------------------------------------------

@webhook_router.get("/meta")
async def meta_webhook_verify(request: Request):
    """
    Meta webhook verification handshake.
    The verify token must match SOME org's stored webhook_verify_token.
    """
    params = request.query_params
    mode = params.get("hub.mode")
    token = params.get("hub.verify_token")
    challenge = params.get("hub.challenge")

    if mode == "subscribe" and token:
        integ = await meta_service.find_integration_by_verify_token(token)
        if integ:
            return PlainTextResponse(content=challenge or "", status_code=200)

    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Webhook verification failed")


@webhook_router.post("/meta")
async def meta_webhook_receive(request: Request):
    """
    Receive realtime leadgen events from Meta.
    Each `entry` carries the Page id; we map leads to the org whose integration
    matches. Signature is verified per-org when an app secret is configured.
    """
    raw_body = await request.body()
    signature = request.headers.get("X-Hub-Signature-256")

    try:
        payload = await request.json()
    except Exception:
        return {"success": True, "processed": 0}

    processed = 0
    try:
        for entry in payload.get("entry", []):
            for change in entry.get("changes", []):
                if change.get("field") != "leadgen":
                    continue
                value = change.get("value", {}) or {}
                leadgen_id = value.get("leadgen_id")
                page_id = value.get("page_id")
                form_id = value.get("form_id")
                if not leadgen_id:
                    continue

                # Resolve which org this lead belongs to (by form id, else first enabled).
                integ = await _resolve_integration_for_event(form_id, page_id)
                if not integ:
                    logger.warning("Webhook leadgen %s: no matching org integration", leadgen_id)
                    continue

                cfg = meta_service.config_from_integration(integ)

                # Verify signature with this org's app secret (if set).
                if not meta_service.verify_webhook_signature(raw_body, signature, cfg.app_secret):
                    logger.warning("Webhook signature mismatch for org %s", integ.org_id)
                    continue

                if not cfg.access_token:
                    continue
                try:
                    raw_lead = await meta_service.fetch_single_lead(cfg, str(leadgen_id))
                    raw_lead.setdefault("form_id", form_id)
                    raw_lead.setdefault("ad_id", value.get("ad_id"))
                    raw_lead.setdefault("campaign_id", value.get("campaign_id"))
                    _, created = await meta_service.save_meta_lead(raw_lead, integ.org_id)
                    if created:
                        processed += 1
                except Exception as e:
                    logger.error("Failed to process leadgen_id %s: %s", leadgen_id, e)
    except Exception as e:
        logger.error("Meta webhook processing error: %s", e)

    return {"success": True, "processed": processed}


async def _resolve_integration_for_event(form_id: Optional[str], page_id: Optional[str]) -> Optional[MetaIntegration]:
    """
    Find the org integration responsible for a webhook event.
    Strategy: match by configured lead_form_ids containing the form_id;
    fall back to the single enabled integration if only one exists.
    """
    enabled = await MetaIntegration.find(
        MetaIntegration.is_deleted == False,
        MetaIntegration.enabled == True,
    ).to_list()

    if form_id:
        for integ in enabled:
            ids = [f.strip() for f in (integ.lead_form_ids or "").split(",") if f.strip()]
            if str(form_id) in ids:
                return integ

    # Fallback: if exactly one integration is configured, use it.
    configured = [i for i in enabled if i.access_token_enc and i.lead_form_ids]
    if len(configured) == 1:
        return configured[0]
    return None
