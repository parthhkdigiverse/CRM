"""
Finance summary routes — aggregated financial data from invoices, sales, and payroll.
"""

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends
from middleware.auth_middleware import get_current_user, get_current_org, org_filter
from middleware.rbac import require_module_read
from models.user import User
from models.organization import Organization
from models.invoice import Invoice
from models.sale import Sale
from models.payroll import Payroll
from schemas.common import SuccessResponse

router = APIRouter(prefix="/api/v1/finance", tags=["Finance"])


@router.get("/summary", response_model=SuccessResponse)
async def get_finance_summary(
    current_user: User = Depends(require_module_read("finance")),
    org: Optional[Organization] = Depends(get_current_org),
):
    """Return aggregated financial metrics, monthly cash-flow data, and recent invoices."""

    now = datetime.now(timezone.utc)

    # ── Fetch all relevant documents (scoped to org) ──────────────────

    inv_query = org_filter(org)
    invoices = await Invoice.find(inv_query).to_list()

    # Sales collection doesn't have is_deleted so just filter by org
    sale_query = {"org_id": str(org.id)} if org else {}
    sales = await Sale.find(sale_query).to_list()

    payroll_query = {"org_id": str(org.id)} if org else {}
    payrolls = await Payroll.find(payroll_query).to_list()

    # ── Metric cards ──────────────────────────────────────────────────

    # Total Income = paid invoices total + completed sales total
    paid_invoice_total = sum(inv.total for inv in invoices if inv.status == "paid")
    completed_sales_total = sum(
        s.total_amount for s in sales if s.status == "Completed"
    )
    total_income = paid_invoice_total + completed_sales_total

    # Total Expense = sum of net_pay from payroll
    total_expense = sum(p.net_pay for p in payrolls)

    # Net Profit
    net_profit = total_income - total_expense

    # Outstanding = unpaid invoices (sent / overdue / draft)
    outstanding = sum(
        inv.total
        for inv in invoices
        if inv.status in ("sent", "overdue", "draft")
    )

    # ── Monthly cash-flow (last 6 months) ─────────────────────────────

    months_label = []
    monthly_income = []
    monthly_expense = []

    for i in range(5, -1, -1):
        m = now.month - i
        y = now.year
        while m <= 0:
            m += 12
            y -= 1
        dt = datetime(y, m, 1, tzinfo=timezone.utc)
        label = dt.strftime("%b")
        year = dt.year
        month = dt.month
        months_label.append(label)

        # Income for this month
        m_income = sum(
            inv.total
            for inv in invoices
            if inv.status == "paid"
            and inv.created_at.year == year
            and inv.created_at.month == month
        ) + sum(
            s.total_amount
            for s in sales
            if s.status == "Completed"
            and s.sale_date.year == year
            and s.sale_date.month == month
        )
        monthly_income.append(round(m_income, 2))

        # Expense for this month (payroll month field is "YYYY-MM")
        month_str = f"{year}-{month:02d}"
        m_expense = sum(p.net_pay for p in payrolls if p.month == month_str)
        monthly_expense.append(round(m_expense, 2))

    cash_flow = [
        {"month": m, "income": inc, "expense": exp}
        for m, inc, exp in zip(months_label, monthly_income, monthly_expense)
    ]

    # ── Recent invoices (last 10) ─────────────────────────────────────

    sorted_invoices = sorted(invoices, key=lambda x: x.created_at, reverse=True)[:10]
    recent_invoices = []
    for inv in sorted_invoices:
        recent_invoices.append(
            {
                "id": str(inv.id),
                "invoice_number": inv.invoice_number,
                "customer_name": inv.customer_name or "—",
                "total": inv.total,
                "status": inv.status,
                "created_at": inv.created_at.isoformat(),
                "due_date": inv.due_date.isoformat() if inv.due_date else None,
            }
        )

    return SuccessResponse(
        data={
            "total_income": round(total_income, 2),
            "total_expense": round(total_expense, 2),
            "net_profit": round(net_profit, 2),
            "outstanding": round(outstanding, 2),
            "cash_flow": cash_flow,
            "recent_invoices": recent_invoices,
        }
    )
