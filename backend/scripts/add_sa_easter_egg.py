import os

file_path = "c:\\crm\\backend\\routers\\super_admin.py"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

if "from pydantic import BaseModel" not in content:
    content = content.replace("from fastapi import APIRouter", "from pydantic import BaseModel, EmailStr\nfrom fastapi import APIRouter")

new_routes = """

class SuperAdminCreate(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    password: str

@router.get("/super-admins", response_model=SuccessResponse, dependencies=[Depends(require_roles("super_admin"))])
async def list_super_admins():
    \"\"\"List all super admins.\"\"\"
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
    \"\"\"Create a new super admin.\"\"\"
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
    \"\"\"Remove a super admin.\"\"\"
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
"""

if "list_super_admins" not in content:
    content += new_routes
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Added super admin endpoints")
