# backend/app/routers/oauth.py
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from typing import Any
import httpx
import json
from urllib.parse import urlencode

from app.database import get_db
from app.schemas import User, Token, APIResponse, GoogleLoginRequest
from app.services.auth_service import AuthService
from app.services.user_service import UserService
from app.config import settings

router = APIRouter()

@router.get("/google/login")
async def google_login():
    """Initiate Google OAuth2 login flow."""
    google_auth_url = "https://accounts.google.com/o/oauth2/auth"
    
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "scope": "openid profile email",
        "response_type": "code",
        "access_type": "offline",
        "prompt": "consent"
    }
    
    auth_url = f"{google_auth_url}?{urlencode(params)}"
    return {"auth_url": auth_url}

@router.post("/google/callback", response_model=Token)
async def google_callback(
    auth_code: str,
    db: Session = Depends(get_db)
) -> Any:
    """Handle Google OAuth2 callback and create/login user."""
    try:
        # Exchange authorization code for access token
        token_data = await exchange_code_for_token(auth_code)
        
        # Get user info from Google
        user_info = await get_google_user_info(token_data["access_token"])
        
        # Create or get existing user
        user_service = UserService(db)
        auth_service = AuthService(db)
        
        # Check if user exists
        existing_user = user_service.get_user_by_email(user_info["email"])
        
        if existing_user:
            user = existing_user
            # Update user info from Google if needed
            if not existing_user.profile_image_url and user_info.get("picture"):
                user_service.update_user(existing_user.id, {
                    "profile_image_url": user_info["picture"]
                })
        else:
            # Create new user
            from app.schemas import UserCreate
            user_create = UserCreate(
                email=user_info["email"],
                username=user_info.get("email", "").split("@")[0],
                full_name=user_info.get("name", ""),
                profile_image_url=user_info.get("picture", ""),
                is_google_user=True
            )
            user = user_service.create_google_user(user_create, user_info["sub"])
        
        # Create tokens
        access_token = auth_service.create_access_token(str(user.id))
        refresh_token = auth_service.create_refresh_token(str(user.id))
        
        return Token(
            access_token=access_token,
            token_type="bearer",
            expires_in=30 * 60,  # 30 minutes
            refresh_token=refresh_token,
            user=user
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Google authentication failed: {str(e)}"
        )

@router.post("/google/mobile", response_model=Token)
async def google_mobile_login(
    login_data: GoogleLoginRequest,
    db: Session = Depends(get_db)
) -> Any:
    """Handle Google login from mobile app with ID token."""
    try:
        # Verify Google ID token
        user_info = await verify_google_id_token(login_data.id_token)
        
        user_service = UserService(db)
        auth_service = AuthService(db)
        
        # Check if user exists
        existing_user = user_service.get_user_by_email(user_info["email"])
        
        if existing_user:
            user = existing_user
        else:
            # Create new user
            from app.schemas import UserCreate
            user_create = UserCreate(
                email=user_info["email"],
                username=user_info.get("email", "").split("@")[0],
                full_name=user_info.get("name", ""),
                profile_image_url=user_info.get("picture", ""),
                is_google_user=True
            )
            user = user_service.create_google_user(user_create, user_info["sub"])
        
        # Create tokens
        access_token = auth_service.create_access_token(str(user.id))
        refresh_token = auth_service.create_refresh_token(str(user.id))
        
        return Token(
            access_token=access_token,
            token_type="bearer",
            expires_in=30 * 60,
            refresh_token=refresh_token,
            user=user
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Google authentication failed: {str(e)}"
        )

async def exchange_code_for_token(auth_code: str) -> dict:
    """Exchange authorization code for access token."""
    token_url = "https://oauth2.googleapis.com/token"
    
    data = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "client_secret": settings.GOOGLE_CLIENT_SECRET,
        "code": auth_code,
        "grant_type": "authorization_code",
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(token_url, data=data)
        response.raise_for_status()
        return response.json()

async def get_google_user_info(access_token: str) -> dict:
    """Get user information from Google using access token."""
    user_info_url = "https://www.googleapis.com/oauth2/v2/userinfo"
    headers = {"Authorization": f"Bearer {access_token}"}
    
    async with httpx.AsyncClient() as client:
        response = await client.get(user_info_url, headers=headers)
        response.raise_for_status()
        return response.json()

async def verify_google_id_token(id_token: str) -> dict:
    """Verify Google ID token and return user info."""
    verify_url = f"https://oauth2.googleapis.com/tokeninfo?id_token={id_token}"
    
    async with httpx.AsyncClient() as client:
        response = await client.get(verify_url)
        response.raise_for_status()
        
        token_info = response.json()
        
        # Verify token is for our app
        if token_info.get("aud") != settings.GOOGLE_CLIENT_ID:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid token audience"
            )
        
        return token_info
