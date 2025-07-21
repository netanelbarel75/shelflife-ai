from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from app.config import settings
import logging

logger = logging.getLogger(__name__)

# Create SQLAlchemy engine
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=300,
    echo=settings.DEBUG,
)

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create Base class for models
Base = declarative_base()

async def create_tables():
    """Create all database tables if they don't exist."""
    try:
        # Check if tables already exist
        from sqlalchemy import inspect
        inspector = inspect(engine)
        existing_tables = inspector.get_table_names()
        
        if existing_tables:
            logger.info(f"Database tables already exist: {', '.join(existing_tables)}")
            logger.info("Verifying table schema...")
        else:
            logger.info("No existing tables found, creating new database schema...")
        
        # This will create tables only if they don't exist
        Base.metadata.create_all(bind=engine)
        
        # Check what we have now
        updated_tables = inspect(engine).get_table_names()
        
        if not existing_tables and updated_tables:
            logger.info(f"✅ Created {len(updated_tables)} database tables: {', '.join(updated_tables)}")
        elif existing_tables:
            logger.info("✅ Database schema verified - all tables exist")
        else:
            logger.info("✅ Database tables ready")
            
    except Exception as e:
        logger.error(f"Error with database tables: {e}")
        raise

def get_db() -> Session:
    """Dependency to get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
