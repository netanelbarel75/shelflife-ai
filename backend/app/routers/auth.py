from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from datetime import timedelta
from typing import Any

from app.database import get_db
from app.schemas import (
    UserCreate, User, LoginRequest, Token, APIResponse,
    UserUpdate, UserInDB
)
from app.services.auth_service import AuthService
from app.services.user_service import UserService

router = APIRouter()
security = HTTPBearer()

# Dependency to get current authenticated user
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Dependency to get current authenticated user."""
    auth_service = AuthService(db)
    return auth_service.get_current_user(credentials.credentials)

@router.post("/register", response_model=APIResponse)
async def register(
    user_data: UserCreate,
    db: Session = Depends(get_db)
) -> Any:
    """Register a new user."""
    user_service = UserService(db)
    auth_service = AuthService(db)
    
    # Check if user already exists
    if user_service.get_user_by_email(user_data.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    if user_service.get_user_by_username(user_data.username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )
    
    # Create user
    user = user_service.create_user(user_data)
    
    return APIResponse(
        success=True,
        message="User registered successfully",
        data={"user_id": str(user.id)}
    )

@router.post("/login", response_model=Token)
async def login(
    login_data: LoginRequest,
    db: Session = Depends(get_db)
) -> Any:
    """User login."""
    auth_service = AuthService(db)
    
    # Authenticate user
    user = auth_service.authenticate_user(login_data.email, login_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    
    # Create tokens
    access_token = auth_service.create_access_token(str(user.id))
    refresh_token = auth_service.create_refresh_token(str(user.id))
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        expires_in=30 * 60,  # 30 minutes
        refresh_token=refresh_token
    )

@router.post("/refresh", response_model=Token)
async def refresh_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> Any:
    """Refresh access token."""
    auth_service = AuthService(db)
    
    try:
        # Verify refresh token
        user_id = auth_service.verify_refresh_token(credentials.credentials)
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )
        
        # Create new access token
        access_token = auth_service.create_access_token(user_id)
        
        return Token(
            access_token=access_token,
            token_type="bearer",
            expires_in=30 * 60  # 30 minutes
        )
        
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )

@router.get("/me", response_model=User)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user)
) -> Any:
    """Get current user profile."""
    return current_user

@router.put("/me", response_model=User)
async def update_profile(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Update current user profile."""
    user_service = UserService(db)
    updated_user = user_service.update_user(current_user.id, user_update)
    return updated_user

@router.post("/logout", response_model=APIResponse)
async def logout(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """User logout (blacklist token)."""
    auth_service = AuthService(db)
    
    # Add token to blacklist
    auth_service.blacklist_token(credentials.credentials)
    
    return APIResponse(
        success=True,
        message="Successfully logged out"
    )

@router.delete("/account", response_model=APIResponse)
async def delete_account(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Delete user account."""
    user_service = UserService(db)
    user_service.delete_user(current_user.id)
    
    return APIResponse(
        success=True,
        message="Account deleted successfully"
    )
