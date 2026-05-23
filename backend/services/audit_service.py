"""
Audit service — immutable audit log and activity tracking.
Fire-and-forget: errors are logged but never block the request.
"""

import logging
from typing import Optional, Dict

from beanie import PydanticObjectId

from models.audit_log import AuditLog
from models.activity import Activity
from utils.helpers import utc_now
from utils.logging import redact

logger = logging.getLogger(__name__)


async def log_action(
    org_id: str,
    user_id: str,
    action: str,
    module: str,
    entity_id: Optional[str] = None,
    changes: Optional[Dict] = None,
    ip: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> None:
    """
    Create an immutable audit log entry.
    This function is fire-and-forget — errors are logged but never raised.
    """
    try:
        entry = AuditLog(
            org_id=PydanticObjectId(org_id),
            user_id=PydanticObjectId(user_id),
            action=action,
            module=module,
            entity_id=PydanticObjectId(entity_id) if entity_id else None,
            changes=redact(changes or {}),
            ip_address=ip,
            user_agent=user_agent[:255] if user_agent else None,
            created_by=PydanticObjectId(user_id),
        )
        await entry.insert()
    except Exception as e:
        logger.error(f"Audit log write failed: {e}")


async def log_activity(
    org_id: str,
    user_id: str,
    activity_type: str,
    description: str,
    entity_type: str,
    entity_id: str,
    metadata: Optional[Dict] = None,
) -> None:
    """
    Create an immutable activity timeline entry.
    This function is fire-and-forget — errors are logged but never raised.
    """
    try:
        entry = Activity(
            org_id=PydanticObjectId(org_id),
            type=activity_type,
            description=description,
            entity_type=entity_type,
            entity_id=PydanticObjectId(entity_id),
            metadata=redact(metadata or {}),
            created_by=PydanticObjectId(user_id),
        )
        await entry.insert()
    except Exception as e:
        logger.error(f"Activity log write failed: {e}")
