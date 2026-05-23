from typing import Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Query, HTTPException
from beanie import PydanticObjectId
import random

from middleware.auth_middleware import get_current_user, get_current_org
from models.user import User
from models.organization import Organization
from models.payroll import Payroll
from models.employee import Employee
from schemas.common import SuccessResponse
from utils.security import decrypt_field
from utils.helpers import parse_object_id, paginate_params, build_paginated_response
from services.audit_service import log_action

router = APIRouter(prefix="/api/v1/payroll", tags=["Payroll"])

@router.get("")
async def get_payrolls(
    month: Optional[str] = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    org: Optional[Organization] = Depends(get_current_org)
):
    query = {}
    if org:
        query["org_id"] = str(org.id)
    if month:
        query["month"] = month

    from middleware.rbac import get_permission
    perm = get_permission(current_user.role, "payroll")
    if not perm:
        raise HTTPException(status_code=403, detail="You do not have access to payroll")

    if perm == "own":
        emp = await Employee.find_one(Employee.user_id == current_user.id)
        if not emp:
            return SuccessResponse(data=[])
        query["employee_id"] = str(emp.id)
        
    skip, limit = paginate_params(page, per_page)
    payrolls = await Payroll.find(query).skip(skip).limit(limit).to_list()
    total = await Payroll.find(query).count()
    
    result = []
    for p in payrolls:
        d = p.model_dump()
        d["id"] = str(d.pop("_id", p.id))
        
        # fetch employee
        emp = None
        try:
            emp = await Employee.get(PydanticObjectId(p.employee_id))
        except Exception:
            pass
            
        if emp:
            d["employee"] = {
                "id": str(emp.id),
                "name": emp.name,
                "email": emp.email,
                "role": emp.role,
                "department": emp.department,
            }
        else:
            d["employee"] = {"id": p.employee_id, "name": "Unknown Employee", "email": ""}
            
        result.append(d)
        
    return SuccessResponse(data=build_paginated_response(result, total, page, per_page))

from middleware.rbac import require_module_full

@router.post("/generate")
async def generate_payroll(
    month: str,
    current_user: User = Depends(require_module_full("payroll")),
    org: Optional[Organization] = Depends(get_current_org)
):
    # Fetch all active employees
    query = {"is_deleted": False}
    if org:
        query["org_id"] = org.id
        
    employees = await Employee.find(query).to_list()
    
    generated = 0
    for emp in employees:
        # Check if already exists
        existing = await Payroll.find_one({
            "employee_id": str(emp.id), 
            "month": month,
            "org_id": str(org.id) if org else ""
        })
        if existing:
            continue
            
        # Basic generation logic
        basic = 50000.0
        if emp.salary_encrypted:
            try:
                basic = float(decrypt_field(emp.salary_encrypted))
            except Exception:
                pass
                
        working_days = 22
        leaves = random.randint(0, 2)
        worked_days = working_days - leaves
        deductions = (basic / working_days) * leaves
        
        # Calculate overtime pay for this employee and month
        from models.overtime import Overtime
        overtimes = await Overtime.find({
            "employee_id": str(emp.id),
            "month": month,
            "org_id": str(org.id) if org else ""
        }).to_list()
        overtime_pay = sum(o.amount for o in overtimes)
        
        net_pay = basic + overtime_pay - deductions
        
        p = Payroll(
            employee_id=str(emp.id),
            org_id=str(org.id) if org else "",
            month=month,
            working_days=working_days,
            worked_days=worked_days,
            leaves=leaves,
            basic=basic,
            bonus=overtime_pay,
            deductions=deductions,
            net_pay=net_pay,
            status="Pending"
        )
        await p.insert()
        await log_action(str(org.id) if org else None, str(current_user.id), "create", "payroll", str(p.id))
        generated += 1
        
    return SuccessResponse(message=f"Successfully generated payroll for {generated} employees.")

from schemas.payroll import PayrollUpdate

@router.put("/{payroll_id}")
async def update_payroll(
    payroll_id: str,
    data: PayrollUpdate,
    current_user: User = Depends(require_module_full("payroll")),
    org: Optional[Organization] = Depends(get_current_org)
):
    query = {"_id": parse_object_id(payroll_id, "payroll_id")}
    if org:
        query["org_id"] = str(org.id)
        
    payroll = await Payroll.find_one(query)
    if not payroll:
        raise HTTPException(status_code=404, detail="Payroll not found")
        
    update_data = data.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(payroll, k, v)
        
    await payroll.save()
    
    # Sync status and net_pay to Expenses collection
    if payroll.status == "Paid":
        emp = None
        try:
            emp = await Employee.get(PydanticObjectId(payroll.employee_id))
        except Exception:
            pass
        emp_name = emp.name if emp else "Unknown Employee"
        
        from models.expense import Expense
        existing_exp = await Expense.find_one({
            "related_type": "payroll",
            "related_id": str(payroll.id),
            "is_deleted": False
        })
        if existing_exp:
            existing_exp.amount = payroll.net_pay
            existing_exp.description = f"Salary for {emp_name} - {payroll.month}"
            existing_exp.updated_at = datetime.now(timezone.utc)
            await existing_exp.save()
        else:
            expense = Expense(
                org_id=parse_object_id(payroll.org_id, "org_id"),
                expense_date=datetime.now(timezone.utc),
                category="Salaries",
                amount=payroll.net_pay,
                currency="INR",
                payment_method="Bank Transfer",
                status="paid",
                related_type="payroll",
                related_id=str(payroll.id),
                description=f"Salary for {emp_name} - {payroll.month}",
                created_by=current_user.id
            )
            await expense.insert()
    elif payroll.status == "Pending":
        from models.expense import Expense
        linked_expenses = await Expense.find({
            "related_type": "payroll",
            "related_id": str(payroll.id)
        }).to_list()
        for exp in linked_expenses:
            await exp.delete()
            
    await log_action(str(org.id) if org else None, str(current_user.id), "update", "payroll", str(payroll.id), changes=update_data)
    
    return SuccessResponse(message="Payroll updated successfully")
