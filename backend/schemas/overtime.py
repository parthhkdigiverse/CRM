from datetime import datetime
from typing import Optional
from pydantic import BaseModel

class OvertimeCreate(BaseModel):
    employee_id: str
    date: datetime
    hours: float
    description: Optional[str] = None

class OvertimeResponse(BaseModel):
    id: str
    employee_id: str
    employee_name: str
    date: datetime
    hours: float
    rate: float
    amount: float
    description: Optional[str] = None
    month: str
    created_at: datetime
