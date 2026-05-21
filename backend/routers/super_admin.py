"""
Super Admin routes — platform-wide management.
"""

from pydantic import BaseModel, EmailStr
from fastapi import APIRouter, Depends, HTTPException, status, Query
from beanie import PydanticObjectId

from middleware.auth_middleware import get_current_user, require_roles
from models.user import User
from models.organization import Organization
from schemas.common import SuccessResponse
from schemas.organization import AdminOrgCreate
from utils.helpers import utc_now
from utils.security import hash_password

router = APIRouter(prefix="/api/v1/admin", tags=["Super Admin"])


@router.post("/organizations", response_model=SuccessResponse,
             dependencies=[Depends(require_roles("super_admin"))])
async def create_organization(
    data: AdminOrgCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new organization along with its admin account from the super admin panel."""
    # Check duplicate email
    existing_user = await User.find_one(User.email == data.admin_email.lower())
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists."
        )

    # Create Organization
    org = Organization(
        name=data.name,
        industry=data.industry,
        created_by=current_user.id
    )
    await org.insert()
    
    # Hash password
    hashed_pwd = hash_password(data.admin_password)
    
    # Create the admin user for the organization
    admin_user = User(
        email=data.admin_email.lower(),
        hashed_password=hashed_pwd,
        first_name="Admin",
        last_name=data.name,
        role="admin",
        org_id=org.id,
        is_active=True,
        is_email_verified=True,  # Mark verified directly since super admin created them
        auth_provider="local",
        created_by=current_user.id
    )
    await admin_user.insert()
    
    return SuccessResponse(
        message=f"Organization '{org.name}' and admin user '{admin_user.email}' created successfully",
        data={
            "id": str(org.id),
            "name": org.name,
            "admin_user_id": str(admin_user.id)
        }
    )


@router.get("/organizations", response_model=SuccessResponse,
            dependencies=[Depends(require_roles("super_admin"))])
async def list_all_organizations():
    """List all organizations on the platform."""
    orgs = await Organization.find({"is_deleted": {"$ne": True}}).to_list()
    data = []
    for org in orgs:
        member_count = await User.find(User.org_id == org.id, {"is_deleted": {"$ne": True}}).count()
        
        # Find who created this org
        created_by_email = None
        if org.created_by:
            creator = await User.get(org.created_by)
            if creator:
                created_by_email = creator.email
        
        # Find the admin user of this org
        admin_user = await User.find_one({"org_id": org.id, "role": "admin", "is_deleted": {"$ne": True}})
        admin_email = admin_user.email if admin_user else None
        
        data.append({
            "id": str(org.id),
            "name": org.name,
            "industry": org.industry,
            "size": org.size,
            "currency": org.currency,
            "member_count": member_count,
            "admin_email": admin_email,
            "created_by_email": created_by_email,
            "created_at": org.created_at.isoformat() if org.created_at else None,
        })
    return SuccessResponse(data=data)


@router.delete("/organizations/{org_id}", response_model=SuccessResponse,
               dependencies=[Depends(require_roles("super_admin"))])
async def deactivate_organization(
    org_id: str,
    current_user: User = Depends(get_current_user)
):
    """Soft-delete (deactivate) an organization."""
    org = await Organization.get(PydanticObjectId(org_id))
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    org.is_deleted = True
    org.deleted_at = utc_now()
    org.deleted_by = current_user.id
    await org.save()

    # Deactivate all users in the org
    members = await User.find(User.org_id == org.id).to_list()
    for m in members:
        m.is_active = False
        m.updated_at = utc_now()
        await m.save()

    return SuccessResponse(message=f"Organization '{org.name}' deactivated")


@router.get("/users", response_model=SuccessResponse,
            dependencies=[Depends(require_roles("super_admin"))])
async def list_all_users(
    org_id: str = Query(None),
):
    """List all users, optionally filtered by org."""
    query = {"is_deleted": {"$ne": True}}
    if org_id:
        query["org_id"] = PydanticObjectId(org_id)

    users = await User.find(query).to_list()
    data = []
    for u in users:
        data.append({
            "id": str(u.id),
            "name": u.full_name,
            "email": u.email,
            "role": u.role,
            "is_active": u.is_active,
            "org_id": str(u.org_id) if u.org_id else None,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        })
    return SuccessResponse(data=data)


@router.put("/users/{user_id}/role", response_model=SuccessResponse,
            dependencies=[Depends(require_roles("super_admin"))])
async def change_user_role(
    user_id: str,
    role: str = Query(..., pattern="^(super_admin|admin|hr|employee)$"),
    current_user: User = Depends(get_current_user)
):
    """Change any user's role (super admin only)."""
    user = await User.get(PydanticObjectId(user_id))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.role = role
    user.updated_by = current_user.id
    user.updated_at = utc_now()
    await user.save()

    return SuccessResponse(message=f"User role changed to {role}")


class SuperAdminCreate(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    password: str

@router.get("/super-admins", response_model=SuccessResponse, dependencies=[Depends(require_roles("super_admin"))])
async def list_super_admins():
    """List all super admins."""
    users = await User.find({"role": "super_admin", "is_deleted": {"$ne": True}}).to_list()
    data = [{
        "id": str(u.id),
        "name": u.full_name,
        "email": u.email,
        "created_at": u.created_at.isoformat() if u.created_at else None
    } for u in users]
    return SuccessResponse(data=data)

@router.post("/super-admins", response_model=SuccessResponse, dependencies=[Depends(require_roles("super_admin"))])
async def create_super_admin(
    data: SuperAdminCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new super admin."""
    existing_user = await User.find_one(User.email == data.email.lower())
    if existing_user:
        raise HTTPException(status_code=400, detail="A user with this email address already exists.")

    hashed_pwd = hash_password(data.password)
    
    new_sa = User(
        email=data.email.lower(),
        hashed_password=hashed_pwd,
        first_name=data.first_name,
        last_name=data.last_name,
        role="super_admin",
        org_id=None,
        is_active=True,
        is_email_verified=True,
        auth_provider="local",
        created_by=current_user.id
    )
    await new_sa.insert()
    
    return SuccessResponse(message="Super Admin created successfully", data={"id": str(new_sa.id)})

@router.delete("/super-admins/{user_id}", response_model=SuccessResponse, dependencies=[Depends(require_roles("super_admin"))])
async def delete_super_admin(
    user_id: str,
    current_user: User = Depends(get_current_user)
):
    """Remove a super admin."""
    if str(current_user.id) == user_id:
        raise HTTPException(status_code=400, detail="You cannot delete your own account")
        
    user = await User.get(PydanticObjectId(user_id))
    if not user or user.role != "super_admin":
        raise HTTPException(status_code=404, detail="Super Admin not found")
        
    user.is_deleted = True
    user.deleted_at = utc_now()
    user.deleted_by = current_user.id
    await user.save()
    
    return SuccessResponse(message="Super Admin removed successfully")
