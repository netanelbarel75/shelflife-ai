from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Any, List, Optional

from app.database import get_db
from app.schemas import (
    User, UserUpdate, APIResponse, Message, MessageCreate
)
from app.routers.auth import get_current_user
from app.services.user_service import UserService
from app.services.message_service import MessageService

router = APIRouter()

@router.get("/profile", response_model=User)
async def get_profile(
    current_user: User = Depends(get_current_user)
) -> Any:
    """Get current user's profile."""
    return current_user

@router.put("/profile", response_model=User)
async def update_profile(
    profile_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Update current user's profile."""
    user_service = UserService(db)
    updated_user = user_service.update_user(current_user.id, profile_update)
    
    if not updated_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return updated_user

@router.get("/messages", response_model=List[Message])
async def get_messages(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    unread_only: bool = Query(False),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Get user's messages."""
    message_service = MessageService(db)
    messages = message_service.get_user_messages(
        current_user.id, 
        skip, 
        limit, 
        unread_only
    )
    return messages

@router.post("/messages", response_model=Message)
async def send_message(
    message_data: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Send a message to another user."""
    message_service = MessageService(db)
    
    # Prevent messaging yourself
    if message_data.receiver_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot send message to yourself"
        )
    
    message = message_service.send_message(current_user.id, message_data)
    return message

@router.put("/messages/{message_id}/read", response_model=Message)
async def mark_message_read(
    message_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Mark a message as read."""
    message_service = MessageService(db)
    message = message_service.mark_as_read(message_id, current_user.id)
    
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found"
        )
    
    return message

@router.get("/messages/unread-count")
async def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Get count of unread messages."""
    message_service = MessageService(db)
    count = message_service.get_unread_count(current_user.id)
    return {"unread_count": count}

@router.get("/messages/conversations")
async def get_conversations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Get user's message conversations."""
    message_service = MessageService(db)
    conversations = message_service.get_conversations(current_user.id)
    return conversations

@router.get("/messages/conversation/{other_user_id}", response_model=List[Message])
async def get_conversation_with_user(
    other_user_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Get conversation between current user and another user."""
    message_service = MessageService(db)
    messages = message_service.get_conversation(
        current_user.id, 
        other_user_id, 
        skip, 
        limit
    )
    return messages

@router.delete("/messages/{message_id}", response_model=APIResponse)
async def delete_message(
    message_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Delete a message."""
    message_service = MessageService(db)
    success = message_service.delete_message(message_id, current_user.id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found"
        )
    
    return APIResponse(
        success=True,
        message="Message deleted successfully"
    )

@router.get("/stats/dashboard")
async def get_user_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Get dashboard statistics for the user."""
    user_service = UserService(db)
    stats = user_service.get_dashboard_stats(current_user.id)
    return stats

@router.post("/location/update", response_model=APIResponse)
async def update_location(
    latitude: float,
    longitude: float,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Update user's location."""
    user_service = UserService(db)
    success = user_service.update_location(
        current_user.id, 
        latitude, 
        longitude
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update location"
        )
    
    return APIResponse(
        success=True,
        message="Location updated successfully"
    )

@router.get("/nearby")
async def get_nearby_users(
    radius_miles: float = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Get nearby users for potential food sharing."""
    if not current_user.latitude or not current_user.longitude:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User location not set"
        )
    
    user_service = UserService(db)
    nearby_users = user_service.get_nearby_users(
        current_user.id,
        current_user.latitude,
        current_user.longitude,
        radius_miles
    )
    
    return {"nearby_users": nearby_users}

@router.post("/feedback", response_model=APIResponse)
async def submit_feedback(
    feedback_type: str,
    content: str,
    rating: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Submit user feedback."""
    user_service = UserService(db)
    
    # Validate rating if provided
    if rating is not None and (rating < 1 or rating > 5):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Rating must be between 1 and 5"
        )
    
    success = user_service.submit_feedback(
        current_user.id,
        feedback_type,
        content,
        rating
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to submit feedback"
        )
    
    return APIResponse(
        success=True,
        message="Feedback submitted successfully. Thank you!"
    )

@router.get("/export-data")
async def export_user_data(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Export user's data for GDPR compliance."""
    user_service = UserService(db)
    data = user_service.export_user_data(current_user.id)
    
    return {
        "user_data": data,
        "exported_at": "2025-07-20T12:00:00Z",
        "format": "json"
    }

@router.post("/deactivate", response_model=APIResponse)
async def deactivate_account(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Deactivate user account (soft delete)."""
    user_service = UserService(db)
    success = user_service.deactivate_user(current_user.id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to deactivate account"
        )
    
    return APIResponse(
        success=True,
        message="Account deactivated successfully"
    )

@router.get("/{user_id}/public-profile")
async def get_public_profile(
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Get public profile of another user."""
    user_service = UserService(db)
    profile = user_service.get_public_profile(user_id)
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return profile

@router.post("/{user_id}/block", response_model=APIResponse)
async def block_user(
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Block another user."""
    if user_id == str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot block yourself"
        )
    
    user_service = UserService(db)
    success = user_service.block_user(current_user.id, user_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return APIResponse(
        success=True,
        message="User blocked successfully"
    )

@router.post("/{user_id}/unblock", response_model=APIResponse)
async def unblock_user(
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Unblock a previously blocked user."""
    user_service = UserService(db)
    success = user_service.unblock_user(current_user.id, user_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Block relationship not found"
        )
    
    return APIResponse(
        success=True,
        message="User unblocked successfully"
    )
