"""
Document validation and serialization schemas.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class DocumentResponse(BaseModel):
    id: str
    name: str
    folder: str
    size_bytes: int
    uploaded_by_name: str
    uploaded_at: datetime
    mime_type: Optional[str] = None
