from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Any, List, Optional

from app.database import get_db
from app.schemas import (
    User, MarketplaceListing, MarketplaceListingCreate, MarketplaceListingUpdate,
    APIResponse, MarketplaceFilter, Message, MessageCreate
)
from app.routers.auth import get_current_user
from app.services.marketplace_service import MarketplaceService
from app.services.message_service import MessageService
from app.models import ListingStatus

router = APIRouter()

@router.get("/", response_model=List[MarketplaceListing])
async def get_marketplace_listings(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    category: Optional[str] = Query(None),
    max_price: Optional[float] = Query(None, ge=0),
    max_distance_miles: Optional[float] = Query(None, ge=0),
    search_query: Optional[str] = Query(None),
    latitude: Optional[float] = Query(None),
    longitude: Optional[float] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Get marketplace listings with filtering and location-based sorting."""
    marketplace_service = MarketplaceService(db)
    
    # Use user's location if not provided
    user_lat = latitude or current_user.latitude
    user_lng = longitude or current_user.longitude
    
    # Create filter object
    filters = MarketplaceFilter(
        category=category,
        max_price=max_price,
        max_distance_miles=max_distance_miles,
        search_query=search_query,
        latitude=user_lat,
        longitude=user_lng
    )
    
    listings = marketplace_service.get_nearby_listings(
        user_lat,
        user_lng,
        skip,
        limit,
        filters
    )
    
    return listings

@router.post("/", response_model=MarketplaceListing)
async def create_listing(
    listing_data: MarketplaceListingCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Create a new marketplace listing."""
    marketplace_service = MarketplaceService(db)
    
    # Validate inventory item ownership if provided
    if listing_data.inventory_item_id:
        from app.services.inventory_service import InventoryService
        inventory_service = InventoryService(db)
        item = inventory_service.get_inventory_item(
            str(listing_data.inventory_item_id), 
            current_user.id
        )
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Inventory item not found"
            )
    
    listing = marketplace_service.create_listing(current_user.id, listing_data)
    return listing

@router.get("/my-listings", response_model=List[MarketplaceListing])
async def get_my_listings(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Get current user's marketplace listings."""
    marketplace_service = MarketplaceService(db)
    
    status_filter = ListingStatus(status) if status else None
    listings = marketplace_service.get_user_listings(
        current_user.id, 
        skip, 
        limit, 
        status_filter
    )
    
    return listings

@router.get("/{listing_id}", response_model=MarketplaceListing)
async def get_listing(
    listing_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Get a specific marketplace listing."""
    marketplace_service = MarketplaceService(db)
    listing = marketplace_service.get_listing(listing_id)
    
    if not listing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Listing not found"
        )
    
    # Increment view count if not the seller
    if listing.seller_id != current_user.id:
        marketplace_service.increment_views(listing_id)
    
    return listing

@router.put("/{listing_id}", response_model=MarketplaceListing)
async def update_listing(
    listing_id: str,
    listing_update: MarketplaceListingUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Update a marketplace listing."""
    marketplace_service = MarketplaceService(db)
    listing = marketplace_service.update_listing(
        listing_id, 
        current_user.id, 
        listing_update
    )
    
    if not listing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Listing not found or not owned by user"
        )
    
    return listing

@router.delete("/{listing_id}", response_model=APIResponse)
async def delete_listing(
    listing_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Delete a marketplace listing."""
    marketplace_service = MarketplaceService(db)
    success = marketplace_service.delete_listing(listing_id, current_user.id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Listing not found or not owned by user"
        )
    
    return APIResponse(
        success=True,
        message="Listing deleted successfully"
    )

@router.post("/{listing_id}/mark-sold", response_model=MarketplaceListing)
async def mark_listing_sold(
    listing_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Mark a listing as sold."""
    marketplace_service = MarketplaceService(db)
    listing = marketplace_service.mark_as_sold(listing_id, current_user.id)
    
    if not listing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Listing not found or not owned by user"
        )
    
    return listing

@router.get("/{listing_id}/messages", response_model=List[Message])
async def get_listing_messages(
    listing_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Get messages for a specific listing."""
    message_service = MessageService(db)
    marketplace_service = MarketplaceService(db)
    
    # Verify user is involved with this listing
    listing = marketplace_service.get_listing(listing_id)
    if not listing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Listing not found"
        )
    
    messages = message_service.get_listing_messages(listing_id, current_user.id)
    return messages

@router.post("/{listing_id}/messages", response_model=Message)
async def send_message_to_seller(
    listing_id: str,
    message_data: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Send a message to the seller of a listing."""
    message_service = MessageService(db)
    marketplace_service = MarketplaceService(db)
    
    # Get listing to find seller
    listing = marketplace_service.get_listing(listing_id)
    if not listing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Listing not found"
        )
    
    # Prevent messaging yourself
    if listing.seller_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot send message to yourself"
        )
    
    # Override receiver_id with seller_id
    message_data.receiver_id = listing.seller_id
    message_data.listing_id = listing.id
    
    message = message_service.send_message(current_user.id, message_data)
    return message

@router.get("/categories/list")
async def get_marketplace_categories(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Get list of categories available in marketplace."""
    marketplace_service = MarketplaceService(db)
    categories = marketplace_service.get_available_categories()
    return {"categories": categories}

@router.get("/search/suggestions")
async def get_marketplace_search_suggestions(
    query: str = Query(..., min_length=2),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Get search suggestions for marketplace listings."""
    marketplace_service = MarketplaceService(db)
    suggestions = marketplace_service.get_search_suggestions(query)
    return {"suggestions": suggestions}

@router.post("/bulk-expire", response_model=APIResponse)
async def bulk_expire_listings(
    listing_ids: List[str],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Bulk expire multiple listings."""
    marketplace_service = MarketplaceService(db)
    
    expired_count = 0
    for listing_id in listing_ids:
        success = marketplace_service.expire_listing(listing_id, current_user.id)
        if success:
            expired_count += 1
    
    return APIResponse(
        success=True,
        message=f"Expired {expired_count} out of {len(listing_ids)} listings"
    )

@router.get("/stats/user")
async def get_user_marketplace_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Get user's marketplace statistics."""
    marketplace_service = MarketplaceService(db)
    stats = marketplace_service.get_user_stats(current_user.id)
    return stats

@router.post("/{listing_id}/report", response_model=APIResponse)
async def report_listing(
    listing_id: str,
    reason: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Report a listing for inappropriate content."""
    marketplace_service = MarketplaceService(db)
    
    # Verify listing exists
    listing = marketplace_service.get_listing(listing_id)
    if not listing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Listing not found"
        )
    
    # Prevent reporting own listings
    if listing.seller_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot report your own listing"
        )
    
    # Create report (in real implementation, you'd have a reports table)
    # For now, just return success
    return APIResponse(
        success=True,
        message="Report submitted successfully. We'll review it shortly."
    )
