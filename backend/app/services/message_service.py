from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc
from typing import Optional, List
from datetime import datetime
import uuid

from app.models import Message, User
from app.schemas import MessageCreate, Message as MessageSchema

class MessageService:
    def __init__(self, db: Session):
        self.db = db

    def send_message(self, sender_id: str, message_data: MessageCreate) -> Message:
        """Send a message to another user."""
        message = Message(
            id=uuid.uuid4(),
            sender_id=sender_id,
            receiver_id=message_data.receiver_id,
            listing_id=message_data.listing_id,
            content=message_data.content,
            is_read=False,
            created_at=datetime.utcnow()
        )

        self.db.add(message)
        self.db.commit()
        self.db.refresh(message)
        return message

    def get_user_messages(
        self, 
        user_id: str, 
        skip: int = 0, 
        limit: int = 50,
        unread_only: bool = False
    ) -> List[Message]:
        """Get user's messages (received)."""
        query = self.db.query(Message).filter(
            Message.receiver_id == user_id
        )

        if unread_only:
            query = query.filter(Message.is_read == False)

        return query.order_by(desc(Message.created_at)).offset(skip).limit(limit).all()

    def mark_as_read(self, message_id: str, user_id: str) -> Optional[Message]:
        """Mark a message as read."""
        message = self.db.query(Message).filter(
            and_(
                Message.id == message_id,
                Message.receiver_id == user_id
            )
        ).first()

        if message:
            message.is_read = True
            message.read_at = datetime.utcnow()
            self.db.commit()
            self.db.refresh(message)

        return message

    def get_unread_count(self, user_id: str) -> int:
        """Get count of unread messages."""
        return self.db.query(Message).filter(
            and_(
                Message.receiver_id == user_id,
                Message.is_read == False
            )
        ).count()

    def get_conversation(
        self, 
        user1_id: str, 
        user2_id: str, 
        skip: int = 0, 
        limit: int = 50
    ) -> List[Message]:
        """Get conversation between two users."""
        return self.db.query(Message).filter(
            or_(
                and_(Message.sender_id == user1_id, Message.receiver_id == user2_id),
                and_(Message.sender_id == user2_id, Message.receiver_id == user1_id)
            )
        ).order_by(desc(Message.created_at)).offset(skip).limit(limit).all()

    def get_conversations(self, user_id: str) -> List[dict]:
        """Get user's message conversations."""
        # This is a simplified version - in production, you'd want to optimize this query
        sent_messages = self.db.query(Message).filter(Message.sender_id == user_id)
        received_messages = self.db.query(Message).filter(Message.receiver_id == user_id)
        
        # Get unique conversation partners
        partners = set()
        for msg in sent_messages:
            partners.add(msg.receiver_id)
        for msg in received_messages:
            partners.add(msg.sender_id)

        conversations = []
        for partner_id in partners:
            # Get latest message in conversation
            latest_message = self.db.query(Message).filter(
                or_(
                    and_(Message.sender_id == user_id, Message.receiver_id == partner_id),
                    and_(Message.sender_id == partner_id, Message.receiver_id == user_id)
                )
            ).order_by(desc(Message.created_at)).first()

            if latest_message:
                partner = self.db.query(User).filter(User.id == partner_id).first()
                conversations.append({
                    'partner_id': partner_id,
                    'partner_username': partner.username if partner else 'Unknown',
                    'latest_message': latest_message.content,
                    'latest_message_time': latest_message.created_at,
                    'unread_count': self.db.query(Message).filter(
                        and_(
                            Message.sender_id == partner_id,
                            Message.receiver_id == user_id,
                            Message.is_read == False
                        )
                    ).count()
                })

        conversations.sort(key=lambda x: x['latest_message_time'], reverse=True)
        return conversations

    def delete_message(self, message_id: str, user_id: str) -> bool:
        """Delete a message (only sender can delete)."""
        message = self.db.query(Message).filter(
            and_(
                Message.id == message_id,
                Message.sender_id == user_id
            )
        ).first()

        if message:
            self.db.delete(message)
            self.db.commit()
            return True

        return False

    def get_listing_messages(self, listing_id: str, user_id: str) -> List[Message]:
        """Get messages related to a specific listing."""
        return self.db.query(Message).filter(
            and_(
                Message.listing_id == listing_id,
                or_(
                    Message.sender_id == user_id,
                    Message.receiver_id == user_id
                )
            )
        ).order_by(Message.created_at).all()
