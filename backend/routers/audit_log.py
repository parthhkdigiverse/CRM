"""
Audit Log router endpoints — list activity history and audit logs.
"""

import logging
from typing import Optional, List
from datetime import timezone, timedelta
from fastapi import APIRouter, Depends, Query
from beanie import PydanticObjectId

from middleware.auth_middleware import get_current_user, get_current_org, org_filter
from middleware.rbac import require_module_read, require_module_write, require_module_full
from models.user import User
from models.organization import Organization
from models.audit_log import AuditLog
from schemas.common import PaginatedResponse
from utils.helpers import paginate_params, build_paginated_response, build_sort_params

logger = logging.getLogger(__name__)

IST = timezone(timedelta(hours=5, minutes=30))

router = APIRouter(prefix="/api/v1/audit-logs", tags=["Audit Logs"])


@router.get("", response_model=PaginatedResponse)
async def list_audit_logs(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc"),
    module: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    entity_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    org: Optional[Organization] = Depends(get_current_org)
):
    from middleware.rbac import get_permission
    if current_user.role not in ["admin", "super_admin", "hr"]:
        if not module:
            raise HTTPException(status_code=403, detail="Employees must specify a module to view audit logs")
        perm = get_permission(current_user.role, module)
        if not perm:
            raise HTTPException(status_code=403, detail=f"You don't have access to {module} activity logs")

    skip, limit = paginate_params(page, per_page)
    sort = build_sort_params(sort_by, sort_order)

    # Build filters using dict-style queries
    base = org_filter(org)
    filters: List = [base]

    if module:
        filters.append(AuditLog.module == module)
    if action:
        filters.append(AuditLog.action == action)
    if entity_id:
        filters.append(AuditLog.entity_id == PydanticObjectId(entity_id))
    if search:
        filters.append(
            {"$or": [
                {"module": {"$regex": search, "$options": "i"}},
                {"action": {"$regex": search, "$options": "i"}},
            ]}
        )

    cursor = AuditLog.find(*filters).sort(sort).skip(skip).limit(limit)
    items = await cursor.to_list()
    total = await AuditLog.find(*filters).count()

    # Get unique user IDs to resolve names
    user_ids = list(set(item.user_id for item in items if item.user_id))

    # Query users
    users_dict = {}
    if user_ids:
        users = await User.find({"_id": {"$in": user_ids}}).to_list()
        users_dict = {u.id: u for u in users}

    data = []
    for item in items:
        d = item.model_dump()
        d["id"] = str(d.pop("_id", item.id))
        d["org_id"] = str(d["org_id"]) if d.get("org_id") else None
        d["user_id"] = str(d["user_id"])
        d["entity_id"] = str(d["entity_id"]) if d.get("entity_id") else None
        d["created_by"] = str(d["created_by"])

        # Convert UTC to IST for display
        if item.created_at:
            utc_dt = item.created_at.replace(tzinfo=timezone.utc)
            ist_dt = utc_dt.astimezone(IST)
            d["created_at"] = ist_dt.strftime("%d %b %Y, %I:%M %p")
        else:
            d["created_at"] = ""

        if item.updated_at:
            utc_dt = item.updated_at.replace(tzinfo=timezone.utc)
            ist_dt = utc_dt.astimezone(IST)
            d["updated_at"] = ist_dt.strftime("%d %b %Y, %I:%M %p")
        else:
            d["updated_at"] = ""

        # Resolve user name and email
        usr = users_dict.get(item.user_id)
        if usr:
            d["user_name"] = usr.full_name or usr.email
            d["user_email"] = usr.email
        else:
            d["user_name"] = "System"
            d["user_email"] = "system@ai-setu.com"

        data.append(d)

    response_data = build_paginated_response(data, total, page, per_page)
    return PaginatedResponse(**response_data)
