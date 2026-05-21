from typing import Optional
"""
Organization routes for tenant management.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from beanie import PydanticObjectId
from datetime import timedelta

from middleware.auth_middleware import get_current_user, get_current_org, require_roles, org_filter
from models.user import User
from models.organization import Organization
from schemas.organization import OrgCreate, OrgUpdate, OrgResponse, InviteMemberRequest, JoinOrgRequest
from schemas.common import SuccessResponse
from utils.helpers import utc_now, generate_invite_token
from services.audit_service import log_action
from config import settings

router = APIRouter(prefix="/api/v1/organization", tags=["Organization"])


@router.post("", response_model=SuccessResponse)
async def create_organization(
    data: OrgCreate,
    current_user: User = Depends(get_current_user)
):
    if current_user.org_id:
        raise HTTPException(status_code=400, detail="User already belongs to an organization")
        
    org = Organization(
        created_by=current_user.id,
        **data.model_dump()
    )
    await org.insert()
    
    # Update user
    current_user.org_id = org.id
    current_user.role = "admin"  # Creator is admin
    current_user.updated_at = utc_now()
    await current_user.save()
    
    return SuccessResponse(data={"id": str(org.id)}, message="Organization created successfully")


@router.get("/current", response_model=SuccessResponse)
async def get_current_organization(
    current_user: User = Depends(get_current_user),
    org: Optional[Organization] = Depends(get_current_org)
):
    d = org.model_dump()
    d["id"] = str(d.pop("_id", org.id))
    d.pop("invite_token", None)
    d.pop("invite_token_expires", None)
    
    return SuccessResponse(data=d)


@router.put("/current", response_model=SuccessResponse, dependencies=[Depends(require_roles("admin", "super_admin"))])
async def update_organization(
    data: OrgUpdate,
    current_user: User = Depends(get_current_user),
    org: Optional[Organization] = Depends(get_current_org)
):
    update_data = data.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(org, k, v)
        
    org.updated_by = current_user.id
    org.updated_at = utc_now()
    await org.save()
    
    await log_action(str(org.id) if org else "super_admin", str(current_user.id), "update", "organization", str(org.id), changes=update_data)
    
    return SuccessResponse(message="Organization updated successfully")


@router.post("/invite", response_model=SuccessResponse, dependencies=[Depends(require_roles("admin", "super_admin"))])
async def generate_invite(
    current_user: User = Depends(get_current_user),
    org: Optional[Organization] = Depends(get_current_org)
):
    """Generate a shareable invite link for the organization."""
    token = generate_invite_token()
    org.invite_token = token
    org.invite_token_expires = utc_now() + timedelta(days=7)
    await org.save()
    
    invite_link = f"{settings.FRONTEND_URL}/join?token={token}"
    return SuccessResponse(data={"invite_link": invite_link, "expires_in_days": 7}, message="Invite link generated")


@router.post("/join", response_model=SuccessResponse)
async def join_organization(
    data: JoinOrgRequest,
    current_user: User = Depends(get_current_user)
):
    if current_user.org_id:
        raise HTTPException(status_code=400, detail="You already belong to an organization")
        
    org = await Organization.find_one(
        Organization.invite_token == data.invite_token,
        Organization.invite_token_expires > utc_now(),
        Organization.is_deleted == False
    )
    
    if not org:
        raise HTTPException(status_code=400, detail="Invalid or expired invite token")
        
    current_user.org_id = org.id
    current_user.role = "employee"  # Default role for joined users
    current_user.updated_at = utc_now()
    await current_user.save()
    
    return SuccessResponse(message=f"Successfully joined {org.name}")


@router.get("/members", response_model=SuccessResponse)
async def list_members(
    current_user: User = Depends(require_roles("admin", "super_admin", "hr")),
    org: Optional[Organization] = Depends(get_current_org)
):
    """List all members of the current organization."""
    members = await User.find(
        User.org_id == org.id,
        User.is_deleted == False
    ).to_list()

    data = []
    for m in members:
        data.append({
            "id": str(m.id),
            "name": m.full_name,
            "email": m.email,
            "role": m.role,
            "is_active": m.is_active,
            "phone": m.phone,
            "avatar_url": m.avatar_url,
            "created_at": m.created_at.isoformat() if m.created_at else None,
        })

    return SuccessResponse(data=data)


@router.put("/members/{member_id}/role", response_model=SuccessResponse)
async def change_member_role(
    member_id: str,
    role: str = Query(..., pattern="^(admin|hr|employee)$"),
    current_user: User = Depends(require_roles("admin", "super_admin")),
    org: Optional[Organization] = Depends(get_current_org)
):
    """Change a member's role. Only admin/super_admin can do this."""
    member = await User.get(PydanticObjectId(member_id))
    if not member or member.org_id != org.id:
        raise HTTPException(status_code=404, detail="Member not found")

    if str(member.id) == str(current_user.id):
        raise HTTPException(status_code=400, detail="Cannot change your own role")

    if member.role == "super_admin":
        raise HTTPException(status_code=403, detail="Cannot change super admin role")

    old_role = member.role
    member.role = role
    member.updated_by = current_user.id
    member.updated_at = utc_now()
    await member.save()

    await log_action(str(org.id) if org else "super_admin", str(current_user.id), "update", "users", str(member.id),
                     {"role": {"old": old_role, "new": role}})

    return SuccessResponse(message=f"Role changed to {role}")

