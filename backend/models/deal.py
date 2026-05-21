"""
Deal document model — sales pipeline with stage tracking and history.
"""

from datetime import datetime, timezone
from typing import Optional, List, Dict

from beanie import Document
from pydantic import Field
from beanie import PydanticObjectId


class Deal(Document):
    """Deal record with pipeline stage tracking and revenue forecasting."""

    title: str
    contact_id: Optional[PydanticObjectId] = None
    company_id: Optional[PydanticObjectId] = None
    value: float = 0.0
    currency: str = "INR"
    stage: str = "prospecting"  # prospecting, qualification, proposal, negotiation, closed_won, closed_lost
    probability: int = 0  # 0-100
    expected_close_date: Optional[datetime] = None
    assigned_to: Optional[PydanticObjectId] = None
    notes: Optional[str] = None
    won_lost_reason: Optional[str] = None
    stage_history: List[Dict] = Field(default_factory=list)  # [{from_stage, to_stage, changed_at, changed_by}]

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
        name = "deals"
        indexes = [
            "org_id",
            "stage",
            "assigned_to",
        ]
