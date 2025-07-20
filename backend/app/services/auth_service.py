from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext

from app.models import User
from app.schemas import UserCreate, UserInDB
from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class AuthService:
    def __init__(self, db: Session):
        self.db = db
        self.blacklisted_tokens = set()  # In production, use Redis

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash."""
        return pwd_context.verify(plain_password, hashed_password)

    def get_password_hash(self, password: str) -> str:
        """Hash a password."""
        return pwd_context.hash(password)

    def authenticate_user(self, email: str, password: str) -> Optional[User]:
        """Authenticate user by email and password."""
        user = self.db.query(User).filter(User.email == email).first()
        if not user or not self.verify_password(password, user.hashed_password):
            return None
        return user

    def create_access_token(self, user_id: str) -> str:
        """Create an access token."""
        expire = datetime.utcnow() + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
        to_encode = {
            "sub": user_id,
            "exp": expire,
            "type": "access"
        }
        return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

    def create_refresh_token(self, user_id: str) -> str:
        """Create a refresh token."""
        expire = datetime.utcnow() + timedelta(
            days=settings.REFRESH_TOKEN_EXPIRE_DAYS
        )
        to_encode = {
            "sub": user_id,
            "exp": expire,
            "type": "refresh"
        }
        return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

    def verify_token(self, token: str) -> Optional[str]:
        """Verify a token and return user_id if valid."""
        if token in self.blacklisted_tokens:
            return None
        
        try:
            payload = jwt.decode(
                token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
            )
            user_id: str = payload.get("sub")
            if user_id is None:
                return None
            return user_id
        except JWTError:
            return None

    def verify_refresh_token(self, token: str) -> Optional[str]:
        """Verify a refresh token and return user_id if valid."""
        if token in self.blacklisted_tokens:
            return None
        
        try:
            payload = jwt.decode(
                token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
            )
            token_type: str = payload.get("type")
            if token_type != "refresh":
                return None
            user_id: str = payload.get("sub")
            if user_id is None:
                return None
            return user_id
        except JWTError:
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
        
        user = self.db.query(User).filter(User.id == user_id).first()
        if user is None:
            from fastapi import HTTPException, status
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        return user

    def blacklist_token(self, token: str):
        """Add token to blacklist."""
        self.blacklisted_tokens.add(token)

    def is_token_blacklisted(self, token: str) -> bool:
        """Check if token is blacklisted."""
        return token in self.blacklisted_tokens
