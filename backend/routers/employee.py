"""
Employee routes with salary encryption.
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from beanie import PydanticObjectId

from middleware.auth_middleware import get_current_user, get_current_org, require_roles, org_filter
from middleware.rbac import require_module_read, require_module_write, require_module_full
from models.user import User
from models.organization import Organization
from models.employee import Employee
from schemas.employee import EmployeeCreate, EmployeeUpdate, EmployeeResponse, OvertimeRateUpdate
from schemas.common import SuccessResponse, PaginatedResponse
from utils.helpers import paginate_params, build_paginated_response, build_sort_params, utc_now, parse_object_id, escape_regex
from utils.security import encrypt_field, decrypt_field, hash_password
from services.audit_service import log_action

router = APIRouter(prefix="/api/v1/employees", tags=["Employees"])


async def resolve_employee_reference(
    value: Optional[str],
    org: Optional[Organization],
    field_name: str,
) -> Optional[PydanticObjectId]:
    """Resolve an employee reference from a scoped ObjectId or exact employee name."""
    if not value or not value.strip():
        return None

    raw_value = value.strip()
    try:
        employee_id = PydanticObjectId(raw_value)
        employee = await Employee.find_one(org_filter(org, {"_id": employee_id}))
        if not employee:
            raise HTTPException(status_code=400, detail=f"{field_name} employee not found")
        return employee.id
    except HTTPException:
        raise
    except Exception:
        pass

    escaped_name = escape_regex(raw_value, max_length=120)
    employee = await Employee.find_one(
        org_filter(org, {"name": {"$regex": f"^{escaped_name}$", "$options": "i"}})
    )
    if not employee:
        raise HTTPException(status_code=400, detail=f"{field_name} must be a valid employee ID or exact employee name")
    return employee.id


@router.post("", response_model=SuccessResponse, dependencies=[Depends(require_roles("admin", "super_admin", "hr"))])
async def create_employee(
    data: EmployeeCreate,
    current_user: User = Depends(require_module_write("employees")),
    org: Optional[Organization] = Depends(get_current_org)
):
    if not org and current_user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Organization context is required")

    # Fetch and apply the global overtime rate
    global_rate = 0.0
    if org:
        global_rate = org.settings.get("overtime_rate", 0.0)
    else:
        first_emp = await Employee.find_one({"is_deleted": {"$ne": True}})
        if first_emp:
            global_rate = first_emp.overtime_rate
    data.overtime_rate = global_rate

    resolved_reporting_to = await resolve_employee_reference(data.reporting_to, org, "Reporting manager")
    resolved_user_id = parse_object_id(data.user_id, "user_id") if data.user_id else None

    existing_employee = await Employee.find_one(
        org_filter(org, {"email": data.email.lower()})
    )
    if existing_employee:
        raise HTTPException(status_code=400, detail="An employee with this email address already exists.")

    # Check if we should create a user account
    user_id = None
    new_user = None
    if data.password:
        existing_user = await User.find_one(User.email == data.email.lower())
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A user account with this email address already exists."
            )
        
        # Parse name
        name_parts = data.name.strip().split(" ", 1)
        first_name = name_parts[0]
        last_name = name_parts[1] if len(name_parts) > 1 else ""
        
        hashed_pwd = hash_password(data.password)
        new_user = User(
            email=data.email.lower(),
            hashed_password=hashed_pwd,
            first_name=first_name,
            last_name=last_name,
            role=data.role or "employee",
            org_id=org.id if org else None,
            is_active=True,
            is_email_verified=True,
            auth_provider="local",
            created_by=current_user.id
        )
        await new_user.insert()
        user_id = new_user.id

    try:
        employee = Employee(
            org_id=org.id if org else current_user.org_id,
            created_by=current_user.id,
            **data.model_dump(exclude={"user_id", "reporting_to", "salary", "password"})
        )
        if user_id:
            employee.user_id = user_id
        elif resolved_user_id:
            employee.user_id = resolved_user_id
            
        employee.reporting_to = resolved_reporting_to
        
        if data.salary is not None:
            employee.salary_encrypted = encrypt_field(str(data.salary))

        await employee.insert()
    except Exception:
        if new_user:
            new_user.is_active = False
            new_user.is_deleted = True
            new_user.deleted_at = utc_now()
            new_user.deleted_by = current_user.id
            await new_user.save()
        raise

    try:
        await log_action(str(employee.org_id), str(current_user.id), "create", "employees", str(employee.id))
    except Exception:
        pass
    
    return SuccessResponse(data={"id": str(employee.id)}, message="Employee created successfully")


@router.get("", response_model=PaginatedResponse)
async def list_employees(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc"),
    search: Optional[str] = None,
    department: Optional[str] = None,
    current_user: User = Depends(require_module_read("employees")),
    org: Optional[Organization] = Depends(get_current_org)
):
    skip, limit = paginate_params(page, per_page)
    sort = build_sort_params(sort_by, sort_order)
    
    query = org_filter(org)
    if search:
        escaped_search = escape_regex(search)
        query["$or"] = [
            {"name": {"$regex": escaped_search, "$options": "i"}},
            {"email": {"$regex": escaped_search, "$options": "i"}},
        ]
    if department:
        query["department"] = department
        
    cursor = Employee.find(query).sort(sort).skip(skip).limit(limit)
    items = await cursor.to_list()
    total = await Employee.find(query).count()
    
    # Check if user can see salary
    can_see_salary = current_user.role in ["admin", "super_admin"]
    
    data = []
    for item in items:
        d = item.model_dump()
        d["id"] = str(d.pop("_id", item.id))
        if d.get("user_id"): d["user_id"] = str(d["user_id"])
        if d.get("reporting_to"): d["reporting_to"] = str(d["reporting_to"])
        
        d["salary"] = None
        if can_see_salary and item.salary_encrypted:
            try:
                d["salary"] = float(decrypt_field(item.salary_encrypted))
            except ValueError:
                pass
                
        d.pop("salary_encrypted", None)
        data.append(d)
        
    response_data = build_paginated_response(data, total, page, per_page)
    return PaginatedResponse(**response_data)


@router.get("/managers", response_model=SuccessResponse)
async def list_manager_options(
    current_user: User = Depends(require_module_read("employees")),
    org: Optional[Organization] = Depends(get_current_org)
):
    query = org_filter(org, {
        "$or": [
            {"role": {"$regex": "^(hr|admin|super_admin)$", "$options": "i"}},
            {"department": {"$regex": "^hr$", "$options": "i"}},
        ]
    })
    items = await Employee.find(query).sort("name").limit(200).to_list()
    return SuccessResponse(
        data=[
            {
                "id": str(item.id),
                "name": item.name,
                "role": item.role,
                "department": item.department,
            }
            for item in items
        ]
    )


@router.get("/overtime-rate", response_model=dict)
async def get_global_overtime_rate(
    org: Optional[Organization] = Depends(get_current_org)
):
    if org:
        rate = org.settings.get("overtime_rate", 0.0)
    else:
        first_emp = await Employee.find_one({"is_deleted": {"$ne": True}})
        rate = first_emp.overtime_rate if first_emp else 0.0
    return {"overtime_rate": rate}


@router.post("/overtime-rate", response_model=SuccessResponse, dependencies=[Depends(require_roles("admin", "super_admin"))])
async def update_global_overtime_rate(
    data: OvertimeRateUpdate,
    current_user: User = Depends(require_module_write("employees")),
    org: Optional[Organization] = Depends(get_current_org)
):
    if org:
        if not org.settings:
            org.settings = {}
        org.settings["overtime_rate"] = data.overtime_rate
        await org.save()

    # Bulk update all employees' overtime_rate
    await Employee.find(org_filter(org, {"is_deleted": {"$ne": True}})).update(
        {"$set": {"overtime_rate": data.overtime_rate}}
    )

    await log_action(
        str(org.id) if org else "super_admin",
        str(current_user.id),
        "update_global_overtime_rate",
        "settings",
        str(org.id) if org else "global"
    )

    return SuccessResponse(message="Global overtime rate updated for all employees")


@router.get("/{employee_id}", response_model=SuccessResponse)
async def get_employee(
    employee_id: str,
    current_user: User = Depends(require_module_read("employees")),
    org: Optional[Organization] = Depends(get_current_org)
):
    employee = await Employee.find_one(org_filter(org, {"_id": parse_object_id(employee_id, "employee_id")}))
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
        
    d = employee.model_dump()
    d["id"] = str(d.pop("_id", employee.id))
    if d.get("user_id"): d["user_id"] = str(d["user_id"])
    if d.get("reporting_to"): d["reporting_to"] = str(d["reporting_to"])
    
    d["salary"] = None
    if current_user.role in ["admin", "super_admin"] and employee.salary_encrypted:
        try:
            d["salary"] = float(decrypt_field(employee.salary_encrypted))
        except ValueError:
            pass
            
    d.pop("salary_encrypted", None)
    return SuccessResponse(data=d)


@router.put("/{employee_id}", response_model=SuccessResponse)
async def update_employee(
    employee_id: str,
    data: EmployeeUpdate,
    current_user: User = Depends(get_current_user),
    org: Optional[Organization] = Depends(get_current_org)
):
    employee = await Employee.find_one(org_filter(org, {"_id": parse_object_id(employee_id, "employee_id")}))
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    is_self = employee.user_id and str(employee.user_id) == str(current_user.id)
    
    if current_user.role in ["employee", "hr"]:
        if current_user.role == "employee" and not is_self:
            raise HTTPException(status_code=403, detail="You can only edit your own profile")
            
        restricted_fields = ["role", "department", "join_date", "salary", "status", "reporting_to", "overtime_rate"]
        for field in restricted_fields:
            if getattr(data, field) is not None:
                raise HTTPException(status_code=403, detail=f"You are not allowed to modify the {field} field")
    elif current_user.role not in ["super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    update_data = data.model_dump(exclude_unset=True, exclude={"salary"})
    if "reporting_to" in update_data:
        update_data["reporting_to"] = await resolve_employee_reference(update_data["reporting_to"], org, "Reporting manager")
        
    for k, v in update_data.items():
        setattr(employee, k, v)
        
    if data.salary is not None:
        employee.salary_encrypted = encrypt_field(str(data.salary))
        
    employee.updated_by = current_user.id
    employee.updated_at = utc_now()
    await employee.save()
    
    await log_action(str(org.id) if org else "super_admin", str(current_user.id), "update", "employees", str(employee.id))
    
    return SuccessResponse(message="Employee updated successfully")


@router.delete("/{employee_id}", response_model=SuccessResponse, dependencies=[Depends(require_roles("admin", "super_admin", "hr"))])
async def delete_employee(
    employee_id: str,
    current_user: User = Depends(require_module_write("employees")),
    org: Optional[Organization] = Depends(get_current_org)
):
    employee = await Employee.find_one(org_filter(org, {"_id": parse_object_id(employee_id, "employee_id")}))
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
        
    employee.is_deleted = True
    employee.deleted_at = utc_now()
    employee.deleted_by = current_user.id
    await employee.save()

    if employee.user_id:
        linked_user = await User.get(employee.user_id)
        if linked_user:
            linked_user.is_active = False
            linked_user.is_deleted = True
            linked_user.deleted_at = utc_now()
            linked_user.deleted_by = current_user.id
            linked_user.updated_at = utc_now()
            linked_user.updated_by = current_user.id
            await linked_user.save()
    
    await log_action(str(org.id) if org else "super_admin", str(current_user.id), "delete", "employees", str(employee.id))
    
    return SuccessResponse(message="Employee deleted successfully")

