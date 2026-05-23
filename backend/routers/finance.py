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
from models.expense import Expense
from schemas.common import SuccessResponse

router = APIRouter(prefix="/api/v1/finance", tags=["Finance"])
ACTIVE_EXPENSE_STATUSES = {"approved", "paid"}


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

    expense_query = org_filter(org)
    expenses = await Expense.find(expense_query).to_list()
    active_expenses = [e for e in expenses if e.status in ACTIVE_EXPENSE_STATUSES]

    # ── Metric cards ──────────────────────────────────────────────────

    # Total Income = completed sales total (which includes synced paid invoices)
    total_income = sum(
        s.total_amount for s in sales if s.status == "Completed"
    )

    # Total Expense = payroll net pay + approved/paid business expenses
    payroll_expense_total = sum(p.net_pay for p in payrolls)
    business_expense_total = sum(e.amount for e in active_expenses)
    total_expense = payroll_expense_total + business_expense_total

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

        # Income for this month (completed sales includes synced paid invoices)
        m_income = sum(
            s.total_amount
            for s in sales
            if s.status == "Completed"
            and s.sale_date.year == year
            and s.sale_date.month == month
        )
        monthly_income.append(round(m_income, 2))

        # Expense for this month (payroll month field is "YYYY-MM" + dated expenses)
        month_str = f"{year}-{month:02d}"
        m_expense = sum(p.net_pay for p in payrolls if p.month == month_str) + sum(
            e.amount
            for e in active_expenses
            if e.expense_date.year == year and e.expense_date.month == month
        )
        monthly_expense.append(round(m_expense, 2))

    cash_flow = [
        {"month": m, "income": inc, "expense": exp}
        for m, inc, exp in zip(months_label, monthly_income, monthly_expense)
    ]

    # ── Recent invoices (last 10) ─────────────────────────────────────

    sorted_invoices = sorted(invoices, key=lambda x: x.created_at, reverse=True)[:10]
    sorted_expenses = sorted(expenses, key=lambda x: x.expense_date, reverse=True)[:10]
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
            "payroll_expense": round(payroll_expense_total, 2),
            "business_expense": round(business_expense_total, 2),
            "cash_flow": cash_flow,
            "recent_invoices": recent_invoices,
            "recent_expenses": [
                {
                    "id": str(exp.id),
                    "expense_date": exp.expense_date.isoformat(),
                    "category": exp.category,
                    "amount": exp.amount,
                    "vendor_name": exp.vendor_name,
                    "status": exp.status,
                    "payment_method": exp.payment_method,
                }
                for exp in sorted_expenses
            ],
        }
    )
