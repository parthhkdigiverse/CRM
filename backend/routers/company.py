"""
Company routes.
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query

from middleware.auth_middleware import get_current_user, get_current_org, org_filter
from middleware.rbac import require_module_read, require_module_write, require_module_full
from models.user import User
from models.organization import Organization
from models.company import Company
from schemas.company import CompanyCreate, CompanyUpdate, CompanyResponse
from schemas.common import SuccessResponse, PaginatedResponse
from utils.helpers import paginate_params, build_paginated_response, build_sort_params
from services.audit_service import log_action

router = APIRouter(prefix="/api/v1/companies", tags=["Companies"])


@router.post("", response_model=SuccessResponse)
async def create_company(
    data: CompanyCreate,
    current_user: User = Depends(require_module_write("companies")),
    org: Optional[Organization] = Depends(get_current_org)
):
    from beanie import PydanticObjectId
    
    company = Company(
        org_id=org.id if org else None,
        created_by=current_user.id,
        **data.model_dump(exclude={"assigned_to"})
    )
    if data.assigned_to:
        company.assigned_to = PydanticObjectId(data.assigned_to)

    await company.insert()
    
    await log_action(str(org.id) if org else None, str(current_user.id), "create", "companies", str(company.id))
    
    return SuccessResponse(data={"id": str(company.id)}, message="Company created successfully")


@router.get("", response_model=PaginatedResponse)
async def list_companies(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc"),
    search: Optional[str] = None,
    current_user: User = Depends(require_module_read("companies")),
    org: Optional[Organization] = Depends(get_current_org)
):
    skip, limit = paginate_params(page, per_page)
    sort = build_sort_params(sort_by, sort_order)
    
    query = org_filter(org)
    if search:
        query["name"] = {"$regex": search, "$options": "i"}
        
    cursor = Company.find(query).sort(sort).skip(skip).limit(limit)
    items = await cursor.to_list()
    total = await Company.find(query).count()
    
    data = []
    for item in items:
        d = item.model_dump()
        d["id"] = str(d.pop("_id", item.id))
        if d.get("assigned_to"): d["assigned_to"] = str(d["assigned_to"])
        data.append(d)
        
    response_data = build_paginated_response(data, total, page, per_page)
    return PaginatedResponse(**response_data)


@router.get("/{company_id}", response_model=SuccessResponse)
async def get_company(
    company_id: str,
    current_user: User = Depends(require_module_read("companies")),
    org: Optional[Organization] = Depends(get_current_org)
):
    from beanie import PydanticObjectId
    company = await Company.find_one(org_filter(org, {"_id": PydanticObjectId(company_id)}))
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
        
    d = company.model_dump()
    d["id"] = str(d.pop("_id", company.id))
    if d.get("assigned_to"): d["assigned_to"] = str(d["assigned_to"])
        
    return SuccessResponse(data=d)


@router.put("/{company_id}", response_model=SuccessResponse)
async def update_company(
    company_id: str,
    data: CompanyUpdate,
    current_user: User = Depends(require_module_write("companies")),
    org: Optional[Organization] = Depends(get_current_org)
):
    from beanie import PydanticObjectId
    from utils.helpers import utc_now
    
    company = await Company.find_one(org_filter(org, {"_id": PydanticObjectId(company_id)}))
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
        
    update_data = data.model_dump(exclude_unset=True)
    if "assigned_to" in update_data:
        update_data["assigned_to"] = PydanticObjectId(update_data["assigned_to"]) if update_data["assigned_to"] else None
        
    for k, v in update_data.items():
        setattr(company, k, v)
        
    company.updated_by = current_user.id
    company.updated_at = utc_now()
    await company.save()
    
    await log_action(str(org.id) if org else None, str(current_user.id), "update", "companies", str(company.id), changes=update_data)
    
    return SuccessResponse(message="Company updated successfully")


@router.delete("/{company_id}", response_model=SuccessResponse)
async def delete_company(
    company_id: str,
    current_user: User = Depends(require_module_write("companies")),
    org: Optional[Organization] = Depends(get_current_org)
):
    from beanie import PydanticObjectId
    from utils.helpers import utc_now
    
    company = await Company.find_one(org_filter(org, {"_id": PydanticObjectId(company_id)}))
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
        
    company.is_deleted = True
    company.deleted_at = utc_now()
    company.deleted_by = current_user.id
    await company.save()
    
    await log_action(str(org.id) if org else None, str(current_user.id), "delete", "companies", str(company.id))
    
    return SuccessResponse(message="Company deleted successfully")
