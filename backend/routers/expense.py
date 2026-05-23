"""
Expense routes - CRUD and finance/report-ready summaries.
"""

from collections import defaultdict
from datetime import datetime, timezone
from typing import Optional

from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, status

from middleware.auth_middleware import get_current_org, org_filter
from middleware.rbac import require_module_read, require_module_write
from models.expense import Expense
from models.organization import Organization
from models.user import User
from schemas.common import PaginatedResponse, SuccessResponse
from schemas.expense import ExpenseCreate, ExpenseUpdate
from services.audit_service import log_action
from utils.helpers import build_paginated_response, build_sort_params, paginate_params, utc_now

router = APIRouter(prefix="/api/v1/expenses", tags=["Expenses"])

ACTIVE_EXPENSE_STATUSES = {"approved", "paid"}
VALID_STATUSES = {"draft", "submitted", "approved", "rejected", "paid"}


def _normalize_status(status_value: Optional[str]) -> str:
    status_text = (status_value or "approved").lower()
    if status_text not in VALID_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid expense status. Use one of: {', '.join(sorted(VALID_STATUSES))}",
        )
    return status_text


def _expense_to_dict(expense: Expense) -> dict:
    data = expense.model_dump()
    data["id"] = str(data.pop("_id", expense.id))
    return data


@router.post("", response_model=SuccessResponse)
async def create_expense(
    data: ExpenseCreate,
    current_user: User = Depends(require_module_write("expenses")),
    org: Optional[Organization] = Depends(get_current_org),
):
    if not org:
        raise HTTPException(status_code=400, detail="Expenses must belong to an organization")

    payload = data.model_dump(exclude={"paid_by_user_id"})
    payload["status"] = _normalize_status(data.status)
    if payload.get("expense_date") is None:
        payload["expense_date"] = utc_now()

    expense = Expense(
        org_id=org.id,
        created_by=current_user.id,
        paid_by_user_id=PydanticObjectId(data.paid_by_user_id) if data.paid_by_user_id else current_user.id,
        **payload,
    )

    if expense.status in ACTIVE_EXPENSE_STATUSES:
        expense.approved_by_user_id = current_user.id
        expense.approved_at = utc_now()

    await expense.insert()
    await log_action(str(org.id), str(current_user.id), "create", "expenses", str(expense.id))

    return SuccessResponse(data={"id": str(expense.id)}, message="Expense created successfully")


@router.get("", response_model=PaginatedResponse)
async def list_expenses(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    sort_by: str = Query("expense_date"),
    sort_order: str = Query("desc"),
    search: Optional[str] = None,
    category: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: User = Depends(require_module_read("expenses")),
    org: Optional[Organization] = Depends(get_current_org),
):
    skip, limit = paginate_params(page, per_page)
    query = org_filter(org)

    if search:
        query["$or"] = [
            {"category": {"$regex": search, "$options": "i"}},
            {"vendor_name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
        ]
    if category:
        query["category"] = category
    if status_filter:
        query["status"] = _normalize_status(status_filter)

    items = await Expense.find(query).sort(build_sort_params(sort_by, sort_order)).skip(skip).limit(limit).to_list()
    total = await Expense.find(query).count()
    data = [_expense_to_dict(item) for item in items]

    return PaginatedResponse(**build_paginated_response(data, total, page, per_page))


@router.get("/summary", response_model=SuccessResponse)
async def get_expense_summary(
    current_user: User = Depends(require_module_read("expenses")),
    org: Optional[Organization] = Depends(get_current_org),
):
    expenses = await Expense.find(org_filter(org)).to_list()
    active_expenses = [e for e in expenses if e.status in ACTIVE_EXPENSE_STATUSES]
    pending_expenses = [e for e in expenses if e.status == "submitted"]

    now = datetime.now(timezone.utc)
    category_totals = defaultdict(float)
    monthly = []

    for expense in active_expenses:
        category_totals[expense.category] += expense.amount

    for i in range(5, -1, -1):
        month = now.month - i
        year = now.year
        while month <= 0:
            month += 12
            year -= 1
        label = datetime(year, month, 1, tzinfo=timezone.utc).strftime("%b")
        total = sum(e.amount for e in active_expenses if e.expense_date.year == year and e.expense_date.month == month)
        monthly.append({"month": label, "expense": round(total, 2)})

    recent_expenses = sorted(expenses, key=lambda e: e.expense_date, reverse=True)[:10]

    return SuccessResponse(
        data={
            "total_expense": round(sum(e.amount for e in active_expenses), 2),
            "pending_approvals": round(sum(e.amount for e in pending_expenses), 2),
            "expense_count": len(active_expenses),
            "category_totals": [
                {"category": category, "amount": round(amount, 2)}
                for category, amount in sorted(category_totals.items(), key=lambda item: item[1], reverse=True)
            ],
            "monthly": monthly,
            "recent_expenses": [_expense_to_dict(item) for item in recent_expenses],
        }
    )


@router.get("/{expense_id}", response_model=SuccessResponse)
async def get_expense(
    expense_id: str,
    current_user: User = Depends(require_module_read("expenses")),
    org: Optional[Organization] = Depends(get_current_org),
):
    expense = await Expense.find_one(org_filter(org, {"_id": PydanticObjectId(expense_id)}))
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    return SuccessResponse(data=_expense_to_dict(expense))


@router.put("/{expense_id}", response_model=SuccessResponse)
async def update_expense(
    expense_id: str,
    data: ExpenseUpdate,
    current_user: User = Depends(require_module_write("expenses")),
    org: Optional[Organization] = Depends(get_current_org),
):
    expense = await Expense.find_one(org_filter(org, {"_id": PydanticObjectId(expense_id)}))
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    update_data = data.model_dump(exclude_unset=True, exclude={"paid_by_user_id"})
    if "status" in update_data:
        update_data["status"] = _normalize_status(update_data["status"])
        if update_data["status"] in ACTIVE_EXPENSE_STATUSES and expense.status not in ACTIVE_EXPENSE_STATUSES:
            expense.approved_by_user_id = current_user.id
            expense.approved_at = utc_now()

    if data.paid_by_user_id is not None:
        expense.paid_by_user_id = PydanticObjectId(data.paid_by_user_id) if data.paid_by_user_id else None

    for key, value in update_data.items():
        setattr(expense, key, value)

    expense.updated_by = current_user.id
    expense.updated_at = utc_now()
    await expense.save()

    await log_action(str(org.id) if org else "super_admin", str(current_user.id), "update", "expenses", str(expense.id))
    return SuccessResponse(message="Expense updated successfully")


@router.delete("/{expense_id}", response_model=SuccessResponse)
async def delete_expense(
    expense_id: str,
    current_user: User = Depends(require_module_write("expenses")),
    org: Optional[Organization] = Depends(get_current_org),
):
    expense = await Expense.find_one(org_filter(org, {"_id": PydanticObjectId(expense_id)}))
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    expense.is_deleted = True
    expense.deleted_at = utc_now()
    expense.deleted_by = current_user.id
    expense.updated_at = utc_now()
    await expense.save()

    await log_action(str(org.id) if org else "super_admin", str(current_user.id), "delete", "expenses", str(expense.id))
    return SuccessResponse(message="Expense deleted successfully")
