from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from beanie import PydanticObjectId

from models.user import User
from models.sale import Sale
from models.inventory import InventoryProduct
from schemas.sale import SaleCreate, SaleResponse
from schemas.common import SuccessResponse
from middleware.auth_middleware import get_current_user
from utils.helpers import utc_now

router = APIRouter(prefix="/api/v1/sales", tags=["Sales"])

@router.post("/", response_model=SuccessResponse)
async def log_sale(
    data: SaleCreate,
    current_user: User = Depends(get_current_user)
):
    if not current_user.org_id:
        raise HTTPException(status_code=400, detail="User does not belong to an organization")
        
    # Optional: Deduct inventory quantities
    for item in data.items:
        product = await InventoryProduct.get(PydanticObjectId(item.product_id))
        if product and product.org_id == str(current_user.org_id):
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
async def list_sales(current_user: User = Depends(get_current_user)):
    if not current_user.org_id:
        return SuccessResponse(data=[])
        
    sales = await Sale.find(
        Sale.org_id == str(current_user.org_id)
    ).sort("-sale_date").to_list()
    
    data = []
    for s in sales:
        s_dict = s.model_dump()
        s_dict["id"] = str(s.id)
        data.append(SaleResponse(**s_dict).model_dump())
        
    return SuccessResponse(data=data)

@router.delete("/{sale_id}", response_model=SuccessResponse)
async def delete_sale(
    sale_id: str,
    current_user: User = Depends(get_current_user)
):
    sale = await Sale.get(PydanticObjectId(sale_id))
    if not sale or sale.org_id != str(current_user.org_id):
        raise HTTPException(status_code=404, detail="Sale not found")
        
    await sale.delete()
    return SuccessResponse(message="Sale deleted successfully")
