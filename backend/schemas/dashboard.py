"""
Dashboard data schemas.
"""

from pydantic import BaseModel


class DashboardKPIs(BaseModel):
    total_contacts: int = 0
    active_leads: int = 0
    open_deals_value: float = 0.0
    revenue_this_month: float = 0.0
    overdue_invoices: int = 0
    pending_tasks: int = 0


class RevenueChartData(BaseModel):
    month: str
    revenue: float


class PipelineFunnel(BaseModel):
    stage: str
    count: int
    value: float
