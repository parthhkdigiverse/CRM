"""
Lead routes with scoring logic.
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from beanie import PydanticObjectId

from middleware.auth_middleware import get_current_user, get_current_org, org_filter
from middleware.rbac import require_module_read, require_module_write, require_module_full
from models.user import User
from models.organization import Organization
from models.lead import Lead
from schemas.lead import LeadCreate, LeadUpdate, LeadResponse, BulkAssignRequest
from schemas.common import SuccessResponse, PaginatedResponse
from utils.helpers import paginate_params, build_paginated_response, build_sort_params, utc_now
from services.audit_service import log_action

router = APIRouter(prefix="/api/v1/leads", tags=["Leads"])


def calculate_lead_score(lead: Lead) -> int:
    score = 0
    if lead.email: score += 15
    if lead.phone: score += 15
    if lead.company: score += 10
    if lead.job_title: score += 15
    if lead.value > 0: score += 15
    
    if lead.source == "referral": score += 15
    elif lead.source == "event": score += 10
    elif lead.source == "social": score += 5
    
    if lead.status == "contacted": score += 10
    elif lead.status == "qualified": score += 20
    
    return min(100, score)


from models.employee import Employee
from models.project import Project
from models.company import Company
from models.contact import Contact
import time

@router.post("", response_model=SuccessResponse)
async def create_lead(
    data: LeadCreate,
    current_user: User = Depends(require_module_write("leads")),
    org: Optional[Organization] = Depends(get_current_org)
):
    lead = Lead(
        org_id=org.id if org else None,
        created_by=current_user.id,
        **data.model_dump(exclude={"assigned_to"})
    )
    if data.assigned_to:
        try:
            lead.assigned_to = PydanticObjectId(data.assigned_to)
        except Exception:
            # If it's not a valid object ID, try finding employee by name
            emp = await Employee.find_one({"name": {"$regex": f"^{data.assigned_to}$", "$options": "i"}})
            if emp:
                lead.assigned_to = emp.id
            else:
                raise HTTPException(status_code=400, detail=f"Assigned employee '{data.assigned_to}' not found")

    lead.score = calculate_lead_score(lead)
    
    await lead.insert()
    await log_action(str(org.id) if org else None, str(current_user.id), "create", "leads", str(lead.id))
    
    # Automation based on status
    if lead.status == "converted":
        company_name = lead.company if lead.company else lead.name
        new_company = Company(
            name=company_name,
            email=lead.email,
            phone=lead.phone,
            assigned_to=lead.assigned_to,
            org_id=lead.org_id,
            created_by=current_user.id
        )
        await new_company.insert()
        
        project_code = f"P-{int(time.time())}"
        new_project = Project(
            project_code=project_code,
            title=f"Project: {company_name}",
            client_name=company_name,
            status="planning",
            budget=lead.value,
            assignee_ids=[lead.assigned_to] if lead.assigned_to else [],
            org_id=lead.org_id,
            created_by=current_user.id
        )
        await new_project.insert()
    else:
        name_parts = lead.name.split(" ", 1)
        first_name = name_parts[0]
        last_name = name_parts[1] if len(name_parts) > 1 else ""
        
        new_contact = Contact(
            first_name=first_name,
            last_name=last_name,
            email=lead.email,
            phone=lead.phone,
            job_title=lead.job_title,
            lead_source=lead.source,
            assigned_to=lead.assigned_to,
            org_id=lead.org_id,
            created_by=current_user.id
        )
        await new_contact.insert()
    
    return SuccessResponse(data={"id": str(lead.id)}, message="Lead created successfully")


@router.get("", response_model=PaginatedResponse)
async def list_leads(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc"),
    search: Optional[str] = None,
    status: Optional[str] = None,
    current_user: User = Depends(require_module_read("leads")),
    org: Optional[Organization] = Depends(get_current_org)
):
    skip, limit = paginate_params(page, per_page)
    sort = build_sort_params(sort_by, sort_order)
    
    query = org_filter(org)
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"company": {"$regex": search, "$options": "i"}},
        ]
    if status:
        query["status"] = status
        
    cursor = Lead.find(query).sort(sort).skip(skip).limit(limit)
    items = await cursor.to_list()
    total = await Lead.find(query).count()
    
    data = []
    for item in items:
        d = item.model_dump()
        d["id"] = str(d.pop("_id", item.id))
        if d.get("assigned_to"): d["assigned_to"] = str(d["assigned_to"])
        if d.get("converted_deal_id"): d["converted_deal_id"] = str(d["converted_deal_id"])
        data.append(d)
        
    response_data = build_paginated_response(data, total, page, per_page)
    return PaginatedResponse(**response_data)


@router.get("/{lead_id}", response_model=SuccessResponse)
async def get_lead(
    lead_id: str,
    current_user: User = Depends(require_module_read("leads")),
    org: Optional[Organization] = Depends(get_current_org)
):
    lead = await Lead.find_one(org_filter(org, {"_id": PydanticObjectId(lead_id)}))
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
        
    d = lead.model_dump()
    d["id"] = str(d.pop("_id", lead.id))
    if d.get("assigned_to"): d["assigned_to"] = str(d["assigned_to"])
    if d.get("converted_deal_id"): d["converted_deal_id"] = str(d["converted_deal_id"])
        
    return SuccessResponse(data=d)


@router.put("/{lead_id}", response_model=SuccessResponse)
async def update_lead(
    lead_id: str,
    data: LeadUpdate,
    current_user: User = Depends(require_module_write("leads")),
    org: Optional[Organization] = Depends(get_current_org)
):
    lead = await Lead.find_one(org_filter(org, {"_id": PydanticObjectId(lead_id)}))
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
        
    old_status = lead.status
    
    update_data = data.model_dump(exclude_unset=True)
    if "assigned_to" in update_data:
        if update_data["assigned_to"]:
            try:
                update_data["assigned_to"] = PydanticObjectId(update_data["assigned_to"])
            except Exception:
                emp = await Employee.find_one({"name": {"$regex": f"^{update_data['assigned_to']}$", "$options": "i"}})
                if emp:
                    update_data["assigned_to"] = emp.id
                else:
                    raise HTTPException(status_code=400, detail=f"Assigned employee '{update_data['assigned_to']}' not found")
        else:
            update_data["assigned_to"] = None
        
    for k, v in update_data.items():
        setattr(lead, k, v)
        
    new_status = lead.status
    
    if old_status != "converted" and new_status == "converted":
        import time
        company_name = lead.company if lead.company else lead.name
        existing_company = await Company.find_one({"name": company_name, "org_id": lead.org_id, "is_deleted": False})
        if not existing_company:
            new_company = Company(
                name=company_name,
                email=lead.email,
                phone=lead.phone,
                assigned_to=lead.assigned_to,
                org_id=lead.org_id,
                created_by=current_user.id
            )
            await new_company.insert()
            
        project_code = f"P-{int(time.time())}"
        new_project = Project(
            project_code=project_code,
            title=f"Project: {company_name}",
            client_name=company_name,
            status="planning",
            budget=lead.value,
            assignee_ids=[lead.assigned_to] if lead.assigned_to else [],
            org_id=lead.org_id,
            created_by=current_user.id
        )
        await new_project.insert()
        
    elif old_status == "converted" and new_status != "converted":
        company_name = lead.company if lead.company else lead.name
        projects = await Project.find(
            Project.org_id == lead.org_id,
            Project.client_name == company_name,
            Project.is_deleted == False
        ).to_list()
        for p in projects:
            p.is_deleted = True
            p.deleted_at = utc_now()
            p.deleted_by = current_user.id
            await p.save()
        
    new_score = calculate_lead_score(lead)
    if new_score != lead.score:
        lead.score_history.append({
            "score": new_score,
            "reason": "Updated profile/status",
            "timestamp": utc_now()
        })
        lead.score = new_score
        
    lead.updated_by = current_user.id
    lead.updated_at = utc_now()
    await lead.save()
    
    await log_action(str(org.id) if org else None, str(current_user.id), "update", "leads", str(lead.id), changes=update_data)
    
    return SuccessResponse(message="Lead updated successfully")


@router.delete("/{lead_id}", response_model=SuccessResponse)
async def delete_lead(
    lead_id: str,
    current_user: User = Depends(require_module_write("leads")),
    org: Optional[Organization] = Depends(get_current_org)
):
    lead = await Lead.find_one(org_filter(org, {"_id": PydanticObjectId(lead_id)}))
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
        
    lead.is_deleted = True
    lead.deleted_at = utc_now()
    lead.deleted_by = current_user.id
    await lead.save()
    
    await log_action(str(org.id) if org else None, str(current_user.id), "delete", "leads", str(lead.id))
    
    return SuccessResponse(message="Lead deleted successfully")


@router.post("/bulk-assign", response_model=SuccessResponse)
async def bulk_assign_leads(
    data: BulkAssignRequest,
    current_user: User = Depends(require_module_write("leads")),
    org: Optional[Organization] = Depends(get_current_org)
):
    lead_ids = [PydanticObjectId(id) for id in data.lead_ids]
    assigned_to = PydanticObjectId(data.assigned_to)
    
    await Lead.find(
        org_filter(org, {"_id": {"$in": lead_ids}})
    ).update({"$set": {"assigned_to": assigned_to, "updated_at": utc_now(), "updated_by": current_user.id}})
    
    await log_action(str(org.id) if org else None, str(current_user.id), "bulk_update", "leads", changes={"action": "bulk_assign", "count": len(lead_ids)})
    
    return SuccessResponse(message=f"Successfully assigned {len(lead_ids)} leads")
