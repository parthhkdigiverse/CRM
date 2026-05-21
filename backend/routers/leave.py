"""
Leave routes for applying, viewing, and approving leaves.
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from beanie import PydanticObjectId

from middleware.auth_middleware import get_current_user, get_current_org, org_filter
from middleware.rbac import require_module_read, require_module_write
from models.user import User
from models.organization import Organization
from models.employee import Employee
from models.leave import Leave
from schemas.leave import LeaveCreate, LeaveUpdateStatus, LeaveResponse
from schemas.common import SuccessResponse
from utils.helpers import utc_now
from services.audit_service import log_action

router = APIRouter(prefix="/api/v1/leaves", tags=["Leaves"])


async def get_employee_for_user(user: User, org: Optional[Organization]) -> Employee:
    """Helper to get Employee record for logged-in user."""
    emp = await Employee.find_one(org_filter(org, {"user_id": user.id}))
    if not emp:
        raise HTTPException(status_code=400, detail="You do not have an employee profile yet")
    return emp


@router.post("/", response_model=SuccessResponse)
async def create_leave(
    data: LeaveCreate,
    current_user: User = Depends(get_current_user),
    org: Optional[Organization] = Depends(get_current_org)
):
    if data.employee_id and current_user.role in ['hr', 'admin', 'super_admin']:
        emp = await Employee.find_one(org_filter(org, {"_id": PydanticObjectId(data.employee_id)}))
        if not emp:
            raise HTTPException(status_code=404, detail="Employee not found")
        employee = emp
    else:
        employee = await get_employee_for_user(current_user, org)

    leave = Leave(
        employee_id=employee.id,
        leave_type=data.leave_type,
        duration_type=data.duration_type,
        start_date=data.start_date,
        end_date=data.end_date,
        reason=data.reason,
        org_id=org.id if org else None
    )
    await leave.insert()

    await log_action(
        str(org.id) if org else None,
        str(current_user.id),
        "create",
        "leave",
        str(leave.id),
        changes={"leave_type": data.leave_type, "start": data.start_date, "end": data.end_date}
    )

    return SuccessResponse(data={"id": str(leave.id)}, message="Leave request submitted successfully")


@router.get("/", response_model=SuccessResponse)
async def get_leaves(
    current_user: User = Depends(get_current_user),
    org: Optional[Organization] = Depends(get_current_org)
):
    query = org_filter(org)
    
    # If the user is an employee, they can only see their own leaves.
    if current_user.role == "employee":
        emp = await get_employee_for_user(current_user, org)
        query["employee_id"] = emp.id

    leaves = await Leave.find(query).sort("-created_at").to_list()
    
    # Enrich with employee names, user ids, and avatars
    employee_ids = list(set([leave.employee_id for leave in leaves]))
    employees = await Employee.find({"_id": {"$in": employee_ids}}).to_list()
    emp_name_map = {str(emp.id): emp.name for emp in employees}
    emp_user_map = {str(emp.id): str(emp.user_id) if emp.user_id else None for emp in employees}
    emp_avatar_map = {str(emp.id): emp.avatar_url for emp in employees}

    results = []
    for leave in leaves:
        results.append({
            "id": str(leave.id),
            "employee_id": str(leave.employee_id),
            "employee_user_id": emp_user_map.get(str(leave.employee_id)),
            "employee_name": emp_name_map.get(str(leave.employee_id), "Unknown"),
            "avatar_url": emp_avatar_map.get(str(leave.employee_id)),
            "leave_type": leave.leave_type,
            "duration_type": getattr(leave, "duration_type", "multiple_days"),
            "start_date": leave.start_date,
            "end_date": leave.end_date,
            "reason": leave.reason,
            "status": leave.status,
            "approver_id": str(leave.approver_id) if leave.approver_id else None,
            "approver_notes": leave.approver_notes,
            "created_at": leave.created_at,
            "updated_at": leave.updated_at
        })

    return SuccessResponse(data=results)


@router.put("/{leave_id}/status", response_model=SuccessResponse)
async def update_leave_status(
    leave_id: str,
    data: LeaveUpdateStatus,
    current_user: User = Depends(get_current_user),
    org: Optional[Organization] = Depends(get_current_org)
):
    # Only Admin or HR can approve leaves.
    if current_user.role not in ["admin", "hr"]:
        raise HTTPException(status_code=403, detail="You do not have permission to approve/reject leaves")

    leave = await Leave.find_one(org_filter(org, {"_id": PydanticObjectId(leave_id)}))
    if not leave:
        raise HTTPException(status_code=404, detail="Leave request not found")

    # Prevent HR/Admin from approving their own leave requests
    leave_emp = await Employee.find_one({"_id": leave.employee_id})
    if leave_emp and leave_emp.user_id and str(leave_emp.user_id) == str(current_user.id):
        raise HTTPException(status_code=403, detail="You cannot approve or reject your own leave request. Only an Admin can do this for you.")

    old_status = leave.status
    leave.status = data.status
    if data.approver_notes:
        leave.approver_notes = data.approver_notes
    leave.approver_id = current_user.id
    leave.updated_at = utc_now()
    
    await leave.save()

    await log_action(
        str(org.id) if org else None,
        str(current_user.id),
        "update",
        "leave",
        str(leave.id),
        changes={"old_status": old_status, "new_status": data.status}
    )

    return SuccessResponse(message=f"Leave request {data.status} successfully")
