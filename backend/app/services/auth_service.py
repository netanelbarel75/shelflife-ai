from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional, Set
from jose import JWTError, jwt
from passlib.context import CryptContext
import uuid
import logging

from app.models import User
from app.schemas import UserCreate, UserInDB
from app.config import settings

logger = logging.getLogger(__name__)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class AuthService:
    def __init__(self, db: Session):
        self.db = db
        # In-memory token blacklist (in production, use Redis or database)
        self._blacklisted_tokens: Set[str] = set()

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash."""
        try:
            return pwd_context.verify(plain_password, hashed_password)
        except Exception as e:
            logger.error(f"Password verification failed: {e}")
            return False

    def get_password_hash(self, password: str) -> str:
        """Hash a password."""
        return pwd_context.hash(password)

    def authenticate_user(self, email: str, password: str) -> Optional[User]:
        """Authenticate user by email and password."""
        try:
            logger.info(f"Attempting to authenticate user: {email}")
            user = self.db.query(User).filter(User.email == email).first()
            
            if not user:
                logger.warning(f"User not found: {email}")
                return None
                
            if not self.verify_password(password, user.hashed_password):
                logger.warning(f"Invalid password for user: {email}")
                return None
                
            if not user.is_active:
                logger.warning(f"Inactive user attempted login: {email}")
                return None
                
            logger.info(f"User authenticated successfully: {email}")
            return user
            
        except Exception as e:
            logger.error(f"Authentication error for {email}: {e}")
            return None

    def create_access_token(self, user_id: str, expires_delta: Optional[timedelta] = None) -> str:
        """Create an access token."""
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(
                minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
            )
        
        to_encode = {
            "sub": str(user_id),  # Ensure string conversion
            "exp": expire,
            "type": "access",
            "iat": datetime.utcnow(),
        }
        
        try:
            encoded_jwt = jwt.encode(
                to_encode, 
                settings.SECRET_KEY, 
                algorithm=settings.JWT_ALGORITHM
            )
            logger.debug(f"Access token created for user: {user_id}")
            return encoded_jwt
        except Exception as e:
            logger.error(f"Failed to create access token: {e}")
            raise

    def create_refresh_token(self, user_id: str) -> str:
        """Create a refresh token."""
        expire = datetime.utcnow() + timedelta(
            days=settings.REFRESH_TOKEN_EXPIRE_DAYS
        )
        to_encode = {
            "sub": str(user_id),  # Ensure string conversion
            "exp": expire,
            "type": "refresh",
            "iat": datetime.utcnow(),
        }
        
        try:
            encoded_jwt = jwt.encode(
                to_encode, 
                settings.SECRET_KEY, 
                algorithm=settings.JWT_ALGORITHM
            )
            logger.debug(f"Refresh token created for user: {user_id}")
            return encoded_jwt
        except Exception as e:
            logger.error(f"Failed to create refresh token: {e}")
            raise

    def verify_token(self, token: str) -> Optional[str]:
        """Verify a token and return user_id if valid."""
        if self.is_token_blacklisted(token):
            logger.warning("Attempted to use blacklisted token")
            return None
        
        try:
            payload = jwt.decode(
                token, 
                settings.SECRET_KEY, 
                algorithms=[settings.JWT_ALGORITHM]
            )
            
            # Check token type (should be access for regular verification)
            token_type: str = payload.get("type")
            if token_type != "access":
                logger.warning(f"Invalid token type: {token_type}")
                return None
            
            user_id: str = payload.get("sub")
            if user_id is None:
                logger.warning("Token missing subject (user_id)")
                return None
                
            return str(user_id)  # Ensure string return
            
        except JWTError as e:
            logger.warning(f"JWT verification failed: {e}")
            return None
        except Exception as e:
            logger.error(f"Token verification error: {e}")
            return None

    def verify_refresh_token(self, token: str) -> Optional[str]:
        """Verify a refresh token and return user_id if valid."""
        if self.is_token_blacklisted(token):
            logger.warning("Attempted to use blacklisted refresh token")
            return None
        
        try:
            payload = jwt.decode(
                token, 
                settings.SECRET_KEY, 
                algorithms=[settings.JWT_ALGORITHM]
            )
            
            token_type: str = payload.get("type")
            if token_type != "refresh":
                logger.warning(f"Invalid refresh token type: {token_type}")
                return None
                
            user_id: str = payload.get("sub")
            if user_id is None:
                logger.warning("Refresh token missing subject (user_id)")
                return None
                
            return str(user_id)  # Ensure string return
            
        except JWTError as e:
            logger.warning(f"Refresh token verification failed: {e}")
            return None
        except Exception as e:
            logger.error(f"Refresh token verification error: {e}")
            return None

    def get_current_user(self, token: str) -> User:
        """Get current user from token."""
        user_id = self.verify_token(token)
        if user_id is None:
            from fastapi import HTTPException, status
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        try:
            # Convert string UUID to UUID object for query if needed
            if isinstance(user_id, str):
                try:
                    user_uuid = uuid.UUID(user_id)
                    user = self.db.query(User).filter(User.id == user_uuid).first()
                except ValueError:
                    # If it's not a valid UUID string, try as string
                    user = self.db.query(User).filter(User.id == user_id).first()
            else:
                user = self.db.query(User).filter(User.id == user_id).first()
                
            if user is None:
                logger.warning(f"User not found for ID: {user_id}")
                from fastapi import HTTPException, status
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="User not found",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            
            if not user.is_active:
                logger.warning(f"Inactive user attempted access: {user_id}")
                from fastapi import HTTPException, status
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Inactive user",
                    headers={"WWW-Authenticate": "Bearer"},
                )
                
            return user
            
        except Exception as e:
            logger.error(f"Error getting current user: {e}")
            from fastapi import HTTPException, status
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication error",
                headers={"WWW-Authenticate": "Bearer"},
            )

    def blacklist_token(self, token: str) -> None:
        """Add token to blacklist."""
        try:
            self._blacklisted_tokens.add(token)
            logger.info("Token successfully blacklisted")
        except Exception as e:
            logger.error(f"Failed to blacklist token: {e}")

    def is_token_blacklisted(self, token: str) -> bool:
        """Check if token is blacklisted."""
        return token in self._blacklisted_tokens

    def get_token_payload(self, token: str) -> Optional[dict]:
        """Get token payload without verification (for debugging)."""
        try:
            # Decode without verification (use with caution)
            payload = jwt.decode(
                token, 
                options={"verify_signature": False}
            )
            return payload
        except Exception as e:
            logger.error(f"Failed to decode token payload: {e}")
            return None

    def is_token_expired(self, token: str) -> bool:
        """Check if token is expired."""
        payload = self.get_token_payload(token)
        if not payload:
            return True
            
        exp = payload.get("exp")
        if not exp:
            return True
            
        return datetime.utcnow().timestamp() > exp

    def cleanup_expired_blacklisted_tokens(self) -> None:
        """Clean up expired tokens from blacklist to prevent memory leaks."""
        expired_tokens = set()
        
        for token in self._blacklisted_tokens:
            if self.is_token_expired(token):
                expired_tokens.add(token)
        
        self._blacklisted_tokens -= expired_tokens
        
        if expired_tokens:
            logger.info(f"Cleaned up {len(expired_tokens)} expired blacklisted tokens")

    def get_blacklist_stats(self) -> dict:
        """Get statistics about blacklisted tokens (for debugging)."""
        return {
            "total_blacklisted": len(self._blacklisted_tokens),
            "memory_usage_estimate": len(self._blacklisted_tokens) * 200  # rough estimate in bytes
        }

    def create_user_tokens(self, user: User) -> dict:
        """Create both access and refresh tokens for a user."""
        try:
            access_token = self.create_access_token(str(user.id))
            refresh_token = self.create_refresh_token(str(user.id))
            
            return {
                "access_token": access_token,
                "refresh_token": refresh_token,
                "token_type": "bearer",
                "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60  # in seconds
            }
        except Exception as e:
            logger.error(f"Failed to create user tokens: {e}")
            raise

    def revoke_all_user_tokens(self, user_id: str) -> None:
        """Revoke all tokens for a user (useful for security incidents)."""
        # In a real implementation, you might store user token versions
        # and increment the version to invalidate all existing tokens
        logger.info(f"Token revocation requested for user: {user_id}")
        # For now, just log it
        pass
