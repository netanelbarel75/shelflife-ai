from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Any, Dict
from datetime import datetime
from decimal import Decimal
from enum import Enum

# === Base Response Schema ===
class APIResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Any] = None

# === User Schemas ===
class UserBase(BaseModel):
    email: EmailStr
    username: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    full_name: Optional[str] = None  # Computed field
    profile_image_url: Optional[str] = None
    is_active: bool = True
    is_google_user: bool = False
    
    @property
    def computed_full_name(self) -> Optional[str]:
        """Compute full name from first_name and last_name."""
        if self.first_name and self.last_name:
            return f"{self.first_name} {self.last_name}"
        elif self.first_name:
            return self.first_name
        elif self.last_name:
            return self.last_name
        return None

class UserCreate(UserBase):
    password: Optional[str] = None  # Optional for Google users
    
    # Override to make first_name and last_name available during creation
    first_name: Optional[str] = None
    last_name: Optional[str] = None

class UserUpdate(BaseModel):
    username: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    full_name: Optional[str] = None
    profile_image_url: Optional[str] = None

class UserInDB(UserBase):
    id: str
    hashed_password: Optional[str] = None
    google_id: Optional[str] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_verified: bool = False
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class User(UserBase):
    id: str
    phone: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_verified: bool = False
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    @classmethod
    def from_orm_with_full_name(cls, db_user):
        """Create User schema with computed full_name from ORM model."""
        user_data = {
            "id": str(db_user.id),
            "email": db_user.email,
            "username": db_user.username,
            "first_name": db_user.first_name,
            "last_name": db_user.last_name,
            "profile_image_url": getattr(db_user, 'profile_image_url', None),
            "is_active": db_user.is_active,
            "is_google_user": getattr(db_user, 'is_google_user', False),
            "phone": db_user.phone,
            "city": db_user.city,
            "state": db_user.state,
            "country": db_user.country,
            "latitude": db_user.latitude,
            "longitude": db_user.longitude,
            "is_verified": db_user.is_verified,
            "created_at": db_user.created_at,
            "updated_at": db_user.updated_at
        }
        
        # Compute full_name
        if db_user.first_name and db_user.last_name:
            user_data["full_name"] = f"{db_user.first_name} {db_user.last_name}"
        elif db_user.first_name:
            user_data["full_name"] = db_user.first_name
        elif db_user.last_name:
            user_data["full_name"] = db_user.last_name
        else:
            user_data["full_name"] = None
            
        return cls(**user_data)
    
    class Config:
        from_attributes = True

# === Auth Schemas ===
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class GoogleLoginRequest(BaseModel):
    id_token: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    refresh_token: Optional[str] = None
    user: Optional[User] = None

# === Inventory Schemas ===
class InventoryItemBase(BaseModel):
    name: str
    category: str
    brand: Optional[str] = None
    quantity: float
    unit: str
    purchase_date: datetime
    predicted_expiry_date: Optional[datetime] = None
    notes: Optional[str] = None
    estimated_price: Optional[Decimal] = None
    storage_location: Optional[str] = "fridge"
    source: str = "manual"  # manual, receipt, photo

class InventoryItemCreate(InventoryItemBase):
    pass

class InventoryItemUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    brand: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    predicted_expiry_date: Optional[datetime] = None
    notes: Optional[str] = None
    estimated_price: Optional[Decimal] = None
    storage_location: Optional[str] = None

class InventoryItem(InventoryItemBase):
    id: str
    user_id: str
    status: str
    days_until_expiry: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class InventoryStats(BaseModel):
    total_items: int
    fresh_items: int
    nearing_expiry: int
    expired_items: int
    categories_count: int
    waste_prevented_this_month: dict

class InventoryFilter(BaseModel):
    status: Optional[str] = None
    category: Optional[str] = None
    search_query: Optional[str] = None
    days_until_expiry_max: Optional[int] = None

class ExpiryPredictionRequest(BaseModel):
    product_name: str
    category: str
    brand: Optional[str] = None
    purchase_date: datetime
    storage_location: Optional[str] = "fridge"

class ExpiryPredictionResponse(BaseModel):
    predicted_expiry_date: datetime
    confidence_score: float
    days_until_expiry: int
    storage_tips: List[str] = []

# === Marketplace Schemas ===
class MarketplaceListingBase(BaseModel):
    title: str
    description: str
    category: str
    price: Decimal
    original_price: Optional[Decimal] = None
    quantity: float = 1
    unit: str = "pieces"
    expiry_date: datetime
    pickup_instructions: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class MarketplaceListingCreate(MarketplaceListingBase):
    inventory_item_id: Optional[str] = None

class MarketplaceListingUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    price: Optional[Decimal] = None
    pickup_instructions: Optional[str] = None
    status: Optional[str] = None

class MarketplaceListing(MarketplaceListingBase):
    id: str
    seller_id: str
    seller_name: str
    seller_rating: float = 0.0
    status: str
    views: int = 0
    distance: Optional[float] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class MarketplaceFilter(BaseModel):
    category: Optional[str] = None
    max_price: Optional[float] = None
    max_distance_miles: Optional[float] = None
    search_query: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class SellerInfo(BaseModel):
    id: str
    username: str
    full_name: Optional[str] = None
    profile_image_url: Optional[str] = None
    rating: Optional[float] = 0.0
    total_sales: Optional[int] = 0
    is_verified: Optional[bool] = False
    distance_miles: Optional[float] = None
    
    class Config:
        from_attributes = True

class SellerInfo(BaseModel):
    id: str
    username: str
    rating: float = 0.0
    distance_miles: Optional[float] = None
    
    class Config:
        from_attributes = True

# === Payment Schemas ===
class PaymentIntent(BaseModel):
    client_secret: str
    amount: int
    currency: str
    order_id: str

class PaymentConfirmation(BaseModel):
    payment_intent_id: str

class PurchaseRequest(BaseModel):
    listing_id: str

class PurchaseResponse(BaseModel):
    success: bool
    message: str
    order_id: str
    contact_info: Optional[str] = None

class OrderCreate(BaseModel):
    listing_id: str
    buyer_id: str
    seller_id: str
    item_name: str
    price: Decimal
    platform_fee: Decimal
    total_amount: Decimal
    stripe_payment_intent_id: str
    status: str = "pending"

class Order(BaseModel):
    id: str
    listing_id: str
    buyer_id: str
    seller_id: str
    item_name: str
    price: Decimal
    platform_fee: Decimal
    total_amount: Decimal
    status: str
    stripe_payment_intent_id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# === Receipt Schemas ===
class ReceiptBase(BaseModel):
    store_name: Optional[str] = None
    receipt_date: Optional[datetime] = None
    total_amount: Optional[float] = None
    currency: str = "USD"

class ReceiptCreate(ReceiptBase):
    pass

class ReceiptUpdate(BaseModel):
    store_name: Optional[str] = None
    receipt_date: Optional[datetime] = None
    total_amount: Optional[float] = None
    currency: Optional[str] = None

class Receipt(ReceiptBase):
    id: str
    user_id: str
    file_path: str
    original_filename: Optional[str] = None
    processing_status: str = "pending"
    ocr_text: Optional[str] = None
    processed_at: Optional[datetime] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

class ReceiptUploadResponse(BaseModel):
    receipt_id: str
    message: str
    processing_status: str

class ParsedReceiptItem(BaseModel):
    name: str
    category: Optional[str] = None
    brand: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    price: Optional[float] = None
    estimated_expiry_date: Optional[datetime] = None

class ReceiptParsingResult(BaseModel):
    receipt_id: str
    items: List[ParsedReceiptItem]
    total_items: int
    processing_status: str
    parsed_at: datetime

# === OCR Schemas ===
class OCRResult(BaseModel):
    text: str
    confidence: float  # 0-1 confidence score
    processing_time_ms: int
    regions: Optional[List[Dict[str, Any]]] = None

class TextRegion(BaseModel):
    text: str
    confidence: float
    bbox: Dict[str, int]  # x, y, width, height

class StoreInfo(BaseModel):
    store_name: Optional[str] = None
    receipt_date: Optional[str] = None
    total_amount: Optional[float] = None

# === Message Schemas ===
class MessageCreate(BaseModel):
    receiver_id: str
    listing_id: Optional[str] = None
    content: str

class Message(BaseModel):
    id: str
    sender_id: str
    receiver_id: str
    listing_id: Optional[str] = None
    content: str
    is_read: bool = False
    created_at: datetime
    
    class Config:
        from_attributes = True
