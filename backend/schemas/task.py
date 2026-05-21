"""
Task request/response schemas.
"""

from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel


class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    priority: str = "medium"
    status: str = "todo"
    assigned_to: Optional[str] = None
    linked_type: Optional[str] = None
    linked_id: Optional[str] = None
    reminder_at: Optional[datetime] = None
    is_recurring: bool = False
    recurrence_pattern: Optional[str] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    assigned_to: Optional[str] = None
    linked_type: Optional[str] = None
    linked_id: Optional[str] = None
    reminder_at: Optional[datetime] = None
    is_recurring: Optional[bool] = None
    recurrence_pattern: Optional[str] = None


class CommentCreate(BaseModel):
    content: str


class TaskResponse(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    priority: str
    status: str
    assigned_to: Optional[str] = None
    linked_type: Optional[str] = None
    linked_id: Optional[str] = None
    reminder_at: Optional[datetime] = None
    is_recurring: bool
    recurrence_pattern: Optional[str] = None
    comments: List[dict] = []
    created_at: datetime
    updated_at: datetime
