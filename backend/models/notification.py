"""
Notification document model — per-user notification inbox.
"""

from datetime import datetime, timezone
from typing import Optional

from beanie import Document
from pydantic import Field
from beanie import PydanticObjectId


class Notification(Document):
    """Per-user notification entry with read tracking."""

    user_id: PydanticObjectId
    type: str  # task_due, invoice_overdue, deal_stage_change, lead_assigned, comment_mention
    title: str
    message: str
    is_read: bool = False
    entity_type: Optional[str] = None
    entity_id: Optional[PydanticObjectId] = None

    # Base fields
    org_id: PydanticObjectId
    created_by: PydanticObjectId
    updated_by: Optional[PydanticObjectId] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_deleted: bool = False
    deleted_at: Optional[datetime] = None
    deleted_by: Optional[PydanticObjectId] = None

    class Settings:
        name = "notifications"
        indexes = [
            "user_id",
            "is_read",
        ]
