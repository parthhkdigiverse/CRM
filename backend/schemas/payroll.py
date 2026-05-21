from typing import Optional, Literal
from pydantic import BaseModel

class PayrollUpdate(BaseModel):
    working_days: Optional[int] = None
    worked_days: Optional[int] = None
    leaves: Optional[int] = None
    basic: Optional[float] = None
    bonus: Optional[float] = None
    deductions: Optional[float] = None
    net_pay: Optional[float] = None
    status: Optional[Literal['Paid', 'Pending', 'Processing']] = None
