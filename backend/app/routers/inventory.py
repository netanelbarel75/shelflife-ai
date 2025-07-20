from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Any, List, Optional

from app.database import get_db
from app.schemas import (
    User, InventoryItem, InventoryItemCreate, InventoryItemUpdate,
    InventoryStats, APIResponse, InventoryFilter, ExpiryPredictionRequest,
    ExpiryPredictionResponse
)
from app.routers.auth import get_current_user
from app.services.inventory_service import InventoryService
from app.services.ml_service import MLService
from app.models import ItemStatus

router = APIRouter()

@router.get("/", response_model=List[InventoryItem])
async def get_inventory(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    status: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    search_query: Optional[str] = Query(None),
    days_until_expiry_max: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Get user's inventory items with filtering."""
    inventory_service = InventoryService(db)
    
    # Create filter object
    filters = InventoryFilter(
        status=ItemStatus(status) if status else None,
        category=category,
        search_query=search_query,
        days_until_expiry_max=days_until_expiry_max
    )
    
    items = inventory_service.get_user_inventory(
        current_user.id, 
        skip, 
        limit, 
        filters
    )
    
    return items

@router.post("/", response_model=InventoryItem)
async def add_inventory_item(
    item_data: InventoryItemCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Add a new item to inventory."""
    inventory_service = InventoryService(db)
    
    # If no expiry prediction provided, predict it
    if not item_data.predicted_expiry_date:
        ml_service = MLService()
        prediction = ml_service.predict_expiry(
            product_name=item_data.name,
            category=item_data.category,
            purchase_date=item_data.purchase_date
        )
        item_data.predicted_expiry_date = prediction.predicted_expiry_date
    
    item = inventory_service.create_inventory_item(current_user.id, item_data)
    return item

@router.get("/stats", response_model=InventoryStats)
async def get_inventory_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Get inventory statistics."""
    inventory_service = InventoryService(db)
    stats = inventory_service.get_inventory_stats(current_user.id)
    return stats

@router.get("/expiring", response_model=List[InventoryItem])
async def get_expiring_items(
    days: int = Query(3, ge=0, le=30),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Get items expiring within specified days."""
    inventory_service = InventoryService(db)
    items = inventory_service.get_expiring_items(current_user.id, days)
    return items

@router.get("/{item_id}", response_model=InventoryItem)
async def get_inventory_item(
    item_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Get a specific inventory item."""
    inventory_service = InventoryService(db)
    item = inventory_service.get_inventory_item(item_id, current_user.id)
    
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory item not found"
        )
    
    return item

@router.put("/{item_id}", response_model=InventoryItem)
async def update_inventory_item(
    item_id: str,
    item_update: InventoryItemUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Update an inventory item."""
    inventory_service = InventoryService(db)
    item = inventory_service.update_inventory_item(
        item_id, 
        current_user.id, 
        item_update
    )
    
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory item not found"
        )
    
    return item

@router.delete("/{item_id}", response_model=APIResponse)
async def delete_inventory_item(
    item_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Delete an inventory item."""
    inventory_service = InventoryService(db)
    success = inventory_service.delete_inventory_item(item_id, current_user.id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory item not found"
        )
    
    return APIResponse(
        success=True,
        message="Inventory item deleted successfully"
    )

@router.post("/{item_id}/mark-used", response_model=InventoryItem)
async def mark_item_used(
    item_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Mark an item as used."""
    inventory_service = InventoryService(db)
    item = inventory_service.mark_item_as_used(item_id, current_user.id)
    
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory item not found"
        )
    
    return item

@router.post("/predict-expiry", response_model=ExpiryPredictionResponse)
async def predict_item_expiry(
    prediction_request: ExpiryPredictionRequest,
    current_user: User = Depends(get_current_user)
) -> Any:
    """Predict expiry date for a food item."""
    ml_service = MLService()
    
    prediction = ml_service.predict_expiry(
        product_name=prediction_request.product_name,
        category=prediction_request.category,
        brand=prediction_request.brand,
        purchase_date=prediction_request.purchase_date,
        storage_location=prediction_request.storage_location
    )
    
    return prediction

@router.get("/categories/list")
async def get_categories(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Get list of categories used in user's inventory."""
    inventory_service = InventoryService(db)
    categories = inventory_service.get_user_categories(current_user.id)
    return {"categories": categories}

@router.post("/bulk-update", response_model=APIResponse)
async def bulk_update_items(
    item_ids: List[str],
    update_data: InventoryItemUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Bulk update multiple inventory items."""
    inventory_service = InventoryService(db)
    
    updated_count = 0
    for item_id in item_ids:
        item = inventory_service.update_inventory_item(
            item_id, 
            current_user.id, 
            update_data
        )
        if item:
            updated_count += 1
    
    return APIResponse(
        success=True,
        message=f"Updated {updated_count} out of {len(item_ids)} items"
    )

@router.get("/search/suggestions")
async def get_search_suggestions(
    query: str = Query(..., min_length=2),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Get search suggestions for inventory items."""
    inventory_service = InventoryService(db)
    suggestions = inventory_service.get_search_suggestions(current_user.id, query)
    return {"suggestions": suggestions}

@router.post("/from-receipt/{receipt_id}", response_model=List[InventoryItem])
async def create_items_from_receipt(
    receipt_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Create inventory items from a processed receipt."""
    inventory_service = InventoryService(db)
    items = inventory_service.create_items_from_receipt(
        receipt_id, 
        current_user.id
    )
    
    if not items:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Receipt not found or not processed yet"
        )
    
    return items
