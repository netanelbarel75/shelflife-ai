from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from datetime import timedelta
from typing import Any
import logging

from app.database import get_db
from app.models import User as UserModel
from app.schemas import (
    UserCreate, User, LoginRequest, Token, APIResponse,
    UserUpdate, UserInDB
)
from app.services.auth_service import AuthService
from app.services.user_service import UserService

logger = logging.getLogger(__name__)
router = APIRouter()
security = HTTPBearer()

# Dependency to get current authenticated user
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> UserModel:
    """Dependency to get current authenticated user (returns ORM model)."""
    auth_service = AuthService(db)
    return auth_service.get_current_user(credentials.credentials)

@router.post("/register", response_model=APIResponse)
async def register(
    user_data: UserCreate,
    db: Session = Depends(get_db)
) -> Any:
    """Register a new user."""
    try:
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
        logger.info(f"User registered successfully: {user_data.email}")
        
        return APIResponse(
            success=True,
            message="User registered successfully",
            data={"user_id": str(user.id)}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed"
        )

@router.post("/login", response_model=Token)
async def login(
    login_data: LoginRequest,
    db: Session = Depends(get_db)
) -> Any:
    """User login."""
    try:
        auth_service = AuthService(db)
        
        logger.info(f"Login attempt for: {login_data.email}")
        
        # Authenticate user
        user = auth_service.authenticate_user(login_data.email, login_data.password)
        if not user:
            logger.warning(f"Authentication failed for: {login_data.email}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        if not user.is_active:
            logger.warning(f"Inactive user login attempt: {login_data.email}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Account is deactivated"
            )
        
        # Create tokens
        tokens = auth_service.create_user_tokens(user)
        
        # Create user schema with computed full_name
        user_schema = User.from_orm_with_full_name(user)
        
        logger.info(f"Login successful for: {login_data.email}")
        
        return Token(
            access_token=tokens["access_token"],
            token_type="bearer",
            expires_in=tokens["expires_in"],
            refresh_token=tokens["refresh_token"],
            user=user_schema
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed"
        )

@router.post("/refresh", response_model=Token)
async def refresh_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> Any:
    """Refresh access token."""
    try:
        auth_service = AuthService(db)
        
        # Verify refresh token
        user_id = auth_service.verify_refresh_token(credentials.credentials)
        if not user_id:
            logger.warning("Invalid refresh token used")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )
        
        # Create new access token
        access_token = auth_service.create_access_token(user_id)
        
        logger.info(f"Token refreshed for user: {user_id}")
        
        return Token(
            access_token=access_token,
            token_type="bearer",
            expires_in=30 * 60  # 30 minutes
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Token refresh error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token refresh failed"
        )

@router.get("/me", response_model=User)
async def get_current_user_profile(
    current_user: UserModel = Depends(get_current_user)
) -> Any:
    """Get current user profile."""
    try:
        # Convert ORM model to schema with computed full_name
        user_schema = User.from_orm_with_full_name(current_user)
        logger.debug(f"Profile retrieved for user: {current_user.email}")
        return user_schema
        
    except Exception as e:
        logger.error(f"Profile retrieval error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve user profile"
        )

@router.put("/me", response_model=User)
async def update_profile(
    user_update: UserUpdate,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Update current user profile."""
    try:
        user_service = UserService(db)
        updated_user = user_service.update_user(current_user.id, user_update)
        
        if not updated_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        logger.info(f"Profile updated for user: {current_user.email}")
        return User.from_orm_with_full_name(updated_user)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Profile update error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update user profile"
        )

@router.post("/logout", response_model=APIResponse)
async def logout(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> Any:
    """User logout (blacklist token)."""
    try:
        auth_service = AuthService(db)
        
        # Verify token is valid before blacklisting
        user_id = auth_service.verify_token(credentials.credentials)
        if not user_id:
            # Token is already invalid, but we'll still return success
            logger.warning("Logout attempted with invalid token")
            return APIResponse(
                success=True,
                message="Successfully logged out"
            )
        
        # Add token to blacklist
        auth_service.blacklist_token(credentials.credentials)
        
        logger.info(f"User logged out: {user_id}")
        
        return APIResponse(
            success=True,
            message="Successfully logged out"
        )
        
    except Exception as e:
        logger.error(f"Logout error: {e}")
        # Even if there's an error, we should return success for logout
        # to prevent issues with frontend logout flow
        return APIResponse(
            success=True,
            message="Successfully logged out"
        )

@router.delete("/account", response_model=APIResponse)
async def delete_account(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Delete user account."""
    try:
        user_service = UserService(db)
        success = user_service.delete_user(current_user.id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        logger.info(f"Account deleted for user: {current_user.email}")
        
        return APIResponse(
            success=True,
            message="Account deleted successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Account deletion error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete account"
        )

# Health check endpoint for authentication service
@router.get("/health", response_model=APIResponse)
async def auth_health_check(db: Session = Depends(get_db)) -> Any:
    """Check authentication service health."""
    try:
        # Test database connectivity
        db.execute("SELECT 1")
        
        # Test auth service
        auth_service = AuthService(db)
        blacklist_stats = auth_service.get_blacklist_stats()
        
        return APIResponse(
            success=True,
            message="Authentication service healthy",
            data={
                "database": "connected",
                "blacklist_tokens": blacklist_stats["total_blacklisted"],
                "service": "operational"
            }
        )
        
    except Exception as e:
        logger.error(f"Auth health check failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication service unhealthy"
        )
