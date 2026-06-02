"""
Background auto-sync scheduler for Meta Lead Ads — ORG-AWARE.

Every cycle it loads all enabled, auto-sync-enabled org integrations from the
`meta_integrations` collection and syncs each one using its own credentials.

Uses a lightweight asyncio background task (no node-cron / APScheduler needed).
Started/stopped from the FastAPI lifespan in main.py.
"""

import asyncio
import logging

from models.meta_integration import MetaIntegration
from services import meta_service

logger = logging.getLogger(__name__)

# Base loop tick. Each integration is only synced when its own interval elapsed.
_BASE_TICK_SECONDS = 60
_task: asyncio.Task | None = None
_stop_event: asyncio.Event | None = None
# Tracks last sync time per org (monotonic seconds) to honor per-org intervals.
_last_run: dict = {}


async def _sync_due_integrations() -> None:
    """Sync each enabled integration whose interval has elapsed."""
    try:
        integrations = await MetaIntegration.find(
            MetaIntegration.is_deleted == False,
            MetaIntegration.enabled == True,
            MetaIntegration.auto_sync_enabled == True,
        ).to_list()
    except Exception as e:
        logger.error("Meta scheduler: failed to load integrations: %s", e)
        return

    loop_now = asyncio.get_event_loop().time()
    for integ in integrations:
        cfg = meta_service.config_from_integration(integ)
        if not cfg.is_configured:
            continue

        org_key = str(integ.org_id)
        interval = max(5, integ.sync_interval_minutes) * 60
        last = _last_run.get(org_key, 0)
        if loop_now - last < interval:
            continue

        _last_run[org_key] = loop_now
        try:
            summary = await meta_service.sync_all_leads(cfg)
            if summary.get("created"):
                logger.info("Meta auto-sync (org %s): %s new lead(s).", org_key, summary["created"])
        except Exception as e:
            logger.error("Meta auto-sync failed for org %s: %s", org_key, e)


async def _run_loop() -> None:
    logger.info("Meta auto-sync loop started (org-aware).")

    # Small initial delay so it doesn't run during cold startup.
    try:
        await asyncio.wait_for(_stop_event.wait(), timeout=30)
        return
    except asyncio.TimeoutError:
        pass

    while not _stop_event.is_set():
        try:
            await _sync_due_integrations()
        except Exception as e:
            logger.error("Meta auto-sync tick failed: %s", e)
        try:
            await asyncio.wait_for(_stop_event.wait(), timeout=_BASE_TICK_SECONDS)
        except asyncio.TimeoutError:
            continue


def start_scheduler() -> None:
    """Start the background auto-sync task."""
    global _task, _stop_event
    if _task is not None:
        return
    _stop_event = asyncio.Event()
    _task = asyncio.create_task(_run_loop())


async def stop_scheduler() -> None:
    """Signal the background task to stop and await its completion."""
    global _task, _stop_event
    if _stop_event is not None:
        _stop_event.set()
    if _task is not None:
        try:
            await asyncio.wait_for(_task, timeout=5)
        except (asyncio.TimeoutError, asyncio.CancelledError):
            _task.cancel()
        except Exception:
            pass
        finally:
            _task = None
            _stop_event = None
            logger.info("Meta auto-sync loop stopped.")
