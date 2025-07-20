import pytest
from unittest.mock import Mock, patch
from datetime import datetime, timedelta
import uuid

from app.services.inventory_service import InventoryService
from app.models import InventoryItem, ItemStatus, ItemSource
from app.schemas import InventoryItemCreate, InventoryItemUpdate, InventoryFilter


class TestInventoryService:
    
    def setup_method(self):
        """Setup test fixtures before each test method."""
        self.mock_db = Mock()
        self.inventory_service = InventoryService(self.mock_db)
        self.user_id = str(uuid.uuid4())
        self.item_id = str(uuid.uuid4())
        
        # Sample inventory item
        self.sample_item = InventoryItem(
            id=self.item_id,
            user_id=self.user_id,
            name="Test Milk",
            category="Dairy",
            brand="TestBrand",
            quantity=1,
            unit="liter",
            purchase_price=3.99,
            purchase_date=datetime.utcnow(),
            predicted_expiry_date=datetime.utcnow() + timedelta(days=7),
            status=ItemStatus.FRESH,
            source=ItemSource.RECEIPT,
            created_at=datetime.utcnow(),
            last_updated=datetime.utcnow()
        )

    def test_create_inventory_item(self):
        """Test creating a new inventory item."""
        # Arrange
        item_data = InventoryItemCreate(
            name="Test Item",
            category="Test Category",
            brand="Test Brand",
            quantity=1,
            unit="piece",
            purchase_price=5.99,
            source=ItemSource.MANUAL
        )
        
        self.mock_db.add = Mock()
        self.mock_db.commit = Mock()
        self.mock_db.refresh = Mock()
        
        # Act
        result = self.inventory_service.create_inventory_item(self.user_id, item_data)
        
        # Assert
        assert result.name == "Test Item"
        assert result.user_id == self.user_id
        assert result.category == "Test Category"
        assert result.status == ItemStatus.FRESH
        self.mock_db.add.assert_called_once()
        self.mock_db.commit.assert_called_once()
        self.mock_db.refresh.assert_called_once()

    def test_get_inventory_item(self):
        """Test retrieving a specific inventory item."""
        # Arrange
        self.mock_db.query.return_value.filter.return_value.first.return_value = self.sample_item
        
        # Act
        result = self.inventory_service.get_inventory_item(self.item_id, self.user_id)
        
        # Assert
        assert result == self.sample_item
        assert result.name == "Test Milk"
        assert result.id == self.item_id
        
    def test_get_inventory_item_not_found(self):
        """Test retrieving a non-existent inventory item."""
        # Arrange
        self.mock_db.query.return_value.filter.return_value.first.return_value = None
        
        # Act
        result = self.inventory_service.get_inventory_item("non-existent-id", self.user_id)
        
        # Assert
        assert result is None

    def test_update_inventory_item(self):
        """Test updating an inventory item."""
        # Arrange
        self.mock_db.query.return_value.filter.return_value.first.return_value = self.sample_item
        self.mock_db.commit = Mock()
        self.mock_db.refresh = Mock(return_value=self.sample_item)
        
        update_data = InventoryItemUpdate(
            name="Updated Milk",
            quantity=2,
            status=ItemStatus.NEARING
        )
        
        # Act
        result = self.inventory_service.update_inventory_item(
            self.item_id, 
            self.user_id, 
            update_data
        )
        
        # Assert
        assert result is not None
        self.mock_db.commit.assert_called_once()
        self.mock_db.refresh.assert_called_once()

    def test_delete_inventory_item(self):
        """Test deleting an inventory item."""
        # Arrange
        self.mock_db.query.return_value.filter.return_value.first.return_value = self.sample_item
        self.mock_db.delete = Mock()
        self.mock_db.commit = Mock()
        
        # Act
        result = self.inventory_service.delete_inventory_item(self.item_id, self.user_id)
        
        # Assert
        assert result is True
        self.mock_db.delete.assert_called_once_with(self.sample_item)
        self.mock_db.commit.assert_called_once()

    def test_delete_inventory_item_not_found(self):
        """Test deleting a non-existent inventory item."""
        # Arrange
        self.mock_db.query.return_value.filter.return_value.first.return_value = None
        
        # Act
        result = self.inventory_service.delete_inventory_item("non-existent-id", self.user_id)
        
        # Assert
        assert result is False

    def test_get_user_inventory_with_filter(self):
        """Test getting user inventory with filters."""
        # Arrange
        mock_items = [self.sample_item]
        mock_query = Mock()
        mock_query.filter.return_value = mock_query
        mock_query.order_by.return_value = mock_query
        mock_query.offset.return_value = mock_query
        mock_query.limit.return_value.all.return_value = mock_items
        
        self.mock_db.query.return_value = mock_query
        
        filters = InventoryFilter(
            status=ItemStatus.FRESH,
            category="Dairy",
            search_query="milk"
        )
        
        # Act
        result = self.inventory_service.get_user_inventory(
            self.user_id, 
            skip=0, 
            limit=10, 
            filters=filters
        )
        
        # Assert
        assert len(result) == 1
        assert result[0].name == "Test Milk"

    def test_mark_item_as_used(self):
        """Test marking an item as used."""
        # Arrange
        self.mock_db.query.return_value.filter.return_value.first.return_value = self.sample_item
        self.mock_db.commit = Mock()
        self.mock_db.refresh = Mock(return_value=self.sample_item)
        
        # Act
        result = self.inventory_service.mark_item_as_used(self.item_id, self.user_id)
        
        # Assert
        assert result is not None
        self.mock_db.commit.assert_called_once()

    @patch('app.services.inventory_service.datetime')
    def test_update_item_statuses(self, mock_datetime):
        """Test updating item statuses based on expiry dates."""
        # Arrange
        now = datetime.utcnow()
        mock_datetime.utcnow.return_value = now
        
        mock_query = Mock()
        self.mock_db.query.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.update = Mock()
        self.mock_db.commit = Mock()
        
        # Act
        self.inventory_service.update_item_statuses()
        
        # Assert
        self.mock_db.commit.assert_called_once()
        # Should be called twice - once for expired items, once for nearing items
        assert mock_query.update.call_count == 2


if __name__ == "__main__":
    pytest.main([__file__])
