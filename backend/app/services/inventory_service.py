from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from typing import Optional, List
from datetime import datetime, timedelta
import uuid

from app.models import InventoryItem, ItemStatus, ItemSource
from app.schemas import (
    InventoryItemCreate, InventoryItemUpdate, InventoryStats, 
    InventoryFilter, InventoryItem as InventoryItemSchema
)

class InventoryService:
    def __init__(self, db: Session):
        self.db = db

    def get_user_inventory(
        self, 
        user_id: str, 
        skip: int = 0, 
        limit: int = 50,
        filters: Optional[InventoryFilter] = None
    ) -> List[InventoryItemSchema]:
        """Get user's inventory with filtering."""
        query = self.db.query(InventoryItem).filter(
            InventoryItem.user_id == user_id
        )

        if filters:
            if filters.status:
                query = query.filter(InventoryItem.status == filters.status)
            if filters.category:
                query = query.filter(InventoryItem.category == filters.category)
            if filters.search_query:
                search = f"%{filters.search_query}%"
                query = query.filter(
                    or_(
                        InventoryItem.name.ilike(search),
                        InventoryItem.brand.ilike(search)
                    )
                )
            if filters.days_until_expiry_max is not None:
                cutoff_date = datetime.utcnow() + timedelta(days=filters.days_until_expiry_max)
                query = query.filter(
                    InventoryItem.predicted_expiry_date <= cutoff_date
                )

        items = query.order_by(
            InventoryItem.predicted_expiry_date.asc()
        ).offset(skip).limit(limit).all()

        # Convert to schema with calculated days_until_expiry
        result = []
        for item in items:
            item_dict = item.__dict__.copy()
            if item.predicted_expiry_date:
                days_left = (item.predicted_expiry_date - datetime.utcnow()).days
                item_dict['days_until_expiry'] = max(0, days_left)
            else:
                item_dict['days_until_expiry'] = None
            result.append(InventoryItemSchema(**item_dict))

        return result

    def create_inventory_item(self, user_id: str, item_data: InventoryItemCreate) -> InventoryItem:
        """Create a new inventory item."""
        item = InventoryItem(
            id=uuid.uuid4(),
            user_id=user_id,
            receipt_id=item_data.receipt_id,
            name=item_data.name,
            category=item_data.category,
            brand=item_data.brand,
            quantity=item_data.quantity or 1,
            unit=item_data.unit or 'item',
            purchase_price=item_data.purchase_price,
            purchase_date=item_data.purchase_date or datetime.utcnow(),
            store_name=item_data.store_name,
            predicted_expiry_date=item_data.predicted_expiry_date,
            source=item_data.source,
            status=ItemStatus.FRESH,
            notes=item_data.notes,
            created_at=datetime.utcnow()
        )

        self.db.add(item)
        self.db.commit()
        self.db.refresh(item)
        return item

    def get_inventory_item(self, item_id: str, user_id: str) -> Optional[InventoryItem]:
        """Get a specific inventory item."""
        return self.db.query(InventoryItem).filter(
            and_(
                InventoryItem.id == item_id,
                InventoryItem.user_id == user_id
            )
        ).first()

    def update_inventory_item(
        self, 
        item_id: str, 
        user_id: str, 
        update_data: InventoryItemUpdate
    ) -> Optional[InventoryItem]:
        """Update an inventory item."""
        item = self.get_inventory_item(item_id, user_id)
        if not item:
            return None

        update_dict = update_data.dict(exclude_unset=True)
        for field, value in update_dict.items():
            setattr(item, field, value)

        item.last_updated = datetime.utcnow()
        self.db.commit()
        self.db.refresh(item)
        return item

    def delete_inventory_item(self, item_id: str, user_id: str) -> bool:
        """Delete an inventory item."""
        item = self.get_inventory_item(item_id, user_id)
        if not item:
            return False

        self.db.delete(item)
        self.db.commit()
        return True

    def get_inventory_stats(self, user_id: str) -> InventoryStats:
        """Get inventory statistics."""
        stats_query = self.db.query(
            InventoryItem.status,
            func.count(InventoryItem.id).label('count')
        ).filter(
            InventoryItem.user_id == user_id
        ).group_by(InventoryItem.status).all()

        stats = {status: 0 for status in ItemStatus}
        for stat in stats_query:
            stats[stat.status] = stat.count

        total_items = sum(stats.values())
        
        # Calculate estimated value
        estimated_value = self.db.query(
            func.sum(InventoryItem.purchase_price)
        ).filter(
            and_(
                InventoryItem.user_id == user_id,
                InventoryItem.status != ItemStatus.USED,
                InventoryItem.purchase_price.isnot(None)
            )
        ).scalar() or 0

        # Mock waste prevented calculation
        waste_prevented_kg = stats.get(ItemStatus.USED, 0) * 0.3

        return InventoryStats(
            total_items=total_items,
            fresh_items=stats.get(ItemStatus.FRESH, 0),
            nearing_expiry=stats.get(ItemStatus.NEARING, 0),
            expired_items=stats.get(ItemStatus.EXPIRED, 0),
            used_items=stats.get(ItemStatus.USED, 0),
            estimated_value=round(estimated_value, 2),
            waste_prevented_kg=round(waste_prevented_kg, 1)
        )

    def get_expiring_items(self, user_id: str, days: int) -> List[InventoryItem]:
        """Get items expiring within specified days."""
        cutoff_date = datetime.utcnow() + timedelta(days=days)
        
        return self.db.query(InventoryItem).filter(
            and_(
                InventoryItem.user_id == user_id,
                InventoryItem.predicted_expiry_date <= cutoff_date,
                InventoryItem.status.in_([ItemStatus.FRESH, ItemStatus.NEARING])
            )
        ).order_by(InventoryItem.predicted_expiry_date.asc()).all()

    def mark_item_as_used(self, item_id: str, user_id: str) -> Optional[InventoryItem]:
        """Mark an item as used."""
        return self.update_inventory_item(
            item_id, 
            user_id, 
            InventoryItemUpdate(status=ItemStatus.USED)
        )

    def get_user_categories(self, user_id: str) -> List[str]:
        """Get list of categories used by user."""
        categories = self.db.query(InventoryItem.category).filter(
            and_(
                InventoryItem.user_id == user_id,
                InventoryItem.category.isnot(None)
            )
        ).distinct().all()

        return [cat.category for cat in categories if cat.category]

    def get_search_suggestions(self, user_id: str, query: str) -> List[str]:
        """Get search suggestions for inventory."""
        search = f"%{query}%"
        
        suggestions = self.db.query(InventoryItem.name).filter(
            and_(
                InventoryItem.user_id == user_id,
                InventoryItem.name.ilike(search)
            )
        ).distinct().limit(10).all()

        return [s.name for s in suggestions]

    def update_item_statuses(self):
        """Update item statuses based on expiry dates."""
        now = datetime.utcnow()
        
        # Mark expired items
        self.db.query(InventoryItem).filter(
            and_(
                InventoryItem.predicted_expiry_date < now,
                InventoryItem.status == ItemStatus.FRESH
            )
        ).update({InventoryItem.status: ItemStatus.EXPIRED})

        # Mark nearing expiry (within 3 days)
        three_days = now + timedelta(days=3)
        self.db.query(InventoryItem).filter(
            and_(
                InventoryItem.predicted_expiry_date <= three_days,
                InventoryItem.predicted_expiry_date >= now,
                InventoryItem.status == ItemStatus.FRESH
            )
        ).update({InventoryItem.status: ItemStatus.NEARING})

        self.db.commit()
