# backend/app/routers/payments.py
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Any, List, Optional
import stripe
from decimal import Decimal

from app.database import get_db
from app.schemas import (
    User, APIResponse, PurchaseRequest, PurchaseResponse, Order, 
    OrderCreate, PaymentIntent, PaymentConfirmation
)
from app.routers.auth import get_current_user
from app.services.payment_service import PaymentService
from app.services.marketplace_service import MarketplaceService
from app.services.notification_service import NotificationService
from app.config import settings

router = APIRouter()

# Configure Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY

@router.post("/create-payment-intent", response_model=PaymentIntent)
async def create_payment_intent(
    listing_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Create a Stripe payment intent for purchasing a marketplace item."""
    marketplace_service = MarketplaceService(db)
    payment_service = PaymentService(db)
    
    # Get listing
    listing = marketplace_service.get_listing(listing_id)
    if not listing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Listing not found"
        )
    
    if listing.status != "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Listing is no longer available"
        )
    
    # Prevent self-purchase
    if listing.seller_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot purchase your own item"
        )
    
    # Calculate amounts
    item_amount = int(listing.price * 100)  # Convert to cents
    platform_fee = int(item_amount * 0.05)  # 5% platform fee
    total_amount = item_amount + platform_fee
    
    try:
        # Create Stripe payment intent
        intent = stripe.PaymentIntent.create(
            amount=total_amount,
            currency="ils",  # Israeli Shekel
            metadata={
                "listing_id": listing_id,
                "buyer_id": str(current_user.id),
                "seller_id": str(listing.seller_id),
                "platform_fee": str(platform_fee)
            }
        )
        
        # Create pending order in database
        order_data = OrderCreate(
            listing_id=listing_id,
            buyer_id=current_user.id,
            seller_id=listing.seller_id,
            item_name=listing.title,
            price=listing.price,
            platform_fee=Decimal(platform_fee) / 100,
            total_amount=Decimal(total_amount) / 100,
            stripe_payment_intent_id=intent.id,
            status="pending"
        )
        
        order = payment_service.create_order(order_data)
        
        return PaymentIntent(
            client_secret=intent.client_secret,
            amount=total_amount,
            currency="ils",
            order_id=str(order.id)
        )
        
    except stripe.error.StripeError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Payment setup failed: {str(e)}"
        )

@router.post("/confirm-payment", response_model=PurchaseResponse)
async def confirm_payment(
    payment_data: PaymentConfirmation,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Confirm payment and complete purchase."""
    payment_service = PaymentService(db)
    marketplace_service = MarketplaceService(db)
    
    # Get order
    order = payment_service.get_order_by_payment_intent(payment_data.payment_intent_id)
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    # Verify ownership
    if order.buyer_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to confirm this payment"
        )
    
    try:
        # Retrieve payment intent from Stripe
        intent = stripe.PaymentIntent.retrieve(payment_data.payment_intent_id)
        
        if intent.status == "succeeded":
            # Update order status
            order = payment_service.update_order_status(order.id, "completed")
            
            # Mark listing as sold
            listing = marketplace_service.mark_as_sold(order.listing_id, order.seller_id)
            
            # Send notifications
            background_tasks.add_task(
                send_purchase_notifications,
                order=order,
                db=db
            )
            
            return PurchaseResponse(
                success=True,
                message="Purchase completed successfully!",
                order_id=str(order.id),
                contact_info="Check your messages for seller contact details."
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Payment not completed"
            )
            
    except stripe.error.StripeError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Payment confirmation failed: {str(e)}"
        )

@router.get("/orders", response_model=List[Order])
async def get_user_orders(
    skip: int = 0,
    limit: int = 20,
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Get user's purchase orders."""
    payment_service = PaymentService(db)
    orders = payment_service.get_user_orders(
        current_user.id, 
        skip, 
        limit, 
        status
    )
    return orders

@router.get("/sales", response_model=List[Order])
async def get_user_sales(
    skip: int = 0,
    limit: int = 20,
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Get user's sales (items they sold)."""
    payment_service = PaymentService(db)
    orders = payment_service.get_user_sales(
        current_user.id, 
        skip, 
        limit, 
        status
    )
    return orders

@router.get("/earnings", response_model=dict)
async def get_earnings_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Get seller earnings summary."""
    payment_service = PaymentService(db)
    earnings = payment_service.get_seller_earnings(current_user.id)
    return earnings

async def send_purchase_notifications(order: Order, db: Session):
    """Send notifications to buyer and seller after successful purchase."""
    notification_service = NotificationService(db)
    
    # Notify seller
    await notification_service.send_notification(
        user_id=order.seller_id,
        title="🎉 Item Sold!",
        message=f"Your '{order.item_name}' has been purchased!",
        data={
            "type": "sale_completed",
            "order_id": str(order.id),
            "amount": str(order.price)
        }
    )
    
    # Notify buyer
    await notification_service.send_notification(
        user_id=order.buyer_id,
        title="✅ Purchase Completed",
        message=f"You successfully purchased '{order.item_name}'. Check messages for pickup details.",
        data={
            "type": "purchase_completed",
            "order_id": str(order.id)
        }
    )
