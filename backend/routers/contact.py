"""
Contact routes.
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query

from middleware.auth_middleware import get_current_user, get_current_org, org_filter
from middleware.rbac import require_module_read, require_module_write, require_module_full
from models.user import User
from models.organization import Organization
from models.contact import Contact
from schemas.contact import ContactCreate, ContactUpdate, ContactResponse
from schemas.common import SuccessResponse, PaginatedResponse
from utils.helpers import paginate_params, build_paginated_response, build_sort_params
from services.audit_service import log_action

router = APIRouter(prefix="/api/v1/contacts", tags=["Contacts"])


@router.post("", response_model=SuccessResponse)
async def create_contact(
    data: ContactCreate,
    current_user: User = Depends(require_module_write("contacts")),
    org: Optional[Organization] = Depends(get_current_org)
):
    from beanie import PydanticObjectId
    
    # Check if email exists in this org
    if data.email:
        existing = await Contact.find_one(org_filter(org, {"email": data.email.lower()}))
        if existing:
            raise HTTPException(status_code=400, detail="Contact with this email already exists")

    contact = Contact(
        org_id=org.id if org else None,
        created_by=current_user.id,
        **data.model_dump(exclude={"company_id", "assigned_to"})
    )
    if data.company_id:
        contact.company_id = PydanticObjectId(data.company_id)
    if data.assigned_to:
        contact.assigned_to = PydanticObjectId(data.assigned_to)

    await contact.insert()
    
    await log_action(str(org.id) if org else None, str(current_user.id), "create", "contacts", str(contact.id))
    
    return SuccessResponse(data={"id": str(contact.id)}, message="Contact created successfully")


@router.get("", response_model=PaginatedResponse)
async def list_contacts(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc"),
    search: Optional[str] = None,
    current_user: User = Depends(require_module_read("contacts")),
    org: Optional[Organization] = Depends(get_current_org)
):
    skip, limit = paginate_params(page, per_page)
    sort = build_sort_params(sort_by, sort_order)
    
    query = org_filter(org)
    if search:
        query["$or"] = [
            {"first_name": {"$regex": search, "$options": "i"}},
            {"last_name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
        ]
        
    cursor = Contact.find(query).sort(sort).skip(skip).limit(limit)
    items = await cursor.to_list()
    total = await Contact.find(query).count()
    
    # Map to response schema
    data = []
    for item in items:
        # Convert to dict and handle ObjectIds
        d = item.model_dump()
        d["id"] = str(d.pop("_id", item.id))
        if d.get("company_id"): d["company_id"] = str(d["company_id"])
        if d.get("assigned_to"): d["assigned_to"] = str(d["assigned_to"])
        data.append(d)
        
    response_data = build_paginated_response(data, total, page, per_page)
    return PaginatedResponse(**response_data)


@router.get("/{contact_id}", response_model=SuccessResponse)
async def get_contact(
    contact_id: str,
    current_user: User = Depends(require_module_read("contacts")),
    org: Optional[Organization] = Depends(get_current_org)
):
    from beanie import PydanticObjectId
    contact = await Contact.find_one(org_filter(org, {"_id": PydanticObjectId(contact_id)}))
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
        
    d = contact.model_dump()
    d["id"] = str(d.pop("_id", contact.id))
    if d.get("company_id"): d["company_id"] = str(d["company_id"])
    if d.get("assigned_to"): d["assigned_to"] = str(d["assigned_to"])
        
    return SuccessResponse(data=d)


@router.put("/{contact_id}", response_model=SuccessResponse)
async def update_contact(
    contact_id: str,
    data: ContactUpdate,
    current_user: User = Depends(require_module_write("contacts")),
    org: Optional[Organization] = Depends(get_current_org)
):
    from beanie import PydanticObjectId
    from utils.helpers import utc_now
    
    contact = await Contact.find_one(org_filter(org, {"_id": PydanticObjectId(contact_id)}))
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
        
    update_data = data.model_dump(exclude_unset=True)
    if "company_id" in update_data:
        update_data["company_id"] = PydanticObjectId(update_data["company_id"]) if update_data["company_id"] else None
    if "assigned_to" in update_data:
        update_data["assigned_to"] = PydanticObjectId(update_data["assigned_to"]) if update_data["assigned_to"] else None
        
    for k, v in update_data.items():
        setattr(contact, k, v)
        
    contact.updated_by = current_user.id
    contact.updated_at = utc_now()
    await contact.save()
    
    await log_action(str(org.id) if org else None, str(current_user.id), "update", "contacts", str(contact.id), changes=update_data)
    
    return SuccessResponse(message="Contact updated successfully")


@router.delete("/{contact_id}", response_model=SuccessResponse)
async def delete_contact(
    contact_id: str,
    current_user: User = Depends(require_module_write("contacts")),
    org: Optional[Organization] = Depends(get_current_org)
):
    from beanie import PydanticObjectId
    from utils.helpers import utc_now
    
    contact = await Contact.find_one(org_filter(org, {"_id": PydanticObjectId(contact_id)}))
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
        
    contact.is_deleted = True
    contact.deleted_at = utc_now()
    contact.deleted_by = current_user.id
    await contact.save()
    
    await log_action(str(org.id) if org else None, str(current_user.id), "delete", "contacts", str(contact.id))
    
    return SuccessResponse(message="Contact deleted successfully")
