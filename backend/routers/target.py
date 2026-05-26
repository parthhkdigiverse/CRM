"""
Target routes — CRUD for goals, KPIs and achievement tracking.
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from beanie import PydanticObjectId

from middleware.auth_middleware import get_current_user, get_current_org, org_filter
from middleware.rbac import require_module_read, require_module_full
from models.user import User
from models.organization import Organization
from models.target import Target
from schemas.target import TargetCreate, TargetUpdate
from schemas.common import SuccessResponse, PaginatedResponse
from utils.helpers import paginate_params, build_paginated_response, build_sort_params, utc_now
from services.audit_service import log_action

router = APIRouter(prefix="/api/v1/targets", tags=["Targets"])


async def validate_target_owner(
    owner: Optional[str],
    current_user: User,
    org: Optional[Organization],
) -> Optional[str]:
    if not owner:
        return None

    try:
        owner_id = PydanticObjectId(owner)
    except Exception:
        raise HTTPException(status_code=400, detail="Assigned user must be selected from the list")

    assignee = await User.get(owner_id)
    if not assignee or not assignee.is_active or assignee.is_deleted:
        raise HTTPException(status_code=400, detail="Assigned user not found")

    if org and assignee.org_id != org.id:
        raise HTTPException(status_code=400, detail="Assigned user must belong to your organization")

    if current_user.role in {"admin", "super_admin"}:
        if assignee.role not in {"hr", "employee"}:
            raise HTTPException(status_code=403, detail="Admin can assign targets only to HR or employees")
    elif current_user.role == "hr":
        if assignee.role != "employee":
            raise HTTPException(status_code=403, detail="HR can assign targets only to employees")
    else:
        raise HTTPException(status_code=403, detail="You do not have permission to assign targets")

    return str(assignee.id)


async def target_to_dict(target: Target) -> dict:
    data = target.model_dump()
    data["id"] = str(data.pop("_id", target.id))
    data["org_id"] = str(data["org_id"])
    data["created_by"] = str(data["created_by"])

    data["owner_id"] = data.get("owner")
    data["owner_name"] = data.get("owner")
    owner = data.get("owner")
    if owner:
        try:
            owner_user = await User.get(PydanticObjectId(owner))
            if owner_user:
                data["owner_name"] = owner_user.full_name.strip() or owner_user.email
                data["owner"] = data["owner_name"]
        except Exception:
            pass

    return data


@router.post("", response_model=SuccessResponse)
async def create_target(
    data: TargetCreate,
    current_user: User = Depends(require_module_full("targets")),
    org: Optional[Organization] = Depends(get_current_org)
):
    payload = data.model_dump()
    payload["owner"] = await validate_target_owner(payload.get("owner"), current_user, org)
    assignee = await User.get(PydanticObjectId(payload["owner"])) if payload.get("owner") else None
    target_org_id = org.id if org else assignee.org_id if assignee else current_user.org_id
    if not target_org_id:
        raise HTTPException(status_code=400, detail="Target must belong to an organization")

    target = Target(
        org_id=target_org_id,
        created_by=current_user.id,
        **payload
    )
    await target.insert()
    await log_action(str(org.id) if org else "super_admin", str(current_user.id), "create", "targets", str(target.id), changes=payload)
    return SuccessResponse(data={"id": str(target.id)}, message="Target created successfully")


@router.get("", response_model=PaginatedResponse)
async def list_targets(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc"),
    status: Optional[str] = None,
    search: Optional[str] = None,
    current_user: User = Depends(require_module_read("targets")),
    org: Optional[Organization] = Depends(get_current_org)
):
    skip, limit = paginate_params(page, per_page)
    sort = build_sort_params(sort_by, sort_order)

    query = org_filter(org)
    if current_user.role == "employee":
        query["owner"] = str(current_user.id)
    if status:
        query["status"] = status
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"owner": {"$regex": search, "$options": "i"}},
        ]

    cursor = Target.find(query).sort(sort).skip(skip).limit(limit)
    items = await cursor.to_list()
    total = await Target.find(query).count()

    data = [await target_to_dict(item) for item in items]

    response_data = build_paginated_response(data, total, page, per_page)
    return PaginatedResponse(**response_data)


@router.get("/{target_id}", response_model=SuccessResponse)
async def get_target(
    target_id: str,
    current_user: User = Depends(require_module_read("targets")),
    org: Optional[Organization] = Depends(get_current_org)
):
    target = await Target.find_one(org_filter(org, {"_id": PydanticObjectId(target_id)}))
    if not target:
        raise HTTPException(status_code=404, detail="Target not found")

    if current_user.role == "employee" and target.owner != str(current_user.id):
        raise HTTPException(status_code=403, detail="You do not have permission to access this target")

    return SuccessResponse(data=await target_to_dict(target))


@router.put("/{target_id}", response_model=SuccessResponse)
async def update_target(
    target_id: str,
    data: TargetUpdate,
    current_user: User = Depends(require_module_full("targets")),
    org: Optional[Organization] = Depends(get_current_org)
):
    target = await Target.find_one(org_filter(org, {"_id": PydanticObjectId(target_id)}))
    if not target:
        raise HTTPException(status_code=404, detail="Target not found")

    changes = {}
    update_data = data.model_dump(exclude_unset=True)
    if "owner" in update_data:
        update_data["owner"] = await validate_target_owner(update_data["owner"], current_user, org)
        if not org and update_data["owner"]:
            assignee = await User.get(PydanticObjectId(update_data["owner"]))
            if assignee and assignee.org_id:
                target.org_id = assignee.org_id

    for key, value in update_data.items():
        old_val = getattr(target, key, None)
        if old_val != value:
            changes[key] = value
            setattr(target, key, value)

    target.updated_by = current_user.id
    target.updated_at = utc_now()
    await target.save()
    await log_action(str(org.id) if org else "super_admin", str(current_user.id), "update", "targets", str(target.id), changes=changes)
    return SuccessResponse(message="Target updated successfully")


@router.delete("/{target_id}", response_model=SuccessResponse)
async def delete_target(
    target_id: str,
    current_user: User = Depends(require_module_full("targets")),
    org: Optional[Organization] = Depends(get_current_org)
):
    target = await Target.find_one(org_filter(org, {"_id": PydanticObjectId(target_id)}))
    if not target:
        raise HTTPException(status_code=404, detail="Target not found")

    target.is_deleted = True
    target.deleted_at = utc_now()
    target.deleted_by = current_user.id
    await target.save()
    await log_action(str(org.id) if org else "super_admin", str(current_user.id), "delete", "targets", str(target.id))
    return SuccessResponse(message="Target deleted successfully")
