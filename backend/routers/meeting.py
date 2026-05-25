"""
Meeting router endpoints — calendar events query and manipulation.
"""

from datetime import datetime, time, date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from beanie import PydanticObjectId

from middleware.auth_middleware import get_current_user, get_current_org, org_filter
from middleware.rbac import require_module_read, require_module_write, require_module_full
from models.user import User
from models.organization import Organization
from models.meeting import Meeting
from models.notification import Notification
from models.employee import Employee
from schemas.meeting import MeetingCreate, MeetingUpdate
from schemas.common import SuccessResponse
from utils.helpers import utc_now
from services.audit_service import log_action

router = APIRouter(prefix="/api/v1/meetings", tags=["Meetings"])


@router.post("", response_model=SuccessResponse)
async def create_meeting(
    data: MeetingCreate,
    current_user: User = Depends(require_module_write("meetings")),
    org: Optional[Organization] = Depends(get_current_org)
):
    attendees = [PydanticObjectId(aid) for aid in data.attendee_ids if aid]

    meeting = Meeting(
        org_id=org.id if org else None,
        created_by=current_user.id,
        title=data.title,
        description=data.description,
        meeting_type=data.meeting_type,
        start_time=data.start_time,
        duration_minutes=data.duration_minutes,
        location=data.location,
        attendee_ids=attendees
    )
    await meeting.insert()
    await log_action(str(org.id) if org else None, str(current_user.id), "create", "meetings", str(meeting.id), changes={"title": data.title})
    
    # Notify attendees
    try:
        for aid in attendees:
            emp = await Employee.get(aid)
            if emp and emp.user_id:
                notif = Notification(
                    org_id=org.id if org else meeting.org_id,
                    user_id=emp.user_id,
                    created_by=current_user.id,
                    type="meeting_scheduled",
                    title="New meeting scheduled",
                    message=f"{current_user.full_name or current_user.email} invited you to '{data.title}'. Location: {data.location or 'N/A'}",
                    entity_type="meeting",
                    entity_id=meeting.id,
                )
                await notif.insert()
    except Exception:
        pass


    return SuccessResponse(
        data={"id": str(meeting.id)},
        message="Meeting created successfully"
    )


@router.get("", response_model=SuccessResponse)
async def list_meetings(
    date_str: Optional[str] = Query(None, alias="date"),  # ISO string or YYYY-MM-DD
    current_user: User = Depends(require_module_read("meetings")),
    org: Optional[Organization] = Depends(get_current_org)
):
    query = org_filter(org)
    if current_user.role == "employee":
        from models.employee import Employee
        emp = await Employee.find_one(Employee.user_id == current_user.id)
        emp_id = emp.id if emp else None
        query["$or"] = [{"created_by": current_user.id}, {"attendee_ids": emp_id}]
    
    if date_str:
        try:
            # Parse day bounds in local context
            d = date.fromisoformat(date_str.split('T')[0])
            start_dt = datetime.combine(d, time.min)
            end_dt = datetime.combine(d, time.max)
            query["start_time"] = {"$gte": start_dt, "$lte": end_dt}
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid date format. Expected YYYY-MM-DD.")

    items = await Meeting.find(query).sort("start_time").to_list()

    data = []
    for item in items:
        d = item.model_dump()
        d["id"] = str(d.pop("_id", item.id))
        d["org_id"] = str(d["org_id"]) if d.get("org_id") else None
        d["created_by"] = str(d["created_by"])
        d["attendee_ids"] = [str(aid) for aid in d.get("attendee_ids", [])]
        data.append(d)

    return SuccessResponse(data=data)


@router.put("/{meeting_id}", response_model=SuccessResponse)
async def update_meeting(
    meeting_id: str,
    data: MeetingUpdate,
    current_user: User = Depends(require_module_write("meetings")),
    org: Optional[Organization] = Depends(get_current_org)
):
    meeting = await Meeting.find_one(org_filter(org, {"_id": PydanticObjectId(meeting_id)}))
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    if current_user.role == "employee":
        from models.employee import Employee
        emp = await Employee.find_one(Employee.user_id == current_user.id)
        emp_id = emp.id if emp else None
        if emp_id not in meeting.attendee_ids and meeting.created_by != current_user.id:
            raise HTTPException(status_code=403, detail="You do not have permission to access this meeting")

    update_data = data.model_dump(exclude_unset=True)
    if "attendee_ids" in update_data:
        update_data["attendee_ids"] = [PydanticObjectId(aid) for aid in update_data["attendee_ids"] if aid]

    for k, v in update_data.items():
        setattr(meeting, k, v)

    meeting.updated_by = current_user.id
    meeting.updated_at = utc_now()
    await meeting.save()

    # Format attendees for readability in changes log
    changes_logged = update_data.copy()
    if "attendee_ids" in changes_logged:
        changes_logged["attendee_ids"] = [str(aid) for aid in changes_logged["attendee_ids"]]
    await log_action(str(org.id) if org else None, str(current_user.id), "update", "meetings", str(meeting.id), changes=changes_logged)

    return SuccessResponse(message="Meeting updated successfully")


@router.delete("/{meeting_id}", response_model=SuccessResponse)
async def delete_meeting(
    meeting_id: str,
    current_user: User = Depends(require_module_write("meetings")),
    org: Optional[Organization] = Depends(get_current_org)
):
    meeting = await Meeting.find_one(org_filter(org, {"_id": PydanticObjectId(meeting_id)}))
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    if current_user.role == "employee":
        from models.employee import Employee
        emp = await Employee.find_one(Employee.user_id == current_user.id)
        emp_id = emp.id if emp else None
        if emp_id not in meeting.attendee_ids and meeting.created_by != current_user.id:
            raise HTTPException(status_code=403, detail="You do not have permission to access this meeting")

    meeting.is_deleted = True
    meeting.updated_by = current_user.id
    meeting.updated_at = utc_now()
    await meeting.save()

    await log_action(str(org.id) if org else None, str(current_user.id), "delete", "meetings", str(meeting.id), changes={"title": meeting.title})

    return SuccessResponse(message="Meeting deleted successfully")
