"""
Activity document model — immutable activity/timeline log.
"""

from datetime import datetime, timezone
from typing import Optional, Dict

from beanie import Document
from pydantic import Field
from beanie import PydanticObjectId


class Activity(Document):
    """Immutable activity log entry — no updates or deletes allowed."""

    type: str  # call, email, meeting, note, stage_change, status_change, created, updated, deleted
    description: str
    entity_type: str  # contact, lead, deal, company, invoice, task
    entity_id: PydanticObjectId
    metadata: Dict = Field(default_factory=dict)

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
        name = "activities"
        indexes = [
            "org_id",
            "entity_type",
            "entity_id",
        ]
