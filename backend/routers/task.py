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
from models.employee import Employee
from models.notification import Notification
from models.task import Task, TaskComment
from schemas.task import TaskCreate, TaskUpdate, TaskResponse, CommentCreate
from schemas.common import SuccessResponse, PaginatedResponse
from utils.helpers import paginate_params, build_paginated_response, build_sort_params, utc_now, parse_object_id
from services.audit_service import log_action

router = APIRouter(prefix="/api/v1/tasks", tags=["Tasks"])


async def get_employee_for_user(user: User, org: Optional[Organization]) -> Optional[Employee]:
    """Return the employee profile linked to the authenticated user."""
    return await Employee.find_one(org_filter(org, {"user_id": user.id}))


async def create_task_assignment_notification(
    task: Task,
    assignee: Optional[Employee],
    current_user: User,
    org: Optional[Organization],
) -> None:
    """Notify an assignee that a task is waiting for acceptance."""
    if not assignee or not assignee.user_id:
        return
    try:
        notification = Notification(
            org_id=org.id if org else task.org_id,
            user_id=assignee.user_id,
            created_by=current_user.id,
            type="task_assigned",
            title="New task assigned",
            message=f"{current_user.full_name or current_user.email} assigned you: {task.title}",
            entity_type="task",
            entity_id=task.id,
        )
        await notification.insert()
    except Exception:
        pass


def serialize_task(task: Task) -> dict:
    """Convert task document to API-safe dict."""
    d = task.model_dump()
    d["id"] = str(d.pop("_id", task.id))
    if d.get("assigned_to"):
        d["assigned_to"] = str(d["assigned_to"])
    if d.get("linked_id"):
        d["linked_id"] = str(d["linked_id"])
    for c in d.get("comments", []):
        if c.get("user_id"):
            c["user_id"] = str(c["user_id"])
    return d


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
    assignee = None
    if data.assigned_to:
        assignee_id = parse_object_id(data.assigned_to, "assigned_to")
        assignee = await Employee.find_one(org_filter(org, {"_id": assignee_id}))
        if not assignee:
            raise HTTPException(status_code=400, detail="Assigned employee not found")
        task.assigned_to = assignee.id
        if current_user.role in {"admin", "super_admin"} and (assignee.role or "").lower() == "hr":
            task.status = "pending_acceptance"
    if data.linked_id: task.linked_id = parse_object_id(data.linked_id, "linked_id")

    await task.insert()
    if task.status == "pending_acceptance":
        await create_task_assignment_notification(task, assignee, current_user, org)
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
        emp = await get_employee_for_user(current_user, org)
        query["assigned_to"] = emp.id if emp else None
        
    if status:
        query["status"] = status
    else:
        query["status"] = {"$ne": "pending_acceptance"}
    if assigned_to:
        query["assigned_to"] = parse_object_id(assigned_to, "assigned_to")
        
    cursor = Task.find(query).sort(sort).skip(skip).limit(limit)
    items = await cursor.to_list()
    total = await Task.find(query).count()
    
    data = []
    for item in items:
        data.append(serialize_task(item))
        
    response_data = build_paginated_response(data, total, page, per_page)
    return PaginatedResponse(**response_data)


@router.get("/pending-assignments", response_model=SuccessResponse)
async def list_pending_task_assignments(
    current_user: User = Depends(require_module_read("tasks")),
    org: Optional[Organization] = Depends(get_current_org)
):
    emp = await get_employee_for_user(current_user, org)
    if not emp:
        return SuccessResponse(data=[])

    items = await Task.find(
        org_filter(org, {
            "assigned_to": emp.id,
            "status": "pending_acceptance",
        })
    ).sort("-created_at").limit(50).to_list()

    creator_ids = {item.created_by for item in items if item.created_by}
    creators = {}
    if creator_ids:
        users = await User.find({"_id": {"$in": list(creator_ids)}}).to_list()
        creators = {user.id: user for user in users}

    data = []
    for item in items:
        d = serialize_task(item)
        creator = creators.get(item.created_by)
        d["assigned_by_name"] = creator.full_name if creator else "Admin"
        data.append(d)

    return SuccessResponse(data=data)


@router.post("/{task_id}/accept", response_model=SuccessResponse)
async def accept_task_assignment(
    task_id: str,
    current_user: User = Depends(require_module_write("tasks")),
    org: Optional[Organization] = Depends(get_current_org)
):
    emp = await get_employee_for_user(current_user, org)
    if not emp:
        raise HTTPException(status_code=403, detail="Employee profile is required to accept tasks")

    task = await Task.find_one(org_filter(org, {"_id": parse_object_id(task_id, "task_id")}))
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.assigned_to != emp.id:
        raise HTTPException(status_code=403, detail="You can only accept tasks assigned to you")
    if task.status != "pending_acceptance":
        raise HTTPException(status_code=400, detail="Task is not waiting for acceptance")

    task.status = "todo"
    task.updated_by = current_user.id
    task.updated_at = utc_now()
    await task.save()

    await Notification.find(
        Notification.user_id == current_user.id,
        Notification.entity_type == "task",
        Notification.entity_id == task.id,
        Notification.is_deleted == False,
    ).update({"$set": {"is_read": True, "updated_at": utc_now()}})
    await log_action(str(org.id) if org else "super_admin", str(current_user.id), "accept", "tasks", str(task.id))
    return SuccessResponse(data={"id": str(task.id), "status": task.status}, message="Task accepted")


@router.get("/{task_id}", response_model=SuccessResponse)
async def get_task(
    task_id: str,
    current_user: User = Depends(require_module_read("tasks")),
    org: Optional[Organization] = Depends(get_current_org)
):
    task = await Task.find_one(org_filter(org, {"_id": parse_object_id(task_id, "task_id")}))
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if current_user.role == "employee":
        emp = await get_employee_for_user(current_user, org)
        if not emp or task.assigned_to != emp.id:
            raise HTTPException(status_code=403, detail="You do not have permission to access this task")
        
    return SuccessResponse(data=serialize_task(task))


@router.put("/{task_id}", response_model=SuccessResponse)
async def update_task(
    task_id: str,
    data: TaskUpdate,
    current_user: User = Depends(require_module_write("tasks")),
    org: Optional[Organization] = Depends(get_current_org)
):
    task = await Task.find_one(org_filter(org, {"_id": parse_object_id(task_id, "task_id")}))
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if current_user.role == "employee":
        emp = await get_employee_for_user(current_user, org)
        if not emp or task.assigned_to != emp.id:
            raise HTTPException(status_code=403, detail="You do not have permission to access this task")
        
    update_data = data.model_dump(exclude_unset=True)
    
    if current_user.role == "employee":
        allowed_keys = {"status"}
        update_keys = set(update_data.keys())
        if not update_keys.issubset(allowed_keys):
            raise HTTPException(status_code=403, detail="Employees can only update task status")
            
    if "assigned_to" in update_data:
        update_data["assigned_to"] = parse_object_id(update_data["assigned_to"], "assigned_to") if update_data["assigned_to"] else None
    if "linked_id" in update_data:
        update_data["linked_id"] = parse_object_id(update_data["linked_id"], "linked_id") if update_data["linked_id"] else None
        
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
    task = await Task.find_one(org_filter(org, {"_id": parse_object_id(task_id, "task_id")}))
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if current_user.role == "employee":
        emp = await get_employee_for_user(current_user, org)
        if not emp or task.assigned_to != emp.id:
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
    task = await Task.find_one(org_filter(org, {"_id": parse_object_id(task_id, "task_id")}))
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if current_user.role == "employee":
        emp = await get_employee_for_user(current_user, org)
        if not emp or task.assigned_to != emp.id:
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
