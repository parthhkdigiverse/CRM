"""
Attendance routes for check-in, check-out, and daily overview.
"""

from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from beanie import PydanticObjectId

from middleware.auth_middleware import get_current_user, get_current_org, org_filter
from middleware.rbac import require_module_read, require_module_write, require_module_full
from models.user import User
from models.organization import Organization
from models.employee import Employee
from models.attendance import Attendance
from schemas.attendance import AttendanceCheckIn, AttendanceCheckOut, AttendanceResponse
from schemas.common import SuccessResponse
from utils.helpers import utc_now
from services.audit_service import log_action

router = APIRouter(prefix="/api/v1/attendance", tags=["Attendance"])


def get_today_date_str() -> str:
    """Get current date as YYYY-MM-DD in UTC (or timezone offset)."""
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


async def get_or_create_user_employee(user: User, org_id: PydanticObjectId) -> Employee:
    """Helper to get or automatically create an Employee record for the logged-in user."""
    employee = await Employee.find_one(Employee.user_id == user.id, Employee.is_deleted == False)
    if not employee:
        # Create a default employee record to link to the logged-in user
        name_parts = user.email.split("@")[0].title()
        employee = Employee(
            name=user.name or name_parts,
            email=user.email,
            user_id=user.id,
            org_id=org_id,
            created_by=user.id,
            role="Admin" if user.role == "admin" else "Employee",
            department="Management" if user.role == "admin" else "Engineering",
            status="active"
        )
        await employee.insert()
    return employee


@router.post("/check-in", response_model=SuccessResponse)
async def check_in(
    data: AttendanceCheckIn,
    current_user: User = Depends(require_module_write("attendance")),
    org: Optional[Organization] = Depends(get_current_org)
):
    # Resolve target employee
    if data.employee_id:
        employee = await Employee.find_one(org_filter(org, {"_id": PydanticObjectId(data.employee_id)}))
        if not employee:
            raise HTTPException(status_code=404, detail="Employee not found")
        if current_user.role == "employee" and employee.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="You can only check-in for yourself")
    else:
        employee = await get_or_create_user_employee(current_user, org.id if org else None)

    today_str = get_today_date_str()
    
    # Check if already checked in today
    existing = await Attendance.find_one(Attendance.employee_id == employee.id, Attendance.date == today_str)
    if existing:
        raise HTTPException(status_code=400, detail="Already checked in today")

    now = utc_now()
    
    # Determine late status (Pune/Indian Standard Time is UTC+5.5, let's determine status based on standard check-in hour)
    # Late cutoff is 09:30 AM local time
    # Check current hour/minute in local time (using simple UTC offset or system local time)
    local_hour = datetime.now().hour
    local_minute = datetime.now().minute
    
    # If check-in is after 09:30 AM local time, mark as late
    status_str = "present"
    if local_hour > 9 or (local_hour == 9 and local_minute > 30):
        status_str = "late"

    attendance = Attendance(
        employee_id=employee.id,
        date=today_str,
        check_in=now,
        status=status_str,
        org_id=org.id if org else None
    )
    await attendance.insert()
    await log_action(str(org.id) if org else None, str(current_user.id), "create", "attendance", str(attendance.id), changes={"employee_name": employee.name, "action": "check-in"})

    return SuccessResponse(
        data={
            "id": str(attendance.id),
            "check_in": attendance.check_in,
            "status": attendance.status
        },
        message="Checked in successfully"
    )


@router.post("/check-out", response_model=SuccessResponse)
async def check_out(
    data: AttendanceCheckOut,
    current_user: User = Depends(require_module_write("attendance")),
    org: Optional[Organization] = Depends(get_current_org)
):
    # Resolve target employee
    if data.employee_id:
        employee = await Employee.find_one(org_filter(org, {"_id": PydanticObjectId(data.employee_id)}))
        if not employee:
            raise HTTPException(status_code=404, detail="Employee not found")
        if current_user.role == "employee" and employee.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="You can only check-in for yourself")
    else:
        employee = await get_or_create_user_employee(current_user, org.id if org else None)

    today_str = get_today_date_str()
    
    # Find existing check-in
    attendance = await Attendance.find_one(Attendance.employee_id == employee.id, Attendance.date == today_str)
    if not attendance:
        raise HTTPException(status_code=400, detail="You must check in before checking out")
        
    if attendance.check_out:
        raise HTTPException(status_code=400, detail="Already checked out today")

    attendance.check_out = utc_now()
    attendance.updated_at = utc_now()
    await attendance.save()

    await log_action(str(org.id) if org else None, str(current_user.id), "update", "attendance", str(attendance.id), changes={"employee_name": employee.name, "action": "check-out"})

    return SuccessResponse(
        data={
            "id": str(attendance.id),
            "check_out": attendance.check_out
        },
        message="Checked out successfully"
    )


@router.get("/today", response_model=SuccessResponse)
async def get_today_attendance(
    current_user: User = Depends(require_module_read("attendance")),
    org: Optional[Organization] = Depends(get_current_org)
):
    today_str = get_today_date_str()
    
    # 1. Fetch all active employees
    emp_query = org_filter(org)
    if current_user.role == "employee":
        emp_query["user_id"] = current_user.id
    employees = await Employee.find(emp_query).to_list()
    
    # 2. Fetch all attendance logs for today
    logs = await Attendance.find(org_filter(org, {"date": today_str})).to_list()
    logs_map = {log.employee_id: log for log in logs}
    
    # 3. Combine them
    records = []
    present_cnt = 0
    late_cnt = 0
    on_leave_cnt = 0
    absent_cnt = 0
    
    for emp in employees:
        log = logs_map.get(emp.id)
        
        status_str = "absent"
        if emp.status == "on_leave":
            status_str = "on_leave"
        elif log:
            status_str = log.status

        # Calculate counts
        if status_str == "present":
            present_cnt += 1
        elif status_str == "late":
            late_cnt += 1
        elif status_str == "on_leave":
            on_leave_cnt += 1
        elif status_str == "absent":
            absent_cnt += 1
            
        records.append({
            "employee_id": str(emp.id),
            "name": emp.name,
            "role": emp.role or "Employee",
            "department": emp.department or "Sales",
            "check_in": log.check_in if log else None,
            "check_out": log.check_out if log else None,
            "status": status_str,
        })
        
    return SuccessResponse(
        data={
            "records": records,
            "summary": {
                "present": present_cnt,
                "late": late_cnt,
                "on_leave": on_leave_cnt,
                "absent": absent_cnt,
                "total": len(employees)
            }
        }
    )
