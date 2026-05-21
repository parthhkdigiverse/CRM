"""
Common response envelope schemas used across all API endpoints.
"""

from typing import Any, List, Optional

from pydantic import BaseModel, Field, model_validator
from bson import ObjectId
from beanie import PydanticObjectId


def convert_object_ids(data: Any) -> Any:
    """Recursively convert ObjectId and PydanticObjectId instances to strings."""
    if isinstance(data, dict):
        return {k: convert_object_ids(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [convert_object_ids(v) for v in data]
    elif isinstance(data, (ObjectId, PydanticObjectId)):
        return str(data)
    return data


class SuccessResponse(BaseModel):
    """Standard success response envelope."""

    success: bool = True
    data: Any = None
    message: str = "Operation successful"
    request_id: str = ""

    @model_validator(mode='before')
    @classmethod
    def convert_ids(cls, data: Any) -> Any:
        if isinstance(data, dict) and "data" in data:
            data["data"] = convert_object_ids(data["data"])
        elif hasattr(data, "data"):
            try:
                data.data = convert_object_ids(data.data)
            except AttributeError:
                pass
        return data


class ErrorDetail(BaseModel):
    """Structured error detail."""

    code: str
    message: str
    details: List[Any] = Field(default_factory=list)


class ErrorResponse(BaseModel):
    """Standard error response envelope."""

    success: bool = False
    error: ErrorDetail
    request_id: str = ""


class PaginatedResponse(BaseModel):
    """Paginated list response envelope."""

    data: List[Any] = Field(default_factory=list)
    total: int = 0
    page: int = 1
    per_page: int = 20
    total_pages: int = 0

    @model_validator(mode='before')
    @classmethod
    def convert_ids(cls, data: Any) -> Any:
        if isinstance(data, dict) and "data" in data:
            data["data"] = convert_object_ids(data["data"])
        elif hasattr(data, "data"):
            try:
                data.data = convert_object_ids(data.data)
            except AttributeError:
                pass
        return data
