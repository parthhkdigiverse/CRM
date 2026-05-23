from fastapi import APIRouter, Depends, HTTPException, Query

from models.user import User
from models.inventory import InventoryProduct
from schemas.inventory import InventoryProductCreate, InventoryProductUpdate, InventoryProductResponse
from schemas.common import SuccessResponse
from middleware.rbac import require_module_read, require_module_write
from utils.helpers import parse_object_id, paginate_params, build_paginated_response

router = APIRouter(prefix="/api/v1/inventory", tags=["Inventory"])

@router.post("/", response_model=SuccessResponse)
async def create_product(
    data: InventoryProductCreate,
    current_user: User = Depends(require_module_write("inventory"))
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
async def list_products(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_module_read("inventory"))
):
    if not current_user.org_id:
        return SuccessResponse(data=[])
        
    skip, limit = paginate_params(page, per_page)
    products = await InventoryProduct.find(
        InventoryProduct.org_id == str(current_user.org_id)
    ).sort("-created_at").skip(skip).limit(limit).to_list()
    total = await InventoryProduct.find(InventoryProduct.org_id == str(current_user.org_id)).count()
    
    data = []
    for p in products:
        p_dict = p.model_dump()
        p_dict["id"] = str(p.id)
        data.append(InventoryProductResponse(**p_dict).model_dump())
        
    return SuccessResponse(data=build_paginated_response(data, total, page, per_page))

@router.delete("/{product_id}", response_model=SuccessResponse)
async def delete_product(
    product_id: str,
    current_user: User = Depends(require_module_write("inventory"))
):
    product = await InventoryProduct.get(parse_object_id(product_id, "product_id"))
    if not product or product.org_id != str(current_user.org_id):
        raise HTTPException(status_code=404, detail="Product not found")
        
    await product.delete()
    return SuccessResponse(message="Product deleted successfully")
