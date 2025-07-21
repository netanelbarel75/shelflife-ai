from pydantic_settings import BaseSettings
from typing import List, Union
from pydantic import field_validator
import os

class Settings(BaseSettings):
    """Application settings."""
    
    # App Settings
    APP_NAME: str = "ShelfLife.AI"
    DEBUG: bool = True
    SECRET_KEY: str = "your-super-secret-key-change-in-production"
    PORT: int = 8000
    DEMO_MODE: bool = False
    
    # Database Settings
    DATABASE_URL: str = "postgresql://shelflife_user:shelflife_pass@localhost:5432/shelflife_db"
    
    # Redis Settings
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # CORS Settings - comma-separated string that will be parsed into a list
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:8081,exp://localhost:19000,http://localhost:19006"
    
    # JWT Settings
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    
    # File Upload Settings
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10MB
    UPLOAD_DIR: str = "uploads"
    ALLOWED_EXTENSIONS: str = ".jpg,.jpeg,.png,.pdf"
    
    # External Services
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_REGION: str = "us-east-1"
    S3_BUCKET: str = "shelflife-receipts"
    
    # Tesseract OCR
    TESSERACT_PATH: str = "/usr/bin/tesseract"
    
    # ML Model Settings
    MODEL_PATH: str = "ml-model/models/expiry_model.pkl"
    
    # Notification Settings
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_PHONE_NUMBER: str = ""
    
    # Google OAuth Settings
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/oauth/google/callback"
    
    # Stripe Payment Settings
    STRIPE_PUBLISHABLE_KEY: str = ""
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"  # Ignore extra fields from .env
    
    @field_validator('ALLOWED_ORIGINS', mode='before')
    @classmethod
    def validate_allowed_origins(cls, v):
        """Ensure ALLOWED_ORIGINS is always a string."""
        if isinstance(v, list):
            return ','.join(v)
        return v
    
    @field_validator('ALLOWED_EXTENSIONS', mode='before') 
    @classmethod
    def validate_allowed_extensions(cls, v):
        """Ensure ALLOWED_EXTENSIONS is always a string."""
        if isinstance(v, list):
            return ','.join(v)
        return v
    
    def get_allowed_origins(self) -> List[str]:
        """Parse ALLOWED_ORIGINS as comma-separated string."""
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]
    
    def get_allowed_extensions(self) -> List[str]:
        """Parse ALLOWED_EXTENSIONS as comma-separated string."""
        return [ext.strip() for ext in self.ALLOWED_EXTENSIONS.split(",") if ext.strip()]

settings = Settings()

# Create upload directory if it doesn't exist
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
