from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from beanie import PydanticObjectId

from models.user import User
from models.inventory import InventoryProduct
from schemas.inventory import InventoryProductCreate, InventoryProductUpdate, InventoryProductResponse
from schemas.common import SuccessResponse
from middleware.auth_middleware import get_current_user
from utils.helpers import utc_now

router = APIRouter(prefix="/api/v1/inventory", tags=["Inventory"])

@router.post("/", response_model=SuccessResponse)
async def create_product(
    data: InventoryProductCreate,
    current_user: User = Depends(get_current_user)
):
    if not current_user.org_id:
        raise HTTPException(status_code=400, detail="User does not belong to an organization")
    
    # Check if SKU already exists in this org
    existing = await InventoryProduct.find_one(
        InventoryProduct.org_id == str(current_user.org_id),
        InventoryProduct.sku == data.sku
    )
    if existing:
        raise HTTPException(status_code=400, detail="Product with this SKU already exists")

    product = InventoryProduct(
        org_id=str(current_user.org_id),
        **data.model_dump()
    )
    await product.insert()
    
    return SuccessResponse(
        data={"id": str(product.id)},
        message="Product created successfully"
    )

@router.get("/", response_model=SuccessResponse)
async def list_products(current_user: User = Depends(get_current_user)):
    if not current_user.org_id:
        return SuccessResponse(data=[])
        
    products = await InventoryProduct.find(
        InventoryProduct.org_id == str(current_user.org_id)
    ).sort("-created_at").to_list()
    
    data = []
    for p in products:
        p_dict = p.model_dump()
        p_dict["id"] = str(p.id)
        data.append(InventoryProductResponse(**p_dict).model_dump())
        
    return SuccessResponse(data=data)

@router.delete("/{product_id}", response_model=SuccessResponse)
async def delete_product(
    product_id: str,
    current_user: User = Depends(get_current_user)
):
    product = await InventoryProduct.get(PydanticObjectId(product_id))
    if not product or product.org_id != str(current_user.org_id):
        raise HTTPException(status_code=404, detail="Product not found")
        
    await product.delete()
    return SuccessResponse(message="Product deleted successfully")
