"""
Deal routes for sales pipeline management.
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from beanie import PydanticObjectId

from middleware.auth_middleware import get_current_user, get_current_org, org_filter
from middleware.rbac import require_module_read, require_module_write, require_module_full
from models.user import User
from models.organization import Organization
from models.deal import Deal
from schemas.deal import DealCreate, DealUpdate, DealResponse, DealStageUpdate
from schemas.common import SuccessResponse, PaginatedResponse
from utils.helpers import paginate_params, build_paginated_response, build_sort_params, utc_now
from services.audit_service import log_action

router = APIRouter(prefix="/api/v1/deals", tags=["Deals"])


@router.post("", response_model=SuccessResponse)
async def create_deal(
    data: DealCreate,
    current_user: User = Depends(require_module_write("deals")),
    org: Optional[Organization] = Depends(get_current_org)
):
    deal = Deal(
        org_id=org.id if org else None,
        created_by=current_user.id,
        **data.model_dump(exclude={"contact_id", "company_id", "assigned_to"})
    )
    if data.contact_id: deal.contact_id = PydanticObjectId(data.contact_id)
    if data.company_id: deal.company_id = PydanticObjectId(data.company_id)
    if data.assigned_to: deal.assigned_to = PydanticObjectId(data.assigned_to)

    deal.stage_history.append({
        "from_stage": None,
        "to_stage": deal.stage,
        "changed_at": utc_now(),
        "changed_by": str(current_user.id)
    })

    await deal.insert()
    await log_action(str(org.id) if org else None, str(current_user.id), "create", "deals", str(deal.id))
    
    return SuccessResponse(data={"id": str(deal.id)}, message="Deal created successfully")


@router.get("", response_model=PaginatedResponse)
async def list_deals(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc"),
    search: Optional[str] = None,
    stage: Optional[str] = None,
    current_user: User = Depends(require_module_read("deals")),
    org: Optional[Organization] = Depends(get_current_org)
):
    skip, limit = paginate_params(page, per_page)
    sort = build_sort_params(sort_by, sort_order)
    
    query = org_filter(org)
    if search:
        query["title"] = {"$regex": search, "$options": "i"}
    if stage:
        query["stage"] = stage
        
    cursor = Deal.find(query).sort(sort).skip(skip).limit(limit)
    items = await cursor.to_list()
    total = await Deal.find(query).count()
    
    from models.company import Company
    from models.contact import Contact
    
    company_ids = [item.company_id for item in items if item.company_id]
    contact_ids = [item.contact_id for item in items if item.contact_id]
    
    companies_dict = {}
    if company_ids:
        companies = await Company.find({"_id": {"$in": company_ids}}).to_list()
        companies_dict = {c.id: c for c in companies}
        
    contacts_dict = {}
    if contact_ids:
        contacts = await Contact.find({"_id": {"$in": contact_ids}}).to_list()
        contacts_dict = {c.id: c for c in contacts}
        
    data = []
    for item in items:
        d = item.model_dump()
        d["id"] = str(d.pop("_id", item.id))
        
        # Populate company info
        if item.company_id and item.company_id in companies_dict:
            comp = companies_dict[item.company_id]
            d["company_name"] = comp.name
            d["company_email"] = comp.email
        else:
            d["company_name"] = None
            d["company_email"] = None
            
        # Populate contact info
        if item.contact_id and item.contact_id in contacts_dict:
            cont = contacts_dict[item.contact_id]
            d["contact_name"] = f"{cont.first_name} {cont.last_name}"
            d["contact_email"] = cont.email
            d["contact_phone"] = cont.phone
        else:
            d["contact_name"] = None
            d["contact_email"] = None
            d["contact_phone"] = None

        if d.get("contact_id"): d["contact_id"] = str(d["contact_id"])
        if d.get("company_id"): d["company_id"] = str(d["company_id"])
        if d.get("assigned_to"): d["assigned_to"] = str(d["assigned_to"])
        data.append(d)
        
    response_data = build_paginated_response(data, total, page, per_page)
    return PaginatedResponse(**response_data)


@router.get("/{deal_id}", response_model=SuccessResponse)
async def get_deal(
    deal_id: str,
    current_user: User = Depends(require_module_read("deals")),
    org: Optional[Organization] = Depends(get_current_org)
):
    deal = await Deal.find_one(org_filter(org, {"_id": PydanticObjectId(deal_id)}))
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
        
    d = deal.model_dump()
    d["id"] = str(d.pop("_id", deal.id))
    
    from models.company import Company
    from models.contact import Contact
    
    if deal.company_id:
        comp = await Company.get(deal.company_id)
        if comp:
            d["company_name"] = comp.name
            d["company_email"] = comp.email
            
    if deal.contact_id:
        cont = await Contact.get(deal.contact_id)
        if cont:
            d["contact_name"] = f"{cont.first_name} {cont.last_name}"
            d["contact_email"] = cont.email
            d["contact_phone"] = cont.phone
            
    if d.get("contact_id"): d["contact_id"] = str(d["contact_id"])
    if d.get("company_id"): d["company_id"] = str(d["company_id"])
    if d.get("assigned_to"): d["assigned_to"] = str(d["assigned_to"])
        
    return SuccessResponse(data=d)


@router.put("/{deal_id}", response_model=SuccessResponse)
async def update_deal(
    deal_id: str,
    data: DealUpdate,
    current_user: User = Depends(require_module_write("deals")),
    org: Optional[Organization] = Depends(get_current_org)
):
    deal = await Deal.find_one(org_filter(org, {"_id": PydanticObjectId(deal_id)}))
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
        
    update_data = data.model_dump(exclude_unset=True)
    if "contact_id" in update_data:
        update_data["contact_id"] = PydanticObjectId(update_data["contact_id"]) if update_data["contact_id"] else None
    if "company_id" in update_data:
        update_data["company_id"] = PydanticObjectId(update_data["company_id"]) if update_data["company_id"] else None
    if "assigned_to" in update_data:
        update_data["assigned_to"] = PydanticObjectId(update_data["assigned_to"]) if update_data["assigned_to"] else None
        
    # Check stage change
    if "stage" in update_data and update_data["stage"] != deal.stage:
        deal.stage_history.append({
            "from_stage": deal.stage,
            "to_stage": update_data["stage"],
            "changed_at": utc_now(),
            "changed_by": str(current_user.id)
        })
        
    for k, v in update_data.items():
        setattr(deal, k, v)
        
    deal.updated_by = current_user.id
    deal.updated_at = utc_now()
    await deal.save()
    
    await log_action(str(org.id) if org else None, str(current_user.id), "update", "deals", str(deal.id), changes=update_data)
    
    return SuccessResponse(message="Deal updated successfully")


@router.put("/{deal_id}/stage", response_model=SuccessResponse)
async def update_deal_stage(
    deal_id: str,
    data: DealStageUpdate,
    current_user: User = Depends(require_module_write("deals")),
    org: Optional[Organization] = Depends(get_current_org)
):
    """Convenience endpoint for drag-and-drop stage updates"""
    deal = await Deal.find_one(org_filter(org, {"_id": PydanticObjectId(deal_id)}))
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
        
    if deal.stage != data.stage:
        deal.stage_history.append({
            "from_stage": deal.stage,
            "to_stage": data.stage,
            "changed_at": utc_now(),
            "changed_by": str(current_user.id)
        })
        deal.stage = data.stage
        if data.won_lost_reason:
            deal.won_lost_reason = data.won_lost_reason
            
        deal.updated_by = current_user.id
        deal.updated_at = utc_now()
        await deal.save()
        
        await log_action(str(org.id) if org else None, str(current_user.id), "update", "deals", str(deal.id), changes={"stage": data.stage})
        
    return SuccessResponse(message="Deal stage updated")


@router.delete("/{deal_id}", response_model=SuccessResponse)
async def delete_deal(
    deal_id: str,
    current_user: User = Depends(require_module_write("deals")),
    org: Optional[Organization] = Depends(get_current_org)
):
    deal = await Deal.find_one(org_filter(org, {"_id": PydanticObjectId(deal_id)}))
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
        
    deal.is_deleted = True
    deal.deleted_at = utc_now()
    deal.deleted_by = current_user.id
    await deal.save()
    
    await log_action(str(org.id) if org else None, str(current_user.id), "delete", "deals", str(deal.id))
    
    return SuccessResponse(message="Deal deleted successfully")
