"""
Document/File vault model — Track organization files, contracts, and shared assets.
"""

from datetime import datetime, timezone
from typing import Optional

from beanie import Document, PydanticObjectId
from pydantic import Field


class DocumentModel(Document):
    """Document document representing uploaded files and assets."""

    name: str
    folder: str = "General"  # e.g., Finance, HR, Sales, Marketing, Legal, General
    size_bytes: int
    file_path: str  # Local file storage path
    mime_type: Optional[str] = None
    
    # Base fields
    org_id: PydanticObjectId
    uploaded_by: PydanticObjectId  # User or Employee ID
    uploaded_by_name: str  # E.g., Vikram T.
    uploaded_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_shared: bool = False
    is_deleted: bool = False

    class Settings:
        name = "documents"
        indexes = [
            "org_id",
            "folder",
        ]
