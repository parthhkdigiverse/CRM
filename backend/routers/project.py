"""
Project router endpoints — GET, POST, PUT, and DELETE operations.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from beanie import PydanticObjectId

from middleware.auth_middleware import get_current_user, get_current_org, org_filter
from middleware.rbac import require_module_read, require_module_write, require_module_full
from models.user import User
from models.organization import Organization
from models.project import Project
from schemas.project import ProjectCreate, ProjectUpdate
from schemas.common import SuccessResponse
from utils.helpers import utc_now
from services.audit_service import log_action

router = APIRouter(prefix="/api/v1/projects", tags=["Projects"])


@router.post("", response_model=SuccessResponse)
async def create_project(
    data: ProjectCreate,
    current_user: User = Depends(require_module_full("projects")),
    org: Optional[Organization] = Depends(get_current_org)
):
    # Check if project code is unique within this org
    existing = await Project.find_one(Project.project_code == data.project_code, Project.org_id == org.id, Project.is_deleted == False)
    if existing:
        raise HTTPException(status_code=400, detail="Project code already exists in this organization")

    # Map assignee IDs to Beanie ObjectIds
    assignees = [PydanticObjectId(aid) for aid in data.assignee_ids if aid]

    project = Project(
        org_id=org.id if org else None,
        created_by=current_user.id,
        project_code=data.project_code,
        title=data.title,
        client_name=data.client_name,
        status=data.status,
        progress=data.progress,
        budget=data.budget,
        end_date=data.end_date,
        assignee_ids=assignees
    )
    await project.insert()
    await log_action(str(org.id) if org else "super_admin", str(current_user.id), "create", "projects", str(project.id))

    return SuccessResponse(
        data={"id": str(project.id)},
        message="Project created successfully"
    )


@router.get("", response_model=SuccessResponse)
async def list_projects(
    status: Optional[str] = Query(None),
    current_user: User = Depends(require_module_read("projects")),
    org: Optional[Organization] = Depends(get_current_org)
):
    query = org_filter(org)
    if status:
        query["status"] = status

    items = await Project.find(query).to_list()
    
    # Format return list
    data = []
    for item in items:
        d = item.model_dump()
        d["id"] = str(d.pop("_id", item.id))
        d["org_id"] = str(d["org_id"])
        d["created_by"] = str(d["created_by"])
        d["assignee_ids"] = [str(aid) for aid in d.get("assignee_ids", [])]
        data.append(d)

    return SuccessResponse(data=data)


@router.get("/{project_id}", response_model=SuccessResponse)
async def get_project(
    project_id: str,
    current_user: User = Depends(require_module_read("projects")),
    org: Optional[Organization] = Depends(get_current_org)
):
    project = await Project.find_one(org_filter(org, {"_id": PydanticObjectId(project_id)}))
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    d = project.model_dump()
    d["id"] = str(d.pop("_id", project.id))
    d["org_id"] = str(d["org_id"])
    d["created_by"] = str(d["created_by"])
    d["assignee_ids"] = [str(aid) for aid in d.get("assignee_ids", [])]

    return SuccessResponse(data=d)


@router.put("/{project_id}", response_model=SuccessResponse)
async def update_project(
    project_id: str,
    data: ProjectUpdate,
    current_user: User = Depends(require_module_write("projects")),
    org: Optional[Organization] = Depends(get_current_org)
):
    project = await Project.find_one(org_filter(org, {"_id": PydanticObjectId(project_id)}))
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    from middleware.rbac import get_permission
    perm = get_permission(current_user.role, "projects")

    update_data = data.model_dump(exclude_unset=True)

    if perm == "own":
        from models.employee import Employee
        emp = await Employee.find_one(Employee.user_id == current_user.id)
        if not emp or emp.id not in project.assignee_ids:
            raise HTTPException(status_code=403, detail="You can only update projects assigned to you")
            
        update_data = {k: v for k, v in update_data.items() if k in ("status", "progress")}
        if not update_data:
            return SuccessResponse(message="No allowed fields updated")
    else:
        if "assignee_ids" in update_data:
            update_data["assignee_ids"] = [PydanticObjectId(aid) for aid in update_data["assignee_ids"] if aid]

    for k, v in update_data.items():
        setattr(project, k, v)

    project.updated_by = current_user.id
    project.updated_at = utc_now()
    await project.save()

    # Format assignees for readability in changes log
    changes_logged = update_data.copy()
    if "assignee_ids" in changes_logged:
        changes_logged["assignee_ids"] = [str(aid) for aid in changes_logged["assignee_ids"]]
    await log_action(str(org.id) if org else "super_admin", str(current_user.id), "update", "projects", str(project.id), changes=changes_logged)

    return SuccessResponse(message="Project updated successfully")


@router.delete("/{project_id}", response_model=SuccessResponse)
async def delete_project(
    project_id: str,
    current_user: User = Depends(require_module_full("projects")),
    org: Optional[Organization] = Depends(get_current_org)
):
    project = await Project.find_one(org_filter(org, {"_id": PydanticObjectId(project_id)}))
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    project.is_deleted = True
    project.updated_by = current_user.id
    project.updated_at = utc_now()
    await project.save()

    await log_action(str(org.id) if org else "super_admin", str(current_user.id), "delete", "projects", str(project.id))

    return SuccessResponse(message="Project deleted successfully")
