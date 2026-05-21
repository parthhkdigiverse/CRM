"""
Notification response schema.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class NotificationResponse(BaseModel):
    id: str
    type: str
    title: str
    message: str
    is_read: bool
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    created_at: datetime
