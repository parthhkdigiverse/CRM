"""
Task document model — tasks with comments, recurrence, and entity linking.
"""

from datetime import datetime, timezone
from typing import Optional, List
from uuid import uuid4

from beanie import Document
from pydantic import BaseModel, Field
from beanie import PydanticObjectId


class TaskComment(BaseModel):
    """Embedded comment within a task."""

    id: str = Field(default_factory=lambda: str(uuid4()))
    user_id: PydanticObjectId
    content: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Task(Document):
    """Task with comments, recurrence, and linked entities."""

    title: str
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    priority: str = "medium"  # low, medium, high, urgent
    status: str = "todo"  # todo, in_progress, done
    assigned_to: Optional[PydanticObjectId] = None
    linked_type: Optional[str] = None  # contact, lead, deal, company
    linked_id: Optional[PydanticObjectId] = None
    reminder_at: Optional[datetime] = None
    is_recurring: bool = False
    recurrence_pattern: Optional[str] = None  # daily, weekly, monthly
    comments: List[TaskComment] = Field(default_factory=list)

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
        name = "tasks"
        indexes = [
            "org_id",
            "assigned_to",
            "status",
        ]
