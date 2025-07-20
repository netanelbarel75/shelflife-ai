from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from typing import Optional, List
from datetime import datetime
import uuid
import math

from app.models import MarketplaceListing, ListingStatus, User
from app.schemas import (
    MarketplaceListingCreate, MarketplaceListingUpdate, MarketplaceFilter,
    MarketplaceListing as MarketplaceListingSchema, SellerInfo
)

class MarketplaceService:
    def __init__(self, db: Session):
        self.db = db

    def get_nearby_listings(
        self,
        user_lat: float,
        user_lng: float,
        skip: int = 0,
        limit: int = 20,
        filters: Optional[MarketplaceFilter] = None
    ) -> List[MarketplaceListingSchema]:
        """Get marketplace listings near user location."""
        query = self.db.query(MarketplaceListing, User).join(
            User, MarketplaceListing.seller_id == User.id
        ).filter(
            MarketplaceListing.status == ListingStatus.ACTIVE
        )

        if filters:
            if filters.category:
                query = query.filter(MarketplaceListing.category == filters.category)
            if filters.max_price:
                query = query.filter(MarketplaceListing.price <= filters.max_price)
            if filters.search_query:
                search = f"%{filters.search_query}%"
                query = query.filter(
                    or_(
                        MarketplaceListing.title.ilike(search),
                        MarketplaceListing.description.ilike(search)
                    )
                )

        listings_data = query.offset(skip).limit(limit).all()

        # Calculate distances and convert to schema
        result = []
        for listing, seller in listings_data:
            distance = self._calculate_distance(
                user_lat, user_lng, listing.latitude, listing.longitude
            )
            
            # Skip if too far and max_distance is set
            if filters and filters.max_distance_miles and distance > filters.max_distance_miles:
                continue

            # Calculate days until expiry
            days_until_expiry = None
            if listing.expiry_date:
                days_left = (listing.expiry_date - datetime.utcnow()).days
                days_until_expiry = max(0, days_left)

            listing_dict = listing.__dict__.copy()
            listing_dict['seller'] = SellerInfo(
                id=seller.id,
                username=seller.username,
                rating=4.5,  # Mock rating
                distance_miles=round(distance, 2)
            )
            listing_dict['days_until_expiry'] = days_until_expiry
            
            result.append(MarketplaceListingSchema(**listing_dict))

        # Sort by distance
        result.sort(key=lambda x: x.seller.distance_miles)
        
        return result

    def create_listing(self, user_id: str, listing_data: MarketplaceListingCreate) -> MarketplaceListing:
        """Create a new marketplace listing."""
        listing = MarketplaceListing(
            id=uuid.uuid4(),
            seller_id=user_id,
            inventory_item_id=listing_data.inventory_item_id,
            title=listing_data.title,
            description=listing_data.description,
            category=listing_data.category,
            quantity=listing_data.quantity,
            unit=listing_data.unit,
            price=listing_data.price,
            currency=listing_data.currency,
            is_negotiable=listing_data.is_negotiable,
            latitude=listing_data.latitude,
            longitude=listing_data.longitude,
            pickup_address=listing_data.pickup_address,
            delivery_available=listing_data.delivery_available,
            delivery_radius_miles=listing_data.delivery_radius_miles,
            expiry_date=listing_data.expiry_date,
            available_until=listing_data.available_until,
            status=ListingStatus.ACTIVE,
            views_count=0,
            created_at=datetime.utcnow()
        )

        self.db.add(listing)
        self.db.commit()
        self.db.refresh(listing)
        return listing

    def get_listing(self, listing_id: str) -> Optional[MarketplaceListing]:
        """Get a specific listing."""
        return self.db.query(MarketplaceListing).filter(
            MarketplaceListing.id == listing_id
        ).first()

    def update_listing(
        self, 
        listing_id: str, 
        user_id: str, 
        update_data: MarketplaceListingUpdate
    ) -> Optional[MarketplaceListing]:
        """Update a marketplace listing."""
        listing = self.db.query(MarketplaceListing).filter(
            and_(
                MarketplaceListing.id == listing_id,
                MarketplaceListing.seller_id == user_id
            )
        ).first()

        if not listing:
            return None

        update_dict = update_data.dict(exclude_unset=True)
        for field, value in update_dict.items():
            setattr(listing, field, value)

        listing.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(listing)
        return listing

    def delete_listing(self, listing_id: str, user_id: str) -> bool:
        """Delete a marketplace listing."""
        listing = self.db.query(MarketplaceListing).filter(
            and_(
                MarketplaceListing.id == listing_id,
                MarketplaceListing.seller_id == user_id
            )
        ).first()

        if not listing:
            return False

        self.db.delete(listing)
        self.db.commit()
        return True

    def get_user_listings(
        self, 
        user_id: str, 
        skip: int = 0, 
        limit: int = 20,
        status_filter: Optional[ListingStatus] = None
    ) -> List[MarketplaceListing]:
        """Get user's marketplace listings."""
        query = self.db.query(MarketplaceListing).filter(
            MarketplaceListing.seller_id == user_id
        )

        if status_filter:
            query = query.filter(MarketplaceListing.status == status_filter)

        return query.order_by(
            MarketplaceListing.created_at.desc()
        ).offset(skip).limit(limit).all()

    def increment_views(self, listing_id: str):
        """Increment view count for a listing."""
        listing = self.get_listing(listing_id)
        if listing:
            listing.views_count += 1
            self.db.commit()

    def mark_as_sold(self, listing_id: str, user_id: str) -> Optional[MarketplaceListing]:
        """Mark a listing as sold."""
        return self.update_listing(
            listing_id,
            user_id,
            MarketplaceListingUpdate(status=ListingStatus.SOLD)
        )

    def expire_listing(self, listing_id: str, user_id: str) -> bool:
        """Expire a listing."""
        result = self.update_listing(
            listing_id,
            user_id,
            MarketplaceListingUpdate(status=ListingStatus.EXPIRED)
        )
        return result is not None

    def get_available_categories(self) -> List[str]:
        """Get available categories in marketplace."""
        categories = self.db.query(MarketplaceListing.category).filter(
            and_(
                MarketplaceListing.status == ListingStatus.ACTIVE,
                MarketplaceListing.category.isnot(None)
            )
        ).distinct().all()

        return [cat.category for cat in categories if cat.category]

    def get_search_suggestions(self, query: str) -> List[str]:
        """Get search suggestions for marketplace."""
        search = f"%{query}%"
        
        suggestions = self.db.query(MarketplaceListing.title).filter(
            and_(
                MarketplaceListing.status == ListingStatus.ACTIVE,
                MarketplaceListing.title.ilike(search)
            )
        ).distinct().limit(10).all()

        return [s.title for s in suggestions]

    def get_user_stats(self, user_id: str) -> dict:
        """Get user's marketplace statistics."""
        total_listings = self.db.query(MarketplaceListing).filter(
            MarketplaceListing.seller_id == user_id
        ).count()

        active_listings = self.db.query(MarketplaceListing).filter(
            and_(
                MarketplaceListing.seller_id == user_id,
                MarketplaceListing.status == ListingStatus.ACTIVE
            )
        ).count()

        sold_listings = self.db.query(MarketplaceListing).filter(
            and_(
                MarketplaceListing.seller_id == user_id,
                MarketplaceListing.status == ListingStatus.SOLD
            )
        ).count()

        total_views = self.db.query(
            func.sum(MarketplaceListing.views_count)
        ).filter(
            MarketplaceListing.seller_id == user_id
        ).scalar() or 0

        total_revenue = self.db.query(
            func.sum(MarketplaceListing.price)
        ).filter(
            and_(
                MarketplaceListing.seller_id == user_id,
                MarketplaceListing.status == ListingStatus.SOLD
            )
        ).scalar() or 0

        return {
            'total_listings': total_listings,
            'active_listings': active_listings,
            'sold_listings': sold_listings,
            'total_views': total_views,
            'total_revenue': round(total_revenue, 2)
        }

    def _calculate_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculate distance between two points using Haversine formula."""
        # Convert latitude and longitude from degrees to radians
        lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
        
        # Haversine formula
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
        c = 2 * math.asin(math.sqrt(a))
        
        # Radius of earth in miles
        r = 3956
        
        return c * r
