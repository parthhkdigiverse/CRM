from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Query, HTTPException, status
from beanie import PydanticObjectId

from middleware.auth_middleware import get_current_user, get_current_org, org_filter, require_roles
from middleware.rbac import require_module_write, require_module_read
from models.user import User
from models.organization import Organization
from models.employee import Employee
from models.overtime import Overtime
from models.payroll import Payroll
from models.expense import Expense
from schemas.overtime import OvertimeCreate, OvertimeResponse
from schemas.common import SuccessResponse, PaginatedResponse
from utils.helpers import paginate_params, build_paginated_response, parse_object_id
from services.audit_service import log_action

router = APIRouter(prefix="/api/v1/overtime", tags=["Overtime"])


async def recalculate_payroll_for_month(employee_id: str, month: str, org_id: str, current_user_id: str):
    """
    Recalculates the employee's payroll for a specific month.
    Sets payroll.bonus to sum of all overtime amounts for that month,
    recalculates net_pay, and updates the linked expense if already Paid.
    """
    # 1. Sum all overtimes for this employee and month
    overtimes = await Overtime.find({
        "employee_id": employee_id,
        "month": month,
        "org_id": org_id
    }).to_list()
    total_overtime_pay = sum(o.amount for o in overtimes)

    # 2. Find the payroll entry
    payroll = await Payroll.find_one({
        "employee_id": employee_id,
        "month": month,
        "org_id": org_id
    })

    if payroll:
        payroll.bonus = total_overtime_pay
        payroll.net_pay = payroll.basic + payroll.bonus - payroll.deductions
        await payroll.save()

        # 3. If payroll was already Paid, sync to Expense
        if payroll.status == "Paid":
            emp = await Employee.get(PydanticObjectId(payroll.employee_id))
            emp_name = emp.name if emp else "Unknown Employee"
            
            existing_exp = await Expense.find_one({
                "related_type": "payroll",
                "related_id": str(payroll.id),
                "is_deleted": False
            })
            if existing_exp:
                existing_exp.amount = payroll.net_pay
                existing_exp.description = f"Salary for {emp_name} - {payroll.month}"
                await existing_exp.save()


@router.post("", response_model=SuccessResponse, dependencies=[Depends(require_roles("admin", "super_admin", "hr"))])
async def log_overtime(
    data: OvertimeCreate,
    current_user: User = Depends(require_module_write("employees")),  # Guarded by employee write permission
    org: Optional[Organization] = Depends(get_current_org)
):
    org_id_str = str(org.id) if org else str(current_user.org_id)
    
    # 1. Fetch target employee
    employee_obj_id = parse_object_id(data.employee_id, "employee_id")
    employee = await Employee.find_one(org_filter(org, {"_id": employee_obj_id}))
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # 2. Calculate values
    rate = employee.overtime_rate or 0.0
    amount = data.hours * rate
    month_name = data.date.strftime("%B %Y")  # e.g., "May 2026"

    # 3. Create Overtime log
    overtime = Overtime(
        employee_id=str(employee.id),
        org_id=org_id_str,
        date=data.date,
        hours=data.hours,
        rate=rate,
        amount=amount,
        description=data.description,
        month=month_name,
        created_by=current_user.id
    )
    await overtime.insert()
    await log_action(org_id_str, str(current_user.id), "create", "overtime", str(overtime.id))

    # 4. Trigger payroll recalculation
    await recalculate_payroll_for_month(str(employee.id), month_name, org_id_str, str(current_user.id))

    return SuccessResponse(
        data={"id": str(overtime.id), "amount": amount},
        message="Overtime logged successfully and payroll updated."
    )


@router.get("", response_model=PaginatedResponse, dependencies=[Depends(require_roles("admin", "super_admin", "hr"))])
async def list_overtimes(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_module_read("employees")),
    org: Optional[Organization] = Depends(get_current_org)
):
    skip, limit = paginate_params(page, per_page)
    query: dict = {}
    if org:
        query["org_id"] = str(org.id)

    items = await Overtime.find(query).sort("-date").skip(skip).limit(limit).to_list()
    total = await Overtime.find(query).count()

    # Hydrate employee names
    data = []
    for item in items:
        emp = None
        try:
            emp = await Employee.get(PydanticObjectId(item.employee_id))
        except Exception:
            pass
        emp_name = emp.name if emp else "Unknown Employee"

        d = {
            "id": str(item.id),
            "employee_id": item.employee_id,
            "employee_name": emp_name,
            "date": item.date.isoformat(),
            "hours": item.hours,
            "rate": item.rate,
            "amount": item.amount,
            "description": item.description,
            "month": item.month,
            "created_at": item.created_at.isoformat()
        }
        data.append(d)

    response_data = build_paginated_response(data, total, page, per_page)
    return PaginatedResponse(**response_data)


@router.delete("/{overtime_id}", response_model=SuccessResponse, dependencies=[Depends(require_roles("admin", "super_admin", "hr"))])
async def delete_overtime(
    overtime_id: str,
    current_user: User = Depends(require_module_write("employees")),
    org: Optional[Organization] = Depends(get_current_org)
):
    org_id_str = str(org.id) if org else str(current_user.org_id)
    overtime_obj_id = parse_object_id(overtime_id, "overtime_id")
    
    del_query: dict = {"_id": overtime_obj_id}
    if org:
        del_query["org_id"] = str(org.id)
    overtime = await Overtime.find_one(del_query)
    if not overtime:
        raise HTTPException(status_code=404, detail="Overtime record not found")

    employee_id = overtime.employee_id
    month_name = overtime.month

    await overtime.delete()
    await log_action(org_id_str, str(current_user.id), "delete", "overtime", overtime_id)

    # Trigger payroll recalculation
    await recalculate_payroll_for_month(employee_id, month_name, org_id_str, str(current_user.id))

    return SuccessResponse(message="Overtime record deleted successfully and payroll updated.")
