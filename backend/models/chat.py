"""
Chat models — Chat rooms and messages for real-time messaging.
"""

from datetime import datetime, timezone
from typing import Optional, List

from beanie import Document, PydanticObjectId
from pydantic import Field


class ChatRoom(Document):
    """Represents a chat conversation between 2 or more users."""
    
    participants: List[PydanticObjectId]  # List of User or Employee IDs
    room_type: str = "direct"             # 'direct' or 'group'
    name: Optional[str] = None            # Useful for group chats
    last_message_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    # Base fields
    org_id: PydanticObjectId
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "chat_rooms"
        indexes = [
            "org_id",
            "participants",
            "last_message_at"
        ]


class ChatMessage(Document):
    """Represents an individual message sent within a ChatRoom."""
    
    room_id: PydanticObjectId
    sender_id: PydanticObjectId
    content: str
    is_read: bool = False
    reply_to_id: Optional[PydanticObjectId] = None  # Reply to another message
    
    # Base fields
    org_id: PydanticObjectId
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "chat_messages"
        indexes = [
            "room_id",
            "sender_id",
            "created_at"
        ]
