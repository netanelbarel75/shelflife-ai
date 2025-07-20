from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List
from datetime import datetime
from uuid import UUID
import enum

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

# Base schemas
class BaseSchema(BaseModel):
    class Config:
        from_attributes = True

# User schemas
class UserBase(BaseSchema):
    email: EmailStr
    username: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None

class UserCreate(UserBase):
    password: str = Field(..., min_length=8)

class UserUpdate(BaseSchema):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None

class UserInDB(UserBase):
    id: UUID
    is_active: bool
    is_verified: bool
    created_at: datetime
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    city: Optional[str] = None

class User(UserInDB):
    pass

# Auth schemas
class Token(BaseSchema):
    access_token: str
    token_type: str
    expires_in: int
    refresh_token: Optional[str] = None

class TokenData(BaseSchema):
    user_id: Optional[UUID] = None

class LoginRequest(BaseSchema):
    email: EmailStr
    password: str

# Receipt schemas
class ReceiptBase(BaseSchema):
    store_name: Optional[str] = None
    receipt_date: Optional[datetime] = None
    total_amount: Optional[float] = None
    currency: str = "USD"

class ReceiptCreate(ReceiptBase):
    pass

class ReceiptInDB(ReceiptBase):
    id: UUID
    user_id: UUID
    file_path: str
    original_filename: Optional[str] = None
    processed_at: datetime
    ocr_text: Optional[str] = None
    processing_status: str
    created_at: datetime

class Receipt(ReceiptInDB):
    pass

class ReceiptUploadResponse(BaseSchema):
    receipt_id: UUID
    message: str
    processing_status: str

# Inventory Item schemas
class InventoryItemBase(BaseSchema):
    name: str
    category: Optional[str] = None
    brand: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    purchase_price: Optional[float] = None
    purchase_date: Optional[datetime] = None
    store_name: Optional[str] = None
    notes: Optional[str] = None

class InventoryItemCreate(InventoryItemBase):
    receipt_id: Optional[UUID] = None
    predicted_expiry_date: Optional[datetime] = None
    source: ItemSource = ItemSource.MANUAL

class InventoryItemUpdate(BaseSchema):
    name: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    status: Optional[ItemStatus] = None
    actual_expiry_date: Optional[datetime] = None
    notes: Optional[str] = None

class InventoryItemInDB(InventoryItemBase):
    id: UUID
    user_id: UUID
    receipt_id: Optional[UUID] = None
    predicted_expiry_date: Optional[datetime] = None
    actual_expiry_date: Optional[datetime] = None
    confidence_score: Optional[float] = None
    status: ItemStatus
    source: ItemSource
    created_at: datetime
    last_updated: datetime
    image_url: Optional[str] = None

class InventoryItem(InventoryItemInDB):
    days_until_expiry: Optional[int] = None

class InventoryStats(BaseSchema):
    total_items: int
    fresh_items: int
    nearing_expiry: int
    expired_items: int
    used_items: int
    estimated_value: float
    waste_prevented_kg: float

# Marketplace schemas
class MarketplaceListingBase(BaseSchema):
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    quantity: float
    unit: str
    price: float = Field(..., gt=0)
    currency: str = "USD"
    is_negotiable: bool = True
    pickup_address: Optional[str] = None
    delivery_available: bool = False
    delivery_radius_miles: Optional[float] = None
    expiry_date: Optional[datetime] = None
    available_until: Optional[datetime] = None

class MarketplaceListingCreate(MarketplaceListingBase):
    inventory_item_id: Optional[UUID] = None
    latitude: float
    longitude: float

class MarketplaceListingUpdate(BaseSchema):
    title: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = Field(None, gt=0)
    is_negotiable: Optional[bool] = None
    status: Optional[ListingStatus] = None
    available_until: Optional[datetime] = None

class SellerInfo(BaseSchema):
    id: UUID
    username: str
    rating: Optional[float] = None
    distance_miles: Optional[float] = None

class MarketplaceListingInDB(MarketplaceListingBase):
    id: UUID
    seller_id: UUID
    inventory_item_id: Optional[UUID] = None
    latitude: float
    longitude: float
    status: ListingStatus
    views_count: int
    created_at: datetime
    updated_at: datetime

class MarketplaceListing(MarketplaceListingInDB):
    seller: SellerInfo
    days_until_expiry: Optional[int] = None

# Message schemas
class MessageBase(BaseSchema):
    content: str

class MessageCreate(MessageBase):
    receiver_id: UUID
    listing_id: Optional[UUID] = None

class MessageInDB(MessageBase):
    id: UUID
    sender_id: UUID
    receiver_id: UUID
    listing_id: Optional[UUID] = None
    is_read: bool
    created_at: datetime
    read_at: Optional[datetime] = None

class Message(MessageInDB):
    sender_username: Optional[str] = None
    receiver_username: Optional[str] = None

# OCR and ML schemas
class OCRResult(BaseSchema):
    text: str
    confidence: float
    processing_time_ms: int

class ParsedReceiptItem(BaseSchema):
    name: str
    quantity: Optional[str] = None
    price: Optional[float] = None
    category: Optional[str] = None
    estimated_expiry_date: Optional[datetime] = None
    confidence: float

class ReceiptParsingResult(BaseSchema):
    receipt_id: UUID
    store_name: Optional[str] = None
    receipt_date: Optional[datetime] = None
    total_amount: Optional[float] = None
    items: List[ParsedReceiptItem]
    processing_time_ms: int
    
class ExpiryPredictionRequest(BaseSchema):
    product_name: str
    category: Optional[str] = None
    brand: Optional[str] = None
    purchase_date: Optional[datetime] = None
    storage_location: Optional[str] = "pantry"  # pantry, refrigerator, freezer

class ExpiryPredictionResponse(BaseSchema):
    predicted_expiry_date: datetime
    confidence_score: float
    estimated_shelf_life_days: int
    factors: List[str]  # Factors that influenced the prediction

# Search and filter schemas
class InventoryFilter(BaseSchema):
    status: Optional[ItemStatus] = None
    category: Optional[str] = None
    search_query: Optional[str] = None
    days_until_expiry_max: Optional[int] = None

class MarketplaceFilter(BaseSchema):
    category: Optional[str] = None
    max_price: Optional[float] = None
    max_distance_miles: Optional[float] = None
    search_query: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

# Response schemas
class APIResponse(BaseSchema):
    success: bool
    message: str
    data: Optional[dict] = None

class PaginatedResponse(BaseSchema):
    items: List[dict]
    total: int
    page: int
    per_page: int
    pages: int
    has_next: bool
    has_prev: bool
