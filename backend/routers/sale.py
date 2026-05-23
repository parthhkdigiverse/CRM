from fastapi import APIRouter, Depends, HTTPException, Query

from models.user import User
from models.sale import Sale
from models.inventory import InventoryProduct
from schemas.sale import SaleCreate, SaleResponse
from schemas.common import SuccessResponse
from middleware.rbac import require_module_read, require_module_write
from utils.helpers import utc_now, parse_object_id, paginate_params, build_paginated_response

router = APIRouter(prefix="/api/v1/sales", tags=["Sales"])

@router.post("/", response_model=SuccessResponse)
async def log_sale(
    data: SaleCreate,
    current_user: User = Depends(require_module_write("sales"))
):
    if not current_user.org_id:
        raise HTTPException(status_code=400, detail="User does not belong to an organization")
        
    # Optional: Deduct inventory quantities
    for item in data.items:
        product = await InventoryProduct.get(parse_object_id(item.product_id, "product_id"))
        if product and product.org_id == str(current_user.org_id):
            if product.stock_quantity < item.quantity:
                raise HTTPException(status_code=400, detail="Insufficient inventory for sale item")
            product.stock_quantity -= item.quantity
            await product.save()

    sale = Sale(
        org_id=str(current_user.org_id),
        created_by=str(current_user.id),
        **data.model_dump(exclude_unset=True)
    )
    if not sale.sale_date:
        sale.sale_date = utc_now()
        
    await sale.insert()
    
    return SuccessResponse(
        data={"id": str(sale.id)},
        message="Sale logged successfully"
    )

@router.get("/", response_model=SuccessResponse)
async def list_sales(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_module_read("sales"))
):
    if not current_user.org_id:
        return SuccessResponse(data=[])
        
    skip, limit = paginate_params(page, per_page)
    sales = await Sale.find(
        Sale.org_id == str(current_user.org_id)
    ).sort("-sale_date").skip(skip).limit(limit).to_list()
    total = await Sale.find(Sale.org_id == str(current_user.org_id)).count()
    
    data = []
    for s in sales:
        s_dict = s.model_dump()
        s_dict["id"] = str(s.id)
        data.append(SaleResponse(**s_dict).model_dump())
        
    return SuccessResponse(data=build_paginated_response(data, total, page, per_page))

@router.delete("/{sale_id}", response_model=SuccessResponse)
async def delete_sale(
    sale_id: str,
    current_user: User = Depends(require_module_write("sales"))
):
    sale = await Sale.get(parse_object_id(sale_id, "sale_id"))
    if not sale or sale.org_id != str(current_user.org_id):
        raise HTTPException(status_code=404, detail="Sale not found")
        
    await sale.delete()
    return SuccessResponse(message="Sale deleted successfully")
