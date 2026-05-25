"""
Notification router endpoints — list, read tracking, star toggling, bulk updates, and user preferences.
"""

from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict

from fastapi import APIRouter, Depends, HTTPException, Query, status
from beanie import PydanticObjectId
from pydantic import BaseModel

from middleware.auth_middleware import get_current_user
from models.user import User
from models.notification import Notification
from schemas.notification import NotificationResponse, NotificationSettingsUpdate
from schemas.common import SuccessResponse
from utils.helpers import parse_object_id, utc_now

router = APIRouter(prefix="/api/v1/notifications", tags=["Notifications"])


class NotificationReadUpdate(BaseModel):
    is_read: Optional[bool] = None


def _aware_utc(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt.astimezone(timezone.utc)


def _notification_payload(notif: Notification, category: str) -> dict:
    d = notif.model_dump()
    d["id"] = str(notif.id)
    d["user_id"] = str(notif.user_id)
    d["created_by"] = str(notif.created_by)
    if d.get("entity_id"):
        d["entity_id"] = str(d["entity_id"])
    d["created_at"] = _aware_utc(notif.created_at).isoformat() if notif.created_at else None
    d["updated_at"] = _aware_utc(notif.updated_at).isoformat() if notif.updated_at else None
    d["category"] = category
    return d


def map_notification_to_category(notif: Notification) -> str:
    """Helper to dynamically map notification types/entity_types to sidebar category filters."""
    t = notif.type.lower()
    e = (notif.entity_type or "").lower()
    
    if "lead" in t or e == "lead":
        return "Leads"
    if "payment" in t or "invoice" in t or e == "invoice" or e == "payroll":
        return "Payments"
    if "message" in t or "chat" in t or "comment" in t or e == "chat":
        return "Messages"
    if "task" in t or e == "task" or "overtime" in t:
        return "Tasks"
    if "meeting" in t or e == "meeting" or "calendar" in t:
        return "Meetings"
    if "inventory" in t or e == "inventory" or "stock" in t:
        return "Inventory"
    if "report" in t or e == "report":
        return "Reports"
    return "System"


@router.get("", response_model=SuccessResponse)
async def list_notifications(
    unread_only: bool = Query(False),
    starred_only: bool = Query(False),
    category: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user)
):
    """Get list of notifications for the authenticated user."""
    if not current_user.org_id:
        return SuccessResponse(data=[])

    # Base query filter
    query = {
        "user_id": current_user.id,
        "is_deleted": {"$ne": True}
    }
    if unread_only:
        query["is_read"] = False
    if starred_only:
        query["is_starred"] = True

    notifications = await Notification.find(query).sort("-created_at").to_list()

    data = []
    for notif in notifications:
        notif_cat = map_notification_to_category(notif)
        
        # Category filter logic
        if category and category.lower() != "all" and notif_cat.lower() != category.lower():
            continue
            
        # Exclude restricted categories for employee and hr roles
        if current_user.role in ["employee", "hr"] and notif_cat in ["Inventory", "Reports", "System", "Payments"]:
            continue
            
        data.append(_notification_payload(notif, notif_cat))

    return SuccessResponse(data=data)


@router.put("/mark-all-read", response_model=SuccessResponse)
async def mark_all_read(current_user: User = Depends(get_current_user)):
    """Mark all active notifications for the current user as read."""
    await Notification.find(
        Notification.user_id == current_user.id,
        Notification.is_deleted == False,
        Notification.is_read == False
    ).update({"$set": {"is_read": True, "updated_at": utc_now()}})
    
    return SuccessResponse(message="All notifications marked as read")


@router.put("/clear-all", response_model=SuccessResponse)
async def clear_all(current_user: User = Depends(get_current_user)):
    """Soft-delete all active notifications for the current user."""
    await Notification.find(
        Notification.user_id == current_user.id,
        Notification.is_deleted == False
    ).update({"$set": {"is_deleted": True, "deleted_at": utc_now(), "deleted_by": current_user.id}})
    
    return SuccessResponse(message="All notifications cleared")


@router.put("/{notification_id}/read", response_model=SuccessResponse)
async def mark_read(
    notification_id: str,
    data: Optional[NotificationReadUpdate] = None,
    current_user: User = Depends(get_current_user)
):
    """Mark or toggle a notification read status."""
    notification_oid = parse_object_id(notification_id, "notification_id")
    notif = await Notification.find_one(
        Notification.user_id == current_user.id,
        Notification.is_deleted == False,
        Notification.id == notification_oid
    )
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
        
    notif.is_read = data.is_read if data and data.is_read is not None else not notif.is_read
    notif.updated_at = utc_now()
    await notif.save()
    
    return SuccessResponse(
        data={"id": str(notif.id), "is_read": notif.is_read},
        message="Notification read status updated"
    )


@router.put("/{notification_id}/star", response_model=SuccessResponse)
async def toggle_star(notification_id: str, current_user: User = Depends(get_current_user)):
    """Toggle a notification's starred status."""
    notification_oid = parse_object_id(notification_id, "notification_id")
    notif = await Notification.find_one(
        Notification.user_id == current_user.id,
        Notification.is_deleted == False,
        Notification.id == notification_oid
    )
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
        
    notif.is_starred = not notif.is_starred
    notif.updated_at = utc_now()
    await notif.save()
    
    return SuccessResponse(
        data={"id": str(notif.id), "is_starred": notif.is_starred},
        message="Notification starred status updated"
    )


@router.get("/settings", response_model=SuccessResponse)
async def get_settings(current_user: User = Depends(get_current_user)):
    """Get the notification preferences for the logged in user."""
    # Defaults matching design mockup
    default_prefs = {
        "delivery_channels": {
            "email": True,
            "push": True,
            "sms": False,
            "whatsapp": True
        },
        "notify_types": {
            "leads": True,
            "payments": True,
            "tasks": True,
            "system": True
        },
        "quiet_hours": {
            "enabled": True,
            "start": "22:00",
            "end": "08:00"
        }
    }
    
    prefs = current_user.notification_preferences or {}
    
    # Merge defaults for missing keys
    merged = {
        "delivery_channels": {**default_prefs["delivery_channels"], **prefs.get("delivery_channels", {})},
        "notify_types": {**default_prefs["notify_types"], **prefs.get("notify_types", {})},
        "quiet_hours": {**default_prefs["quiet_hours"], **prefs.get("quiet_hours", {})}
    }
    
    return SuccessResponse(data=merged)


@router.put("/settings", response_model=SuccessResponse)
async def update_settings(
    data: NotificationSettingsUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update user's notification preferences."""
    prefs = current_user.notification_preferences or {}
    
    if data.delivery_channels is not None:
        prefs["delivery_channels"] = {**prefs.get("delivery_channels", {}), **data.delivery_channels}
    if data.notify_types is not None:
        prefs["notify_types"] = {**prefs.get("notify_types", {}), **data.notify_types}
    if data.quiet_hours is not None:
        prefs["quiet_hours"] = {**prefs.get("quiet_hours", {}), **data.quiet_hours}
        
    current_user.notification_preferences = prefs
    current_user.updated_at = utc_now()
    await current_user.save()
    
    return SuccessResponse(data=prefs, message="Notification preferences updated successfully")
