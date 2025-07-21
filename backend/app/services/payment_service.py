# backend/app/services/payment_service.py
from sqlalchemy.orm import Session
from typing import List, Optional
from decimal import Decimal
import uuid
from datetime import datetime

from app.models import Order
from app.schemas import OrderCreate

class PaymentService:
    def __init__(self, db: Session):
        self.db = db
    
    def create_order(self, order_data: OrderCreate) -> Order:
        """Create a new order."""
        db_order = Order(
            id=uuid.uuid4(),
            **order_data.dict(),
            created_at=datetime.utcnow()
        )
        self.db.add(db_order)
        self.db.commit()
        self.db.refresh(db_order)
        return db_order
    
    def get_order(self, order_id: str) -> Optional[Order]:
        """Get order by ID."""
        return self.db.query(Order).filter(Order.id == order_id).first()
    
    def get_order_by_payment_intent(self, payment_intent_id: str) -> Optional[Order]:
        """Get order by Stripe payment intent ID."""
        return self.db.query(Order).filter(
            Order.stripe_payment_intent_id == payment_intent_id
        ).first()
    
    def update_order_status(self, order_id: str, status: str) -> Order:
        """Update order status."""
        order = self.get_order(order_id)
        if order:
            order.status = status
            order.updated_at = datetime.utcnow()
            self.db.commit()
            self.db.refresh(order)
        return order
    
    def get_user_orders(
        self, 
        user_id: str, 
        skip: int = 0, 
        limit: int = 20,
        status: Optional[str] = None
    ) -> List[Order]:
        """Get user's purchase orders."""
        query = self.db.query(Order).filter(Order.buyer_id == user_id)
        
        if status:
            query = query.filter(Order.status == status)
        
        return query.offset(skip).limit(limit).all()
    
    def get_user_sales(
        self, 
        user_id: str, 
        skip: int = 0, 
        limit: int = 20,
        status: Optional[str] = None
    ) -> List[Order]:
        """Get user's sales."""
        query = self.db.query(Order).filter(Order.seller_id == user_id)
        
        if status:
            query = query.filter(Order.status == status)
        
        return query.offset(skip).limit(limit).all()
    
    # TODO: Implement refund functionality
    # def create_refund_request(self, order_id: str, reason: str) -> RefundRequest:
    #     """Create a refund request."""
    #     refund_request = RefundRequest(
    #         id=uuid.uuid4(),
    #         order_id=order_id,
    #         reason=reason,
    #         status="pending",
    #         created_at=datetime.utcnow()
    #     )
    #     self.db.add(refund_request)
    #     self.db.commit()
    #     self.db.refresh(refund_request)
    #     return refund_request
    
    def get_seller_earnings(self, seller_id: str) -> dict:
        """Get seller earnings summary."""
        from sqlalchemy import func, and_
        
        # Total earnings
        total_earnings = self.db.query(
            func.sum(Order.price)
        ).filter(
            and_(Order.seller_id == seller_id, Order.status == "completed")
        ).scalar() or Decimal(0)
        
        # Monthly earnings
        from datetime import datetime, timedelta
        current_month = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        monthly_earnings = self.db.query(
            func.sum(Order.price)
        ).filter(
            and_(
                Order.seller_id == seller_id,
                Order.status == "completed",
                Order.created_at >= current_month
            )
        ).scalar() or Decimal(0)
        
        # Total sales count
        total_sales = self.db.query(Order).filter(
            and_(Order.seller_id == seller_id, Order.status == "completed")
        ).count()
        
        return {
            "total_earnings": float(total_earnings),
            "monthly_earnings": float(monthly_earnings),
            "total_sales": total_sales,
            "currency": "ILS"
        }
