"""
Target document model — Goals, KPIs and achievement tracking.
"""

from datetime import datetime, timezone
from typing import Optional

from beanie import Document
from pydantic import Field
from beanie import PydanticObjectId


class Target(Document):
    """Target/KPI record with progress tracking."""

    title: str
    owner: Optional[str] = None  # person responsible
    department: Optional[str] = None  # Sales, Marketing, Engineering, etc.
    period: Optional[str] = None  # e.g. "May 2026", "Q2 2026"
    target_value: float = 0.0  # the goal number
    current_value: float = 0.0  # progress so far
    unit: str = "₹"  # ₹, %, pts, x, units, etc.
    status: str = "active"  # active, achieved, missed, paused

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
        name = "targets"
        indexes = [
            "org_id",
            "status",
        ]
