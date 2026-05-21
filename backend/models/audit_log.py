"""
AuditLog document model — immutable admin audit trail.
"""

from datetime import datetime, timezone
from typing import Optional, Dict

from beanie import Document
from pydantic import Field
from beanie import PydanticObjectId


class AuditLog(Document):
    """Immutable audit log — every CUD action is logged with before/after data."""

    user_id: PydanticObjectId
    action: str  # create, update, delete
    module: str  # contacts, companies, leads, deals, invoices, tasks, employees, etc.
    entity_id: Optional[PydanticObjectId] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    changes: Dict = Field(default_factory=dict)  # {field: {old: ..., new: ...}}

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
        name = "audit_logs"
        indexes = [
            "org_id",
            "module",
            "user_id",
            "entity_id",
        ]
