from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text, ForeignKey, Enum, TypeDecorator
from sqlalchemy.orm import relationship
from sqlalchemy.dialects import postgresql
import uuid
from datetime import datetime
import enum

from app.database import Base


class UUID(TypeDecorator):
    """Platform-independent UUID type.
    Uses PostgreSQL's UUID type, otherwise uses String(36).
    """
    impl = String
    cache_ok = True
    
    def __init__(self, as_uuid=True, *args, **kwargs):
        self.as_uuid = as_uuid
        super().__init__(length=36 if as_uuid else None, *args, **kwargs)
    
    def load_dialect_impl(self, dialect):
        if dialect.name == 'postgresql':
            return dialect.type_descriptor(postgresql.UUID(as_uuid=self.as_uuid))
        else:
            return dialect.type_descriptor(String(36))
    
    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        elif dialect.name == 'postgresql':
            return str(value) if not self.as_uuid else value
        else:
            return str(value)
    
    def process_result_value(self, value, dialect):
        if value is None:
            return None
        elif self.as_uuid:
            return uuid.UUID(value) if isinstance(value, str) else value
        else:
            return str(value)

class ItemStatus(str, enum.Enum):
    FRESH = "fresh"
    NEARING = "nearing"
    EXPIRED = "expired"
    USED = "used"

class ItemSource(str, enum.Enum):
    RECEIPT = "receipt"
    PHOTO = "photo"
    MANUAL = "manual"

class ListingStatus(str, enum.Enum):
    ACTIVE = "active"
    SOLD = "sold"
    EXPIRED = "expired"
    REMOVED = "removed"

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=True)  # Nullable for OAuth users
    first_name = Column(String)
    last_name = Column(String)
    phone = Column(String)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Location for marketplace
    latitude = Column(Float)
    longitude = Column(Float)
    city = Column(String)
    state = Column(String)
    country = Column(String)
    
    # OAuth fields
    google_id = Column(String, unique=True, nullable=True)
    is_google_user = Column(Boolean, default=False)
    profile_image_url = Column(String, nullable=True)
    
    # Relationships
    inventory_items = relationship("InventoryItem", back_populates="user")
    receipts = relationship("Receipt", back_populates="user")
    marketplace_listings = relationship("MarketplaceListing", back_populates="seller")
    sent_messages = relationship("Message", foreign_keys="Message.sender_id", back_populates="sender")
    received_messages = relationship("Message", foreign_keys="Message.receiver_id", back_populates="receiver")

class Receipt(Base):
    __tablename__ = "receipts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    file_path = Column(String, nullable=False)
    original_filename = Column(String)
    store_name = Column(String)
    receipt_date = Column(DateTime)
    total_amount = Column(Float)
    currency = Column(String, default="USD")
    processed_at = Column(DateTime, default=datetime.utcnow)
    ocr_text = Column(Text)
    processing_status = Column(String, default="pending")  # pending, processing, completed, failed
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="receipts")
    inventory_items = relationship("InventoryItem", back_populates="receipt")

class InventoryItem(Base):
    __tablename__ = "inventory_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    receipt_id = Column(UUID(as_uuid=True), ForeignKey("receipts.id"), nullable=True)
    
    # Item details
    name = Column(String, nullable=False)
    category = Column(String)
    brand = Column(String)
    quantity = Column(Float)
    unit = Column(String)
    
    # Purchase info
    purchase_price = Column(Float)
    purchase_date = Column(DateTime)
    store_name = Column(String)
    
    # Expiry prediction
    predicted_expiry_date = Column(DateTime)
    actual_expiry_date = Column(DateTime)
    confidence_score = Column(Float)  # ML model confidence
    
    # Status tracking
    status = Column(Enum(ItemStatus), default=ItemStatus.FRESH)
    source = Column(Enum(ItemSource), default=ItemSource.RECEIPT)
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    notes = Column(Text)
    image_url = Column(String)
    
    # Relationships
    user = relationship("User", back_populates="inventory_items")
    receipt = relationship("Receipt", back_populates="inventory_items")

class MarketplaceListing(Base):
    __tablename__ = "marketplace_listings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    seller_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    inventory_item_id = Column(UUID(as_uuid=True), ForeignKey("inventory_items.id"), nullable=True)
    
    # Listing details
    title = Column(String, nullable=False)
    description = Column(Text)
    category = Column(String)
    quantity = Column(Float)
    unit = Column(String)
    
    # Pricing
    price = Column(Float, nullable=False)
    currency = Column(String, default="USD")
    is_negotiable = Column(Boolean, default=True)
    
    # Location
    latitude = Column(Float)
    longitude = Column(Float)
    pickup_address = Column(String)
    delivery_available = Column(Boolean, default=False)
    delivery_radius_miles = Column(Float)
    
    # Timing
    expiry_date = Column(DateTime)
    available_from = Column(DateTime, default=datetime.utcnow)
    available_until = Column(DateTime)
    
    # Status
    status = Column(Enum(ListingStatus), default=ListingStatus.ACTIVE)
    views_count = Column(Integer, default=0)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    seller = relationship("User", back_populates="marketplace_listings")
    messages = relationship("Message", back_populates="listing")

class Message(Base):
    __tablename__ = "messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sender_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    receiver_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    listing_id = Column(UUID(as_uuid=True), ForeignKey("marketplace_listings.id"), nullable=True)
    
    # Message content
    content = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    read_at = Column(DateTime)
    
    # Relationships
    sender = relationship("User", foreign_keys=[sender_id], back_populates="sent_messages")
    receiver = relationship("User", foreign_keys=[receiver_id], back_populates="received_messages")
    listing = relationship("MarketplaceListing", back_populates="messages")

class ShelfLifeData(Base):
    """Reference data for typical shelf life of food items."""
    __tablename__ = "shelf_life_data"

    id = Column(Integer, primary_key=True)
    product_name = Column(String, nullable=False)
    category = Column(String, nullable=False)
    brand = Column(String)
    
    # Shelf life in days
    pantry_days = Column(Integer)
    refrigerator_days = Column(Integer)
    freezer_days = Column(Integer)
    
    # Storage conditions
    storage_temperature_min = Column(Float)  # Celsius
    storage_temperature_max = Column(Float)  # Celsius
    storage_humidity_max = Column(Float)     # Percentage
    
    # Metadata
    source = Column(String)  # Data source (USDA, manufacturer, etc.)
    last_updated = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

class OrderStatus(str, enum.Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"

class Order(Base):
    """Order model for marketplace transactions."""
    __tablename__ = "orders"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    listing_id = Column(UUID(as_uuid=True), ForeignKey("marketplace_listings.id"), nullable=False)
    buyer_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    seller_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # Order details
    item_name = Column(String, nullable=False)
    price = Column(Float, nullable=False)
    platform_fee = Column(Float, nullable=False)
    total_amount = Column(Float, nullable=False)
    
    # Payment
    stripe_payment_intent_id = Column(String, nullable=False)
    status = Column(Enum(OrderStatus), default=OrderStatus.PENDING)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = Column(DateTime)
    
    # Relationships
    listing = relationship("MarketplaceListing")
    buyer = relationship("User", foreign_keys=[buyer_id])
    seller = relationship("User", foreign_keys=[seller_id])
