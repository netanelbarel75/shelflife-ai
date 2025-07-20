from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from typing import Optional, List
from datetime import datetime
import uuid
from passlib.context import CryptContext

from app.models import User, InventoryItem, MarketplaceListing
from app.schemas import UserCreate, UserUpdate

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class UserService:
    def __init__(self, db: Session):
        self.db = db
    
    def get_password_hash(self, password: str) -> str:
        """Hash a password."""
        return pwd_context.hash(password)
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash."""
        return pwd_context.verify(plain_password, hashed_password)

    def get_user_by_email(self, email: str) -> Optional[User]:
        """Get user by email."""
        return self.db.query(User).filter(User.email == email).first()

    def get_user_by_username(self, username: str) -> Optional[User]:
        """Get user by username."""
        return self.db.query(User).filter(User.username == username).first()

    def get_user_by_id(self, user_id: str) -> Optional[User]:
        """Get user by ID."""
        return self.db.query(User).filter(User.id == user_id).first()

    def create_user(self, user_data: UserCreate) -> User:
        """Create a new user."""
        hashed_password = self.get_password_hash(user_data.password)
        
        db_user = User(
            id=uuid.uuid4(),
            email=user_data.email,
            username=user_data.username,
            hashed_password=hashed_password,
            first_name=user_data.first_name,
            last_name=user_data.last_name,
            phone=user_data.phone,
            created_at=datetime.utcnow()
        )
        
        self.db.add(db_user)
        self.db.commit()
        self.db.refresh(db_user)
        return db_user

    def update_user(self, user_id: str, user_update: UserUpdate) -> Optional[User]:
        """Update user information."""
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            return None

        update_data = user_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(user, field, value)

        user.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(user)
        return user

    def delete_user(self, user_id: str) -> bool:
        """Delete a user (hard delete)."""
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            return False

        self.db.delete(user)
        self.db.commit()
        return True

    def deactivate_user(self, user_id: str) -> bool:
        """Deactivate a user (soft delete)."""
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            return False

        user.is_active = False
        user.updated_at = datetime.utcnow()
        self.db.commit()
        return True

    def update_location(self, user_id: str, latitude: float, longitude: float) -> bool:
        """Update user's location."""
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            return False

        user.latitude = latitude
        user.longitude = longitude
        user.updated_at = datetime.utcnow()
        self.db.commit()
        return True

    def get_nearby_users(
        self, 
        user_id: str, 
        latitude: float, 
        longitude: float, 
        radius_miles: float
    ) -> List[dict]:
        """Get nearby users within specified radius."""
        # Haversine formula for distance calculation
        # Note: This is a simplified version, in production use PostGIS
        users = self.db.query(User).filter(
            and_(
                User.id != user_id,
                User.is_active == True,
                User.latitude.isnot(None),
                User.longitude.isnot(None)
            )
        ).all()

        nearby_users = []
        for user in users:
            distance = self._calculate_distance(
                latitude, longitude, user.latitude, user.longitude
            )
            
            if distance <= radius_miles:
                nearby_users.append({
                    "id": user.id,
                    "username": user.username,
                    "first_name": user.first_name,
                    "distance_miles": round(distance, 2),
                    "city": user.city,
                    "state": user.state
                })

        # Sort by distance
        nearby_users.sort(key=lambda x: x["distance_miles"])
        return nearby_users

    def get_public_profile(self, user_id: str) -> Optional[dict]:
        """Get public profile information."""
        user = self.db.query(User).filter(
            and_(User.id == user_id, User.is_active == True)
        ).first()
        
        if not user:
            return None

        # Count user's stats
        total_listings = self.db.query(MarketplaceListing).filter(
            MarketplaceListing.seller_id == user_id
        ).count()

        return {
            "id": user.id,
            "username": user.username,
            "first_name": user.first_name,
            "city": user.city,
            "state": user.state,
            "joined_date": user.created_at,
            "total_listings": total_listings,
            "rating": 4.8  # Mock rating, implement proper rating system
        }

    def get_dashboard_stats(self, user_id: str) -> dict:
        """Get dashboard statistics for user."""
        # Count inventory items by status
        inventory_stats = self.db.query(
            InventoryItem.status,
            func.count(InventoryItem.id).label('count')
        ).filter(
            InventoryItem.user_id == user_id
        ).group_by(InventoryItem.status).all()

        # Count marketplace listings
        listings_count = self.db.query(MarketplaceListing).filter(
            MarketplaceListing.seller_id == user_id
        ).count()

        # Calculate estimated waste reduction (mock calculation)
        total_items = sum([stat.count for stat in inventory_stats])
        waste_reduced_kg = total_items * 0.3  # Average 300g per item

        return {
            "total_items": total_items,
            "inventory_by_status": {
                stat.status: stat.count for stat in inventory_stats
            },
            "active_listings": listings_count,
            "waste_reduced_kg": round(waste_reduced_kg, 1),
            "money_saved": round(total_items * 2.5, 2),  # Mock calculation
            "carbon_offset_lbs": round(waste_reduced_kg * 2.2, 1)  # kg to lbs
        }

    def submit_feedback(
        self, 
        user_id: str, 
        feedback_type: str, 
        content: str, 
        rating: Optional[int] = None
    ) -> bool:
        """Submit user feedback."""
        # In a real implementation, save to a feedback table
        # For now, just return success
        print(f"Feedback from {user_id}: {feedback_type} - {content} (Rating: {rating})")
        return True

    def export_user_data(self, user_id: str) -> dict:
        """Export all user data for GDPR compliance."""
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            return {}

        # Get related data
        inventory_items = self.db.query(InventoryItem).filter(
            InventoryItem.user_id == user_id
        ).all()

        listings = self.db.query(MarketplaceListing).filter(
            MarketplaceListing.seller_id == user_id
        ).all()

        return {
            "user_profile": {
                "id": str(user.id),
                "email": user.email,
                "username": user.username,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "phone": user.phone,
                "created_at": user.created_at.isoformat() if user.created_at else None,
                "city": user.city,
                "state": user.state,
                "country": user.country
            },
            "inventory_items": [
                {
                    "id": str(item.id),
                    "name": item.name,
                    "category": item.category,
                    "quantity": item.quantity,
                    "unit": item.unit,
                    "created_at": item.created_at.isoformat() if item.created_at else None
                } for item in inventory_items
            ],
            "marketplace_listings": [
                {
                    "id": str(listing.id),
                    "title": listing.title,
                    "price": listing.price,
                    "created_at": listing.created_at.isoformat() if listing.created_at else None
                } for listing in listings
            ]
        }

    def block_user(self, blocker_id: str, blocked_id: str) -> bool:
        """Block a user."""
        # In a real implementation, create a UserBlock table
        # For now, just return success
        return True

    def unblock_user(self, blocker_id: str, blocked_id: str) -> bool:
        """Unblock a user."""
        # In a real implementation, remove from UserBlock table
        # For now, just return success
        return True

    def _calculate_distance(
        self, 
        lat1: float, 
        lon1: float, 
        lat2: float, 
        lon2: float
    ) -> float:
        """Calculate distance between two points using Haversine formula."""
        import math
        
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
