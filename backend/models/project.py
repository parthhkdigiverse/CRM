"""
Project document model — Plan, track, and budget client projects.
"""

from datetime import datetime, timezone
from typing import Optional, List

from beanie import Document, PydanticObjectId
from pydantic import Field


class Project(Document):
    """Project record containing code, progress, assignee, and budget details."""

    project_code: str  # e.g., P-001, P-002
    title: str
    client_name: Optional[str] = None  # Client or company name
    status: str = "planning"  # planning, in_process, testing, completed
    progress: int = 0  # 0 to 100
    budget: float = 0.0  # Project budget in INR
    end_date: Optional[datetime] = None
    assignee_ids: List[PydanticObjectId] = Field(default_factory=list)
    linked_lead_id: Optional[PydanticObjectId] = None

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
        name = "projects"
        indexes = [
            "org_id",
            "status",
            "project_code",
        ]
