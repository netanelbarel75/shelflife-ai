from pydantic_settings import BaseSettings
from typing import List, Union, Optional
from pydantic import field_validator, validator
import os
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

class Settings(BaseSettings):
    """Application settings with improved database configuration support."""
    
    # App Settings
    APP_NAME: str = "ShelfLife.AI"
    DEBUG: bool = True
    SECRET_KEY: str = "your-super-secret-key-change-in-production"
    PORT: int = 8000
    DEMO_MODE: bool = False
    
    # Environment Detection
    ENVIRONMENT: str = "development"  # development, staging, production
    
    # Database Settings with smart defaults
    DATABASE_URL: str = "sqlite:///./shelflife_dev.db"
    DATABASE_TYPE: str = "auto"  # auto, sqlite, postgresql
    
    # PostgreSQL specific settings (used when DATABASE_TYPE is postgresql)
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str = "shelflife_user"
    POSTGRES_PASSWORD: str = "shelflife_pass"
    POSTGRES_DB: str = "shelflife_db"
    
    # SQLite specific settings
    SQLITE_PATH: str = "./shelflife_dev.db"
    
    # Redis Settings
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_ENABLED: bool = False  # Disable Redis by default for simpler development
    
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
    
    # Google OAuth Settings - Enhanced for multi-platform support
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "your-google-client-id")
    GOOGLE_CLIENT_SECRET: str = os.getenv("GOOGLE_CLIENT_SECRET", "your-google-client-secret")
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/oauth/google/callback"  # Default web callback
    
    # Additional mobile redirect URIs (comma-separated)
    GOOGLE_MOBILE_REDIRECT_URIS: str = "exp://localhost:19000,exp://192.168.1.100:19000"
    
    # Stripe Payment Settings
    STRIPE_PUBLISHABLE_KEY: str = ""
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    
    # Logging Settings
    LOG_LEVEL: str = "INFO"
    LOG_FILE: Optional[str] = None
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"  # Ignore extra fields from .env
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._configure_database()
        self._setup_logging()
        self._ensure_directories()
    
    def _configure_database(self):
        """Configure database URL based on settings."""
        # If DATABASE_URL is explicitly set and not the default, use it as-is
        if (hasattr(self, 'DATABASE_URL') and 
            self.DATABASE_URL != "sqlite:///./shelflife_dev.db" and 
            self.DATABASE_URL.strip()):
            logger.info(f"Using explicit DATABASE_URL: {self._mask_db_url(self.DATABASE_URL)}")
            return
        
        # Auto-configure based on DATABASE_TYPE or environment
        if self.DATABASE_TYPE == "postgresql" or (self.DATABASE_TYPE == "auto" and self.ENVIRONMENT == "production"):
            # Use PostgreSQL
            self.DATABASE_URL = (
                f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@"
                f"{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
            )
            logger.info(f"Auto-configured PostgreSQL: {self._mask_db_url(self.DATABASE_URL)}")
        else:
            # Use SQLite (default for development)
            if not self.DATABASE_URL.startswith('sqlite'):
                self.DATABASE_URL = f"sqlite:///{self.SQLITE_PATH}"
            logger.info(f"Using SQLite: {self.DATABASE_URL}")
    
    def _setup_logging(self):
        """Setup logging configuration."""
        log_level = getattr(logging, self.LOG_LEVEL.upper(), logging.INFO)
        
        # Basic logging configuration
        logging.basicConfig(
            level=log_level,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.StreamHandler(),
                logging.FileHandler(self.LOG_FILE) if self.LOG_FILE else logging.NullHandler()
            ]
        )
        
        # Set specific loggers
        logging.getLogger('sqlalchemy.engine').setLevel(
            logging.INFO if self.DEBUG else logging.WARNING
        )
        logging.getLogger('uvicorn').setLevel(logging.INFO)
    
    def _ensure_directories(self):
        """Ensure required directories exist."""
        directories = [self.UPLOAD_DIR]
        
        for directory in directories:
            Path(directory).mkdir(parents=True, exist_ok=True)
    
    def _mask_db_url(self, url: str) -> str:
        """Mask sensitive information in database URL."""
        if '@' in url and ':' in url:
            # Hide password in URLs like postgresql://user:pass@host/db
            import re
            return re.sub(r'://([^:]+):([^@]+)@', r'://\1:***@', url)
        return url
    
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
    
    @field_validator('SECRET_KEY')
    @classmethod
    def validate_secret_key(cls, v):
        """Validate that SECRET_KEY is secure enough."""
        if not v or len(v) < 32:
            logger.warning("SECRET_KEY is too short. Generate a secure key for production!")
        return v
    
    def get_allowed_origins(self) -> List[str]:
        """Parse ALLOWED_ORIGINS as comma-separated string."""
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]
    
    def get_allowed_extensions(self) -> List[str]:
        """Parse ALLOWED_EXTENSIONS as comma-separated string."""
        return [ext.strip() for ext in self.ALLOWED_EXTENSIONS.split(",") if ext.strip()]
    
    def is_sqlite(self) -> bool:
        """Check if using SQLite database."""
        return self.DATABASE_URL.startswith('sqlite')
    
    def is_postgresql(self) -> bool:
        """Check if using PostgreSQL database."""
        return self.DATABASE_URL.startswith('postgresql')
    
    def is_production(self) -> bool:
        """Check if running in production environment."""
        return self.ENVIRONMENT.lower() == 'production'
    
    def is_development(self) -> bool:
        """Check if running in development environment."""
        return self.ENVIRONMENT.lower() == 'development'
    
    def get_database_type(self) -> str:
        """Get the detected database type."""
        if self.is_sqlite():
            return "sqlite"
        elif self.is_postgresql():
            return "postgresql"
        else:
            return "unknown"
    
    def get_google_redirect_uris(self) -> List[str]:
        """Get all valid Google redirect URIs (web + mobile)."""
        uris = [self.GOOGLE_REDIRECT_URI]
        
        if self.GOOGLE_MOBILE_REDIRECT_URIS:
            mobile_uris = [uri.strip() for uri in self.GOOGLE_MOBILE_REDIRECT_URIS.split(",") if uri.strip()]
            uris.extend(mobile_uris)
        
        return uris
    
    def is_valid_google_redirect_uri(self, uri: str) -> bool:
        """Check if a redirect URI is in the allowed list."""
        allowed_uris = self.get_google_redirect_uris()
        
        # Direct match
        if uri in allowed_uris:
            return True
        
        # Pattern matching for development (localhost with any port)
        if uri.startswith("exp://localhost:") or uri.startswith("exp://127.0.0.1:"):
            return True
        if uri.startswith("http://localhost:") and "/auth/callback" in uri:
            return True
            
        return False
    
    def get_config_summary(self) -> dict:
        """Get a summary of current configuration."""
        return {
            'app_name': self.APP_NAME,
            'environment': self.ENVIRONMENT,
            'debug': self.DEBUG,
            'database_type': self.get_database_type(),
            'database_url': self._mask_db_url(self.DATABASE_URL),
            'port': self.PORT,
            'demo_mode': self.DEMO_MODE,
            'redis_enabled': self.REDIS_ENABLED,
            'upload_dir': self.UPLOAD_DIR,
            'max_file_size_mb': self.MAX_FILE_SIZE / (1024 * 1024),
            'google_oauth_enabled': bool(self.GOOGLE_CLIENT_ID != "your-google-client-id"),
            'google_redirect_uris': len(self.get_google_redirect_uris()),
        }

# Global settings instance
settings = Settings()

# Log configuration summary on import
logger.info(f"ShelfLife.AI Configuration Loaded:")
for key, value in settings.get_config_summary().items():
    logger.info(f"  {key}: {value}")

# Log Google OAuth URIs in debug mode
if settings.DEBUG:
    logger.debug(f"Google OAuth Redirect URIs: {settings.get_google_redirect_uris()}")
