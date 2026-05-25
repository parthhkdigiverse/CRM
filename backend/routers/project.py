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
from models.notification import Notification
from schemas.project import ProjectCreate, ProjectUpdate
from schemas.common import SuccessResponse
from utils.helpers import utc_now, parse_object_id, paginate_params, build_paginated_response
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
        assignee_ids=assignees,
        linked_lead_id=PydanticObjectId(data.linked_lead_id) if data.linked_lead_id else None
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
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_module_read("projects")),
    org: Optional[Organization] = Depends(get_current_org)
):
    query = org_filter(org)
    if status:
        query["status"] = status

    from middleware.rbac import get_permission
    perm = get_permission(current_user.role, "projects")
    if perm == "own":
        from models.employee import Employee
        employee = await Employee.find_one(Employee.user_id == current_user.id, Employee.is_deleted == False)
        if not employee:
            return SuccessResponse(data=[])
        query["assignee_ids"] = employee.id

    skip, limit = paginate_params(page, per_page)
    items = await Project.find(query).skip(skip).limit(limit).to_list()
    total = await Project.find(query).count()
    
    # Format return list
    data = []
    for item in items:
        d = item.model_dump()
        d["id"] = str(d.pop("_id", item.id))
        d["org_id"] = str(d["org_id"])
        d["created_by"] = str(d["created_by"])
        d["assignee_ids"] = [str(aid) for aid in d.get("assignee_ids", [])]
        if d.get("linked_lead_id"): d["linked_lead_id"] = str(d["linked_lead_id"])
        data.append(d)

    return SuccessResponse(data=build_paginated_response(data, total, page, per_page))


@router.get("/{project_id}", response_model=SuccessResponse)
async def get_project(
    project_id: str,
    current_user: User = Depends(require_module_read("projects")),
    org: Optional[Organization] = Depends(get_current_org)
):
    project = await Project.find_one(org_filter(org, {"_id": parse_object_id(project_id, "project_id")}))
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    from middleware.rbac import get_permission
    if get_permission(current_user.role, "projects") == "own":
        from models.employee import Employee
        emp = await Employee.find_one(Employee.user_id == current_user.id, Employee.is_deleted == False)
        if not emp or emp.id not in project.assignee_ids:
            raise HTTPException(status_code=403, detail="You can only access projects assigned to you")

    d = project.model_dump()
    d["id"] = str(d.pop("_id", project.id))
    d["org_id"] = str(d["org_id"])
    d["created_by"] = str(d["created_by"])
    d["assignee_ids"] = [str(aid) for aid in d.get("assignee_ids", [])]
    if d.get("linked_lead_id"): d["linked_lead_id"] = str(d["linked_lead_id"])

    return SuccessResponse(data=d)

@router.put("/{project_id}", response_model=SuccessResponse)
async def update_project(
    project_id: str,
    data: ProjectUpdate,
    current_user: User = Depends(require_module_write("projects")),
    org: Optional[Organization] = Depends(get_current_org)
):
    project = await Project.find_one(org_filter(org, {"_id": parse_object_id(project_id, "project_id")}))
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    old_status = project.status

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
        if "linked_lead_id" in update_data:
            update_data["linked_lead_id"] = PydanticObjectId(update_data["linked_lead_id"]) if update_data["linked_lead_id"] else None

    for k, v in update_data.items():
        setattr(project, k, v)

    project.updated_by = current_user.id
    project.updated_at = utc_now()
    await project.save()    # Auto-generate Invoice disabled (moved to interactive frontend creation)

    if project.status == "completed" and old_status != "completed":
        try:
            org_id = org.id if org else current_user.org_id
            employee_name = current_user.full_name.strip() or current_user.email
            
            # Notify HR
            hr_users = await User.find(
                User.org_id == org_id,
                User.role == "hr",
                User.is_active == True
            ).to_list()
            for u in hr_users:
                if u.id != current_user.id:
                    hr_notif = Notification(
                        org_id=org_id,
                        user_id=u.id,
                        created_by=current_user.id,
                        type="task_assigned",
                        title="Project Completed",
                        message=f"{employee_name} is done this project",
                        entity_type="project",
                        entity_id=project.id,
                    )
                    await hr_notif.insert()
                    
            # Notify Admins
            admin_users = await User.find(
                User.org_id == org_id,
                User.role.in_(["admin", "super_admin"]),
                User.is_active == True
            ).to_list()
            for u in admin_users:
                if u.id != current_user.id:
                    admin_notif = Notification(
                        org_id=org_id,
                        user_id=u.id,
                        created_by=current_user.id,
                        type="task_assigned",
                        title="Project Completed",
                        message=f"{employee_name} is completed their project so please check the invoices section for generate invoices",
                        entity_type="project",
                        entity_id=project.id,
                    )
                    await admin_notif.insert()
        except Exception:
            pass

    # if project.status == "completed" and old_status != "completed":
    #     try:
    #         from models.invoice import Invoice, LineItem
    #         from utils.helpers import generate_invoice_number
    #         from datetime import datetime
    #         import logging
    # 
    #         # Check if invoice for this project code already exists
    #         existing_invoice = await Invoice.find_one(
    #             Invoice.org_id == (project.org_id or org.id),
    #             Invoice.is_deleted == False,
    #             {"notes": {"$regex": f"Project Code: {project.project_code}"}}
    #         )
    #         if not existing_invoice:
    #             year = datetime.now().year
    #             count = await Invoice.find(
    #                 Invoice.org_id == (project.org_id or org.id),
    #                 {"invoice_number": {"$regex": f"^INV-{year}-"}}
    #             ).count()
    #             inv_number = generate_invoice_number(year, count + 1)
    #             
    #             line_item = LineItem(
    #                 description=f"Project Delivery: {project.title}",
    #                 quantity=1.0,
    #                 unit_price=float(project.budget or 0.0),
    #                 tax_percent=0.0,
    #                 amount=float(project.budget or 0.0)
    #             )
    #             
    #             invoice = Invoice(
    #                 org_id=project.org_id or org.id,
    #                 created_by=current_user.id,
    #                 invoice_number=inv_number,
    #                 customer_name=project.client_name or "Internal Client",
    #                 line_items=[line_item],
    #                 status="pending",
    #                 notes=f"Auto-generated upon completion of project. Project Code: {project.project_code}"
    #             )
    #             invoice.calculate_totals()
    #             await invoice.insert()
    #             await log_action(str(org.id) if org else "super_admin", str(current_user.id), "create", "invoices", str(invoice.id))
    #     except Exception as e:
    #         logging.error(f"Failed to auto-generate invoice for project {project.project_code}: {e}", exc_info=True)
    # Delete associated invoice if status changed from completed to another status
    if old_status == "completed" and project.status != "completed":
        try:
            from models.invoice import Invoice
            existing_invoice = await Invoice.find_one(
                Invoice.org_id == (project.org_id or org.id),
                Invoice.is_deleted == False,
                {"notes": {"$regex": f"Project Code: {project.project_code}"}}
            )
            if existing_invoice:
                existing_invoice.is_deleted = True
                existing_invoice.deleted_at = utc_now()
                existing_invoice.deleted_by = current_user.id
                await existing_invoice.save()
                await log_action(str(org.id) if org else "super_admin", str(current_user.id), "delete", "invoices", str(existing_invoice.id))
        except Exception as e:
            import logging
            logging.error(f"Failed to auto-delete invoice for reverted project {project.project_code}: {e}", exc_info=True)

    # Sync lead status if linked
    if project.linked_lead_id and "status" in update_data:
        from models.lead import Lead
        linked_lead = await Lead.find_one({"_id": project.linked_lead_id})
        if linked_lead:
            new_lead_status = None
            if project.status == "completed":
                new_lead_status = "converted"
            elif project.status in ["planning", "in_process", "testing"] and linked_lead.status != "converted":
                new_lead_status = "in_process"

            if new_lead_status and linked_lead.status != new_lead_status:
                linked_lead.status = new_lead_status
                linked_lead.updated_at = utc_now()
                linked_lead.updated_by = current_user.id
                await linked_lead.save()

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
    project = await Project.find_one(org_filter(org, {"_id": parse_object_id(project_id, "project_id")}))
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    project.is_deleted = True
    project.updated_by = current_user.id
    project.updated_at = utc_now()
    await project.save()

    await log_action(str(org.id) if org else "super_admin", str(current_user.id), "delete", "projects", str(project.id))

    return SuccessResponse(message="Project deleted successfully")
