"""
Invoice routes with calculation logic.
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from beanie import PydanticObjectId

from middleware.auth_middleware import get_current_user, get_current_org, org_filter
from middleware.rbac import require_module_read, require_module_write, require_module_full
from models.user import User
from models.organization import Organization
from models.invoice import Invoice, LineItem
from models.notification import Notification
from schemas.invoice import InvoiceCreate, InvoiceUpdate, InvoiceResponse, MarkPaidRequest
from schemas.common import SuccessResponse, PaginatedResponse
from utils.helpers import paginate_params, build_paginated_response, build_sort_params, generate_invoice_number, utc_now
from services.audit_service import log_action
from datetime import datetime

router = APIRouter(prefix="/api/v1/invoices", tags=["Invoices"])


@router.post("", response_model=SuccessResponse)
async def create_invoice(
    data: InvoiceCreate,
    current_user: User = Depends(require_module_write("invoices")),
    org: Optional[Organization] = Depends(get_current_org)
):
    year = datetime.now().year
    
    # Simple auto-increment for sequence
    count = await Invoice.find(org_filter(org, {"invoice_number": {"$regex": f"^INV-{year}-"}})).count()
    inv_number = generate_invoice_number(year, count + 1)
    
    invoice = Invoice(
        org_id=org.id if org else None,
        created_by=current_user.id,
        invoice_number=inv_number,
        **data.model_dump(exclude={"contact_id", "company_id", "line_items"})
    )
    if data.contact_id: invoice.contact_id = PydanticObjectId(data.contact_id)
    if data.company_id: invoice.company_id = PydanticObjectId(data.company_id)
    
    invoice.line_items = [LineItem(**item.model_dump()) for item in data.line_items]
    invoice.calculate_totals()

    await invoice.insert()
    await sync_invoice_to_sale(invoice)
    await log_action(str(org.id) if org else "super_admin", str(current_user.id), "create", "invoices", str(invoice.id))
    
    return SuccessResponse(data={"id": str(invoice.id), "invoice_number": inv_number}, message="Invoice created successfully")


@router.get("", response_model=PaginatedResponse)
async def list_invoices(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc"),
    search: Optional[str] = None,
    status: Optional[str] = None,
    current_user: User = Depends(require_module_read("invoices")),
    org: Optional[Organization] = Depends(get_current_org)
):
    skip, limit = paginate_params(page, per_page)
    sort = build_sort_params(sort_by, sort_order)
    
    query = org_filter(org)
    if search:
        query["invoice_number"] = {"$regex": search, "$options": "i"}
    if status:
        query["status"] = status
        
    cursor = Invoice.find(query).sort(sort).skip(skip).limit(limit)
    items = await cursor.to_list()
    total = await Invoice.find(query).count()
    
    data = []
    for item in items:
        d = item.model_dump()
        d["id"] = str(d.pop("_id", item.id))
        if d.get("contact_id"): d["contact_id"] = str(d["contact_id"])
        if d.get("company_id"): d["company_id"] = str(d["company_id"])
        data.append(d)
        
    response_data = build_paginated_response(data, total, page, per_page)
    return PaginatedResponse(**response_data)


@router.get("/{invoice_id}", response_model=SuccessResponse)
async def get_invoice(
    invoice_id: str,
    current_user: User = Depends(require_module_read("invoices")),
    org: Optional[Organization] = Depends(get_current_org)
):
    invoice = await Invoice.find_one(org_filter(org, {"_id": PydanticObjectId(invoice_id)}))
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
        
    d = invoice.model_dump()
    d["id"] = str(d.pop("_id", invoice.id))
    if d.get("contact_id"): d["contact_id"] = str(d["contact_id"])
    if d.get("company_id"): d["company_id"] = str(d["company_id"])
        
    return SuccessResponse(data=d)


@router.put("/{invoice_id}", response_model=SuccessResponse)
async def update_invoice(
    invoice_id: str,
    data: InvoiceUpdate,
    current_user: User = Depends(require_module_write("invoices")),
    org: Optional[Organization] = Depends(get_current_org)
):
    invoice = await Invoice.find_one(org_filter(org, {"_id": PydanticObjectId(invoice_id)}))
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
        
    update_data = data.model_dump(exclude_unset=True, exclude={"line_items"})
    if "contact_id" in update_data:
        update_data["contact_id"] = PydanticObjectId(update_data["contact_id"]) if update_data["contact_id"] else None
    if "company_id" in update_data:
        update_data["company_id"] = PydanticObjectId(update_data["company_id"]) if update_data["company_id"] else None
        
    for k, v in update_data.items():
        setattr(invoice, k, v)
        
    if data.line_items is not None:
        invoice.line_items = [LineItem(**item.model_dump()) for item in data.line_items]
        
    invoice.calculate_totals()
        
    invoice.updated_by = current_user.id
    invoice.updated_at = utc_now()
    await invoice.save()
    await sync_invoice_to_sale(invoice)
    
    await log_action(str(org.id) if org else "super_admin", str(current_user.id), "update", "invoices", str(invoice.id))
    
    return SuccessResponse(message="Invoice updated successfully")


@router.put("/{invoice_id}/mark-paid", response_model=SuccessResponse)
async def mark_invoice_paid(
    invoice_id: str,
    data: MarkPaidRequest,
    current_user: User = Depends(require_module_write("invoices")),
    org: Optional[Organization] = Depends(get_current_org)
):
    invoice = await Invoice.find_one(org_filter(org, {"_id": PydanticObjectId(invoice_id)}))
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
        
    invoice.status = "paid"
    invoice.payment_date = data.payment_date or utc_now()
    invoice.payment_method = data.payment_method
    
    invoice.updated_by = current_user.id
    invoice.updated_at = utc_now()
    await invoice.save()
    await sync_invoice_to_sale(invoice)
    
    await log_action(str(org.id) if org else "super_admin", str(current_user.id), "update", "invoices", str(invoice.id), changes={"status": "paid"})
    
    # Notify creator and admins
    if org:
        try:
            notify_user_ids = {invoice.created_by} if invoice.created_by else set()
            admins = await User.find(User.org_id == org.id, User.role.in_(["admin", "super_admin"])).to_list()
            for admin in admins:
                notify_user_ids.add(admin.id)
                
            for uid in notify_user_ids:
                notif = Notification(
                    org_id=org.id,
                    user_id=uid,
                    created_by=current_user.id,
                    type="payment_received",
                    title=f"Payment received • ₹{invoice.total:,.2f}",
                    message=f"Invoice #{invoice.invoice_number} paid by client via {invoice.payment_method or 'Razorpay'}.",
                    entity_type="invoice",
                    entity_id=invoice.id,
                )
                await notif.insert()
        except Exception:
            pass

    return SuccessResponse(message="Invoice marked as paid")



@router.delete("/{invoice_id}", response_model=SuccessResponse)
async def delete_invoice(
    invoice_id: str,
    current_user: User = Depends(require_module_write("invoices")),
    org: Optional[Organization] = Depends(get_current_org)
):
    invoice = await Invoice.find_one(org_filter(org, {"_id": PydanticObjectId(invoice_id)}))
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
        
    invoice.is_deleted = True
    invoice.deleted_at = utc_now()
    invoice.deleted_by = current_user.id
    await invoice.save()
    await sync_invoice_to_sale(invoice)
    
    await log_action(str(org.id) if org else "super_admin", str(current_user.id), "delete", "invoices", str(invoice.id))
    
    return SuccessResponse(message="Invoice deleted successfully")


async def sync_invoice_to_sale(invoice: Invoice) -> None:
    """Helper to sync invoices to the sales collection with their respective status."""
    from models.sale import Sale, SaleItem

    existing_sale = await Sale.find_one(Sale.linked_invoice_id == str(invoice.id))

    if invoice.is_deleted:
        if existing_sale:
            await existing_sale.delete()
        return

    # Map invoice status to sale status
    if invoice.status == "paid":
        sale_status = "Completed"
    elif invoice.status == "cancelled":
        sale_status = "Cancelled"
    else:
        # draft, sent, overdue are mapped to Pending
        sale_status = "Pending"

    # Map LineItem to SaleItem
    sale_items = []
    for line in invoice.line_items:
        sale_items.append(
            SaleItem(
                product_id="invoice_item",
                product_name=line.description,
                quantity=int(line.quantity),
                unit_price=line.unit_price,
                total=line.amount
            )
        )

    if existing_sale:
        existing_sale.customer_name = invoice.customer_name or "—"
        existing_sale.items = sale_items
        existing_sale.subtotal = invoice.subtotal
        existing_sale.discount = invoice.discount
        existing_sale.tax = invoice.tax_amount
        existing_sale.total_amount = invoice.total
        existing_sale.sale_date = invoice.payment_date or invoice.created_at
        existing_sale.status = sale_status
        existing_sale.updated_at = utc_now()
        await existing_sale.save()
    else:
        new_sale = Sale(
            org_id=str(invoice.org_id),
            reference_number=invoice.invoice_number,
            sale_date=invoice.payment_date or invoice.created_at,
            customer_name=invoice.customer_name or "—",
            items=sale_items,
            subtotal=invoice.subtotal,
            discount=invoice.discount,
            tax=invoice.tax_amount,
            total_amount=invoice.total,
            status=sale_status,
            linked_invoice_id=str(invoice.id),
            created_by=str(invoice.created_by)
        )
        await new_sale.insert()
