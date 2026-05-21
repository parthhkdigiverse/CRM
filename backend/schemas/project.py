"""
Project request/response validation schemas.
"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


class ProjectCreate(BaseModel):
    project_code: str
    title: str
    client_name: Optional[str] = None
    status: str = "planning"
    progress: int = 0
    budget: float = 0.0
    end_date: Optional[datetime] = None
    assignee_ids: List[str] = []


class ProjectUpdate(BaseModel):
    project_code: Optional[str] = None
    title: Optional[str] = None
    client_name: Optional[str] = None
    status: Optional[str] = None
    progress: Optional[int] = None
    budget: Optional[float] = None
    end_date: Optional[datetime] = None
    assignee_ids: Optional[List[str]] = None


class ProjectResponse(BaseModel):
    id: str
    project_code: str
    title: str
    client_name: Optional[str] = None
    status: str
    progress: int
    budget: float
    end_date: Optional[datetime] = None
    assignee_ids: List[str] = []
    created_at: datetime
    updated_at: datetime
    org_id: str
