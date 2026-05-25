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
from models.notification import Notification

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
    
    if lead.status == "in_process": score += 10
    elif lead.status == "qualified": score += 20
    
    return min(100, score)


from models.employee import Employee
from models.project import Project
from models.company import Company
from models.contact import Contact
import time

async def get_next_project_code(org_id: PydanticObjectId) -> str:
    """Generate the next sequential project code starting from 001 for this organization."""
    projects = await Project.find(
        Project.org_id == org_id,
        Project.is_deleted == False
    ).to_list()
    
    max_num = 0
    for p in projects:
        code = p.project_code
        try:
            val = int(code)
            if val > max_num:
                max_num = val
        except ValueError:
            import re
            digits = re.findall(r'\d+', code)
            if digits:
                val = int(digits[-1])
                if val > max_num:
                    max_num = val
                    
    next_num = max_num + 1
    return f"{next_num:03d}"

async def sync_assigned_lead_project(lead: Lead, current_user: User, old_assigned_to: Optional[PydanticObjectId] = None) -> None:
    """Ensure an assigned lead is visible in Projects."""
    existing_project = await Project.find_one(
        Project.linked_lead_id == lead.id,
        Project.org_id == lead.org_id
    )

    should_have_project = lead.assigned_to is not None

    if not should_have_project:
        # If it shouldn't have a project, soft-delete it if it exists
        if existing_project and not existing_project.is_deleted:
            existing_project.is_deleted = True
            existing_project.deleted_at = utc_now()
            existing_project.deleted_by = current_user.id
            await existing_project.save()
        return

    # If it should have a project
    client_name = lead.company or lead.name
    if existing_project:
        # Restore if it was soft-deleted
        existing_project.is_deleted = False
        existing_project.deleted_at = None
        existing_project.deleted_by = None
        
        # Update assignees
        if old_assigned_to and old_assigned_to in existing_project.assignee_ids:
            existing_project.assignee_ids.remove(old_assigned_to)
            
        if lead.assigned_to not in existing_project.assignee_ids:
            existing_project.assignee_ids.append(lead.assigned_to)
            
        existing_project.client_name = client_name
        existing_project.budget = lead.value or existing_project.budget
        existing_project.updated_at = utc_now()
        existing_project.updated_by = current_user.id
        
        # Ensure title reflects if it's converted or not
        if lead.status == "converted":
            existing_project.title = f"Project: {client_name}"
        else:
            existing_project.title = f"Lead: {lead.name}"
            
        await existing_project.save()
    else:
        # Create a new project
        title = f"Project: {client_name}" if lead.status == "converted" else f"Lead: {lead.name}"
        project_code = await get_next_project_code(lead.org_id)
        
        new_project = Project(
            project_code=project_code,
            title=title,
            client_name=client_name,
            status="planning",
            budget=lead.value,
            assignee_ids=[lead.assigned_to],
            linked_lead_id=lead.id,
            org_id=lead.org_id,
            created_by=current_user.id
        )
        await new_project.insert()


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
    await sync_assigned_lead_project(lead, current_user)

    # Notify assignee if set
    if lead.assigned_to:
        try:
            emp = await Employee.get(lead.assigned_to)
            if emp and emp.user_id:
                notif = Notification(
                    org_id=org.id if org else lead.org_id,
                    user_id=emp.user_id,
                    created_by=current_user.id,
                    type="lead_assigned",
                    title="New lead from website" if lead.source == "website" else "Lead assigned to you",
                    message=f"{lead.name} from {lead.company or 'N/A'} has been assigned to you.",
                    entity_type="lead",
                    entity_id=lead.id,
                )
                await notif.insert()
        except Exception:
            pass

    
    # Automation based on status
    if lead.status != "new":
        company_name = lead.company if lead.company else lead.name
        new_company = Company(
            name=company_name,
            email=lead.email,
            phone=lead.phone,
            assigned_to=lead.assigned_to,
            org_id=lead.org_id,
            created_by=current_user.id,
            linked_lead_id=lead.id,
            address={"street": lead.address} if lead.address else None
        )
        await new_company.insert()
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
            created_by=current_user.id,
            linked_lead_id=lead.id,
            custom_fields={"address": lead.address} if lead.address else {}
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
    old_assigned_to = lead.assigned_to
    
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
    
    if old_status == "new" and new_status != "new":
        # Convert Contact to Company
        contact = await Contact.find_one(Contact.linked_lead_id == lead.id, Contact.org_id == lead.org_id, Contact.is_deleted == False)
        if contact:
            contact.is_deleted = True
            await contact.save()
            
        company_name = lead.company if lead.company else lead.name
        existing_company = await Company.find_one(Company.linked_lead_id == lead.id, Company.org_id == lead.org_id)
        if existing_company:
            existing_company.is_deleted = False
            existing_company.name = company_name
            existing_company.email = lead.email
            existing_company.phone = lead.phone
            existing_company.assigned_to = lead.assigned_to
            existing_company.contact_name = lead.name
            existing_company.annual_revenue = lead.value
            if lead.address:
                if existing_company.address:
                    existing_company.address["street"] = lead.address
                else:
                    existing_company.address = {"street": lead.address}
            await existing_company.save()
        else:
            new_company = Company(
                name=company_name,
                email=lead.email,
                phone=lead.phone,
                assigned_to=lead.assigned_to,
                org_id=lead.org_id,
                created_by=current_user.id,
                linked_lead_id=lead.id,
                contact_name=lead.name,
                annual_revenue=lead.value,
                address={"street": lead.address} if lead.address else None
            )
            await new_company.insert()
            
    elif old_status != "new" and new_status == "new":
        # Convert Company to Contact
        company = await Company.find_one(Company.linked_lead_id == lead.id, Company.org_id == lead.org_id, Company.is_deleted == False)
        if company:
            company.is_deleted = True
            await company.save()
            
        name_parts = lead.name.split(" ", 1)
        first_name = name_parts[0]
        last_name = name_parts[1] if len(name_parts) > 1 else ""
        
        existing_contact = await Contact.find_one(Contact.linked_lead_id == lead.id, Contact.org_id == lead.org_id)
        if existing_contact:
            existing_contact.is_deleted = False
            existing_contact.first_name = first_name
            existing_contact.last_name = last_name
            existing_contact.email = lead.email
            existing_contact.phone = lead.phone
            existing_contact.job_title = lead.job_title
            existing_contact.assigned_to = lead.assigned_to
            if lead.address:
                existing_contact.custom_fields["address"] = lead.address
            await existing_contact.save()
        else:
            new_contact = Contact(
                first_name=first_name,
                last_name=last_name,
                email=lead.email,
                phone=lead.phone,
                job_title=lead.job_title,
                lead_source=lead.source,
                assigned_to=lead.assigned_to,
                org_id=lead.org_id,
                created_by=current_user.id,
                linked_lead_id=lead.id,
                custom_fields={"address": lead.address} if lead.address else {}
            )
            await new_contact.insert()
            
    else:
        # Sync fields dynamically
        if new_status == "new":
            contact = await Contact.find_one(Contact.linked_lead_id == lead.id, Contact.org_id == lead.org_id, Contact.is_deleted == False)
            if contact:
                name_parts = lead.name.split(" ", 1)
                contact.first_name = name_parts[0]
                contact.last_name = name_parts[1] if len(name_parts) > 1 else ""
                contact.email = lead.email
                contact.phone = lead.phone
                contact.job_title = lead.job_title
                contact.assigned_to = lead.assigned_to
                if lead.address:
                    contact.custom_fields["address"] = lead.address
                await contact.save()
        else:
            company_name = lead.company if lead.company else lead.name
            company = await Company.find_one(Company.linked_lead_id == lead.id, Company.org_id == lead.org_id, Company.is_deleted == False)
            if company:
                company.name = company_name
                company.email = lead.email
                company.phone = lead.phone
                company.assigned_to = lead.assigned_to
                company.contact_name = lead.name
                company.annual_revenue = lead.value
                if lead.address:
                    if company.address:
                        company.address["street"] = lead.address
                    else:
                        company.address = {"street": lead.address}
                await company.save()
        
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
    await sync_assigned_lead_project(lead, current_user, old_assigned_to)

    # Notify assignee if changed and not None
    if lead.assigned_to and lead.assigned_to != old_assigned_to:
        try:
            emp = await Employee.get(lead.assigned_to)
            if emp and emp.user_id:
                notif = Notification(
                    org_id=org.id if org else lead.org_id,
                    user_id=emp.user_id,
                    created_by=current_user.id,
                    type="lead_assigned",
                    title="Lead assigned to you",
                    message=f"{lead.name} from {lead.company or 'N/A'} has been assigned to you.",
                    entity_type="lead",
                    entity_id=lead.id,
                )
                await notif.insert()
        except Exception:
            pass
    
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

    assigned_leads = await Lead.find(org_filter(org, {"_id": {"$in": lead_ids}})).to_list()
    for lead in assigned_leads:
        await sync_assigned_lead_project(lead, current_user)

    # Notify bulk assignee
    try:
        emp = await Employee.get(assigned_to)
        if emp and emp.user_id:
            for lead in assigned_leads:
                notif = Notification(
                    org_id=org.id if org else lead.org_id,
                    user_id=emp.user_id,
                    created_by=current_user.id,
                    type="lead_assigned",
                    title="Lead assigned to you",
                    message=f"{lead.name} from {lead.company or 'N/A'} has been assigned to you.",
                    entity_type="lead",
                    entity_id=lead.id,
                )
                await notif.insert()
    except Exception:
        pass
    
    await log_action(str(org.id) if org else None, str(current_user.id), "bulk_update", "leads", changes={"action": "bulk_assign", "count": len(lead_ids)})
    
    return SuccessResponse(message=f"Successfully assigned {len(lead_ids)} leads")

