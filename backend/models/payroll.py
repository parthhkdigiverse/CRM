from typing import Optional, Literal
from beanie import Document
from pydantic import Field
from datetime import datetime
from bson import ObjectId

class Payroll(Document):
    employee_id: str
    org_id: str
    month: str
    working_days: int
    worked_days: int
    leaves: int
    basic: float
    bonus: float
    deductions: float
    net_pay: float
    status: Literal['Paid', 'Pending'] = 'Pending'
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "payrolls"
        indexes = [
            "org_id",
            "employee_id",
            "month"
        ]
