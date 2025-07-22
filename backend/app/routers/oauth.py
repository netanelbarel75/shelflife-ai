# backend/app/routers/oauth.py
from fastapi import APIRouter, Depends, HTTPException, status, Form, Query, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from typing import Any, Optional
import httpx
import json
import logging
from urllib.parse import urlencode, quote

from app.database import get_db
from app.schemas import User, Token, APIResponse, GoogleLoginRequest
from app.services.auth_service import AuthService
from app.services.user_service import UserService
from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/google/login")
async def google_login(
    redirect_uri: Optional[str] = Query(None, description="Frontend redirect URI"),
    platform: Optional[str] = Query("web", description="Platform: web or mobile")
):
    """Initiate Google OAuth2 login flow."""
    google_auth_url = "https://accounts.google.com/o/oauth2/auth"
    
    # Use frontend-provided redirect_uri or fall back to backend default
    actual_redirect_uri = redirect_uri or settings.GOOGLE_REDIRECT_URI
    
    logger.info(f"Initiating Google OAuth for platform: {platform}")
    logger.info(f"Using redirect_uri: {actual_redirect_uri}")
    
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": actual_redirect_uri,
        "scope": "openid profile email",
        "response_type": "code",
        "access_type": "offline",
        "prompt": "consent",
        "state": f"platform:{platform}"  # Include platform info in state
    }
    
    auth_url = f"{google_auth_url}?{urlencode(params)}"
    return {"auth_url": auth_url}

@router.get("/google/callback")
async def google_callback_get(
    code: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    error: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Handle Google OAuth2 callback (GET method for web redirects)."""
    if error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"OAuth error: {error}"
        )
    
    if not code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Authorization code not provided"
        )
    
    try:
        # Extract platform from state
        platform = "web"
        if state and state.startswith("platform:"):
            platform = state.split(":", 1)[1]
        
        logger.info(f"Processing OAuth callback for platform: {platform}")
        
        # For web platform, we need to handle the redirect differently
        # For now, return the authorization code so frontend can exchange it
        if platform == "mobile":
            # For mobile, we'll redirect to a deep link or return JSON
            return {"code": code, "platform": platform}
        else:
            # For web, redirect to frontend with the code
            frontend_callback_url = f"http://localhost:3000/auth/callback?code={code}"
            return RedirectResponse(url=frontend_callback_url)
            
    except Exception as e:
        logger.error(f"Google OAuth callback error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"OAuth callback failed: {str(e)}"
        )

@router.post("/google/callback", response_model=Token)
async def google_callback_post(
    request: Request,
    db: Session = Depends(get_db)
) -> Any:
    """Handle Google OAuth2 callback (accepts both JSON and Form data)."""
    try:
        # Try to parse as JSON first (common for frontend requests)
        try:
            data = await request.json()
            code = data.get('code') or data.get('auth_code')
            redirect_uri = data.get('redirect_uri')
            platform = data.get('platform', 'web')
            code_verifier = data.get('code_verifier')  # PKCE support
            logger.info(f"Parsed JSON data: code={code[:20]}..., redirect_uri={redirect_uri}, platform={platform}, code_verifier={'present' if code_verifier else 'missing'}")
        except Exception:
            # Fall back to form data
            form_data = await request.form()
            code = form_data.get('code') or form_data.get('auth_code')
            redirect_uri = form_data.get('redirect_uri')
            platform = form_data.get('platform', 'web')
            code_verifier = form_data.get('code_verifier')  # PKCE support
            logger.info(f"Parsed form data: code={code[:20] if code else 'None'}..., redirect_uri={redirect_uri}, platform={platform}, code_verifier={'present' if code_verifier else 'missing'}")
        
        if not code:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Authorization code is required"
            )
        
        logger.info(f"Processing OAuth token exchange for platform: {platform}")
        logger.info(f"Using redirect_uri: {redirect_uri}")
        
        # Use the redirect_uri from frontend if provided, otherwise use backend default
        actual_redirect_uri = redirect_uri or settings.GOOGLE_REDIRECT_URI
        
        # Exchange authorization code for access token with PKCE support
        token_data = await exchange_code_for_token(code, actual_redirect_uri, code_verifier)
        
        # Get user info from Google
        user_info = await get_google_user_info(token_data["access_token"])
        
        # Log user info for debugging
        logger.info(f"Google user info received: {list(user_info.keys())}")
        logger.debug(f"Full user info: {user_info}")
        
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
            # Create new user - FIXED: Handle both 'sub' and 'id' fields
            from app.schemas import UserCreate
            
            # Google v2/userinfo endpoint returns 'id', while tokeninfo returns 'sub'
            google_user_id = user_info.get("sub") or user_info.get("id")
            
            if not google_user_id:
                logger.error(f"No user ID found in Google response. Available fields: {list(user_info.keys())}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Google user ID not found in response"
                )
            
            logger.info(f"Creating new user with Google ID: {google_user_id}")
            
            user_create = UserCreate(
                email=user_info["email"],
                username=user_info.get("email", "").split("@")[0],
                full_name=user_info.get("name", ""),
                profile_image_url=user_info.get("picture", ""),
                is_google_user=True
            )
            user = user_service.create_google_user(user_create, google_user_id)
        
        # Create tokens
        access_token = auth_service.create_access_token(str(user.id))
        refresh_token = auth_service.create_refresh_token(str(user.id))
        
        logger.info(f"Successfully authenticated user: {user.email}")
        
        # Convert SQLAlchemy model to Pydantic schema
        user_schema = User.from_orm_with_full_name(user)
        
        return Token(
            access_token=access_token,
            token_type="bearer",
            expires_in=30 * 60,  # 30 minutes
            refresh_token=refresh_token,
            user=user_schema
        )
        
    except Exception as e:
        logger.error(f"Google authentication failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Google authentication failed: {str(e)}"
        )

@router.post("/google/exchange-code", response_model=Token)
async def exchange_authorization_code(
    request: Request,
    db: Session = Depends(get_db)
) -> Any:
    """Exchange authorization code for tokens (accepts both JSON and Form data)."""
    try:
        # Try to parse as JSON first (common for frontend requests)
        try:
            data = await request.json()
            code = data.get('code') or data.get('auth_code')
            redirect_uri = data.get('redirect_uri')
            code_verifier = data.get('code_verifier')  # PKCE support
            logger.info(f"Exchange-code: Parsed JSON data: code={code[:20] if code else 'None'}..., redirect_uri={redirect_uri}, code_verifier={'present' if code_verifier else 'missing'}")
        except Exception:
            # Fall back to form data
            form_data = await request.form()
            code = form_data.get('code') or form_data.get('auth_code')
            redirect_uri = form_data.get('redirect_uri')
            code_verifier = form_data.get('code_verifier')  # PKCE support
            logger.info(f"Exchange-code: Parsed form data: code={code[:20] if code else 'None'}..., redirect_uri={redirect_uri}, code_verifier={'present' if code_verifier else 'missing'}")
        
        if not code:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Authorization code is required"
            )
        
        if not redirect_uri:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Redirect URI is required for token exchange"
            )
        
        logger.info(f"Exchanging authorization code with redirect_uri: {redirect_uri}")
        
        # Exchange authorization code for access token with PKCE support
        token_data = await exchange_code_for_token(code, redirect_uri, code_verifier)
        
        # Get user info from Google
        user_info = await get_google_user_info(token_data["access_token"])
        
        # Log user info structure for debugging
        logger.info(f"Google user info keys: {list(user_info.keys())}")
        logger.debug(f"Full user info: {user_info}")
        
        # Create or get existing user
        user_service = UserService(db)
        auth_service = AuthService(db)
        
        # Check if user exists
        existing_user = user_service.get_user_by_email(user_info["email"])
        
        if existing_user:
            user = existing_user
            # Update profile image if not set
            if not existing_user.profile_image_url and user_info.get("picture"):
                user_service.update_user(existing_user.id, {
                    "profile_image_url": user_info["picture"]
                })
        else:
            # Create new user - FIXED: Handle both 'sub' and 'id' fields
            from app.schemas import UserCreate
            
            # Google v2/userinfo endpoint returns 'id', while tokeninfo returns 'sub'
            google_user_id = user_info.get("sub") or user_info.get("id")
            
            if not google_user_id:
                logger.error(f"No user ID found in Google response. Available fields: {list(user_info.keys())}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Google user ID not found in response"
                )
            
            logger.info(f"Creating new user with Google ID: {google_user_id}")
            
            user_create = UserCreate(
                email=user_info["email"],
                username=user_info.get("email", "").split("@")[0],
                full_name=user_info.get("name", ""),
                profile_image_url=user_info.get("picture", ""),
                is_google_user=True
            )
            user = user_service.create_google_user(user_create, google_user_id)
        
        # Create tokens
        access_token = auth_service.create_access_token(str(user.id))
        refresh_token = auth_service.create_refresh_token(str(user.id))
        
        logger.info(f"Successfully authenticated user via code exchange: {user.email}")
        
        # Convert SQLAlchemy model to Pydantic schema  
        user_schema = User.from_orm_with_full_name(user)
        
        return Token(
            access_token=access_token,
            token_type="bearer",
            expires_in=30 * 60,
            refresh_token=refresh_token,
            user=user_schema
        )
        
    except Exception as e:
        logger.error(f"Code exchange failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Code exchange failed: {str(e)}"
        )

@router.post("/google/mobile", response_model=Token)
async def google_mobile_login(
    login_data: GoogleLoginRequest,
    db: Session = Depends(get_db)
) -> Any:
    """Handle Google login from mobile app with ID token."""
    try:
        logger.info("Processing mobile Google ID token login")
        
        # Verify Google ID token
        user_info = await verify_google_id_token(login_data.id_token)
        
        user_service = UserService(db)
        auth_service = AuthService(db)
        
        # Check if user exists
        existing_user = user_service.get_user_by_email(user_info["email"])
        
        if existing_user:
            user = existing_user
        else:
            # Create new user - tokeninfo returns 'sub' field
            from app.schemas import UserCreate
            
            google_user_id = user_info.get("sub")
            if not google_user_id:
                logger.error(f"No 'sub' field in tokeninfo response. Available fields: {list(user_info.keys())}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Google user ID not found in token"
                )
            
            user_create = UserCreate(
                email=user_info["email"],
                username=user_info.get("email", "").split("@")[0],
                full_name=user_info.get("name", ""),
                profile_image_url=user_info.get("picture", ""),
                is_google_user=True
            )
            user = user_service.create_google_user(user_create, google_user_id)
        
        # Create tokens
        access_token = auth_service.create_access_token(str(user.id))
        refresh_token = auth_service.create_refresh_token(str(user.id))
        
        logger.info(f"Successfully authenticated mobile user: {user.email}")
        
        # Convert SQLAlchemy model to Pydantic schema
        user_schema = User.from_orm_with_full_name(user)
        
        return Token(
            access_token=access_token,
            token_type="bearer",
            expires_in=30 * 60,
            refresh_token=refresh_token,
            user=user_schema
        )
        
    except Exception as e:
        logger.error(f"Mobile Google authentication failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Google authentication failed: {str(e)}"
        )

@router.get("/google/mobile-auth-url")
async def get_mobile_auth_url(
    redirect_uri: str = Query(..., description="Mobile app redirect URI (e.g., exp://localhost:19000)")
):
    """Get Google OAuth URL for mobile apps."""
    google_auth_url = "https://accounts.google.com/o/oauth2/auth"
    
    logger.info(f"Generating mobile auth URL with redirect_uri: {redirect_uri}")
    
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": redirect_uri,
        "scope": "openid profile email",
        "response_type": "code",
        "access_type": "offline",
        "prompt": "consent",
        "state": "platform:mobile"
    }
    
    auth_url = f"{google_auth_url}?{urlencode(params)}"
    return {"auth_url": auth_url, "redirect_uri": redirect_uri}

async def exchange_code_for_token(auth_code: str, redirect_uri: str, code_verifier: str = None) -> dict:
    """Exchange authorization code for access token with PKCE support."""
    token_url = "https://oauth2.googleapis.com/token"
    
    logger.info(f"=== TOKEN EXCHANGE REQUEST ===")
    logger.info(f"Auth code (first 20 chars): {auth_code[:20]}...")
    logger.info(f"Redirect URI: {redirect_uri}")
    logger.info(f"Client ID: {settings.GOOGLE_CLIENT_ID}")
    logger.info(f"Token URL: {token_url}")
    logger.info(f"PKCE code verifier: {'present' if code_verifier else 'missing'}")
    
    data = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "client_secret": settings.GOOGLE_CLIENT_SECRET,
        "code": auth_code,
        "grant_type": "authorization_code",
        "redirect_uri": redirect_uri,
    }
    
    # Add code_verifier for PKCE if available
    if code_verifier:
        data["code_verifier"] = code_verifier
        logger.info(f"Added PKCE code_verifier to token request")
    
    logger.info(f"Request data (without secrets): {dict(data, client_secret='***', code_verifier='***' if code_verifier else 'N/A')}")
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(token_url, data=data, timeout=30.0)  # Add explicit timeout
            
            logger.info(f"Google response status: {response.status_code}")
            logger.info(f"Google response headers: {dict(response.headers)}")
            
            if response.status_code != 200:
                logger.error(f"Token exchange failed: {response.status_code}")
                logger.error(f"Google error response: {response.text}")
                response.raise_for_status()
                
            token_response = response.json()
            logger.info(f"Token exchange successful!")
            return token_response
            
        except httpx.TimeoutException as e:
            logger.error(f"Timeout error calling Google token endpoint: {str(e)}")
            raise Exception(f"Google token request timeout: {str(e)}")
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error from Google: {e.response.status_code} - {e.response.text}")
            raise Exception(f"Google API error: {e.response.status_code} - {e.response.text}")
        except httpx.RequestError as e:
            logger.error(f"Network error calling Google: {str(e)}")
            raise Exception(f"Network error connecting to Google: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected error in token exchange: {type(e).__name__}: {str(e)}")
            raise Exception(f"Token exchange failed: {type(e).__name__}: {str(e)}")

async def get_google_user_info(access_token: str) -> dict:
    """Get user information from Google using access token."""
    # OPTION 1: Use v2/userinfo (returns 'id' field)
    user_info_url = "https://www.googleapis.com/oauth2/v2/userinfo"
    
    # OPTION 2: Use v1/userinfo (returns 'sub' field) - uncomment to use this instead
    # user_info_url = "https://www.googleapis.com/oauth2/v1/userinfo"
    
    headers = {"Authorization": f"Bearer {access_token}"}
    
    async with httpx.AsyncClient() as client:
        response = await client.get(user_info_url, headers=headers)
        response.raise_for_status()
        
        user_info = response.json()
        logger.info(f"Google userinfo response fields: {list(user_info.keys())}")
        
        return user_info

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