"""
Task routes.
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from beanie import PydanticObjectId

from middleware.auth_middleware import get_current_user, get_current_org, org_filter
from middleware.rbac import require_module_read, require_module_write, require_module_full
from models.user import User
from models.organization import Organization
from models.task import Task, TaskComment
from schemas.task import TaskCreate, TaskUpdate, TaskResponse, CommentCreate
from schemas.common import SuccessResponse, PaginatedResponse
from utils.helpers import paginate_params, build_paginated_response, build_sort_params, utc_now
from services.audit_service import log_action

router = APIRouter(prefix="/api/v1/tasks", tags=["Tasks"])


@router.post("", response_model=SuccessResponse)
async def create_task(
    data: TaskCreate,
    current_user: User = Depends(require_module_write("tasks")),
    org: Optional[Organization] = Depends(get_current_org)
):
    task = Task(
        org_id=org.id if org else None,
        created_by=current_user.id,
        **data.model_dump(exclude={"assigned_to", "linked_id"})
    )
    if data.assigned_to: task.assigned_to = PydanticObjectId(data.assigned_to)
    if data.linked_id: task.linked_id = PydanticObjectId(data.linked_id)

    await task.insert()
    await log_action(str(org.id) if org else "super_admin", str(current_user.id), "create", "tasks", str(task.id))
    
    return SuccessResponse(data={"id": str(task.id)}, message="Task created successfully")


@router.get("", response_model=PaginatedResponse)
async def list_tasks(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    sort_by: str = Query("due_date"),
    sort_order: str = Query("asc"),
    status: Optional[str] = None,
    assigned_to: Optional[str] = None,
    current_user: User = Depends(require_module_read("tasks")),
    org: Optional[Organization] = Depends(get_current_org)
):
    skip, limit = paginate_params(page, per_page)
    sort = build_sort_params(sort_by, sort_order)
    
    query = org_filter(org)
    if current_user.role == "employee":
        query["assigned_to"] = current_user.id
        
    if status:
        query["status"] = status
    if assigned_to:
        query["assigned_to"] = PydanticObjectId(assigned_to)
        
    cursor = Task.find(query).sort(sort).skip(skip).limit(limit)
    items = await cursor.to_list()
    total = await Task.find(query).count()
    
    data = []
    for item in items:
        d = item.model_dump()
        d["id"] = str(d.pop("_id", item.id))
        if d.get("assigned_to"): d["assigned_to"] = str(d["assigned_to"])
        if d.get("linked_id"): d["linked_id"] = str(d["linked_id"])
        
        # Convert comments object ids
        for c in d.get("comments", []):
            if c.get("user_id"): c["user_id"] = str(c["user_id"])
            
        data.append(d)
        
    response_data = build_paginated_response(data, total, page, per_page)
    return PaginatedResponse(**response_data)


@router.get("/{task_id}", response_model=SuccessResponse)
async def get_task(
    task_id: str,
    current_user: User = Depends(require_module_read("tasks")),
    org: Optional[Organization] = Depends(get_current_org)
):
    task = await Task.find_one(org_filter(org, {"_id": PydanticObjectId(task_id)}))
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if current_user.role == "employee" and task.assigned_to != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have permission to access this task")
        
    d = task.model_dump()
    d["id"] = str(d.pop("_id", task.id))
    if d.get("assigned_to"): d["assigned_to"] = str(d["assigned_to"])
    if d.get("linked_id"): d["linked_id"] = str(d["linked_id"])
    for c in d.get("comments", []):
        if c.get("user_id"): c["user_id"] = str(c["user_id"])
        
    return SuccessResponse(data=d)


@router.put("/{task_id}", response_model=SuccessResponse)
async def update_task(
    task_id: str,
    data: TaskUpdate,
    current_user: User = Depends(require_module_write("tasks")),
    org: Optional[Organization] = Depends(get_current_org)
):
    task = await Task.find_one(org_filter(org, {"_id": PydanticObjectId(task_id)}))
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if current_user.role == "employee" and task.assigned_to != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have permission to access this task")
        
    update_data = data.model_dump(exclude_unset=True)
    if "assigned_to" in update_data:
        update_data["assigned_to"] = PydanticObjectId(update_data["assigned_to"]) if update_data["assigned_to"] else None
    if "linked_id" in update_data:
        update_data["linked_id"] = PydanticObjectId(update_data["linked_id"]) if update_data["linked_id"] else None
        
    for k, v in update_data.items():
        setattr(task, k, v)
        
    task.updated_by = current_user.id
    task.updated_at = utc_now()
    await task.save()
    
    await log_action(str(org.id) if org else "super_admin", str(current_user.id), "update", "tasks", str(task.id), changes=update_data)
    
    return SuccessResponse(message="Task updated successfully")


@router.delete("/{task_id}", response_model=SuccessResponse)
async def delete_task(
    task_id: str,
    current_user: User = Depends(require_module_write("tasks")),
    org: Optional[Organization] = Depends(get_current_org)
):
    task = await Task.find_one(org_filter(org, {"_id": PydanticObjectId(task_id)}))
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if current_user.role == "employee" and task.assigned_to != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have permission to access this task")
        
    task.is_deleted = True
    task.deleted_at = utc_now()
    task.deleted_by = current_user.id
    await task.save()
    
    await log_action(str(org.id) if org else "super_admin", str(current_user.id), "delete", "tasks", str(task.id))
    
    return SuccessResponse(message="Task deleted successfully")


@router.post("/{task_id}/comments", response_model=SuccessResponse)
async def add_task_comment(
    task_id: str,
    data: CommentCreate,
    current_user: User = Depends(require_module_write("tasks")),
    org: Optional[Organization] = Depends(get_current_org)
):
    task = await Task.find_one(org_filter(org, {"_id": PydanticObjectId(task_id)}))
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if current_user.role == "employee" and task.assigned_to != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have permission to access this task")
        
    comment = TaskComment(
        user_id=current_user.id,
        content=data.content
    )
    task.comments.append(comment)
    task.updated_by = current_user.id
    task.updated_at = utc_now()
    await task.save()
    
    return SuccessResponse(message="Comment added successfully")
