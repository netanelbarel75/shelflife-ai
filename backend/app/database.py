from sqlalchemy import create_engine, event, inspect
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool
from app.config import settings
import logging
import os
from pathlib import Path

logger = logging.getLogger(__name__)

def get_database_config():
    """Get database configuration based on DATABASE_URL."""
    db_url = settings.DATABASE_URL
    config = {
        'url': db_url,
        'echo': settings.DEBUG,
        'pool_pre_ping': True,
        'pool_recycle': 300,
    }
    
    if db_url.startswith('sqlite'):
        # SQLite-specific configuration
        config.update({
            'poolclass': StaticPool,
            'connect_args': {
                'check_same_thread': False,
                'timeout': 20,
            }
        })
        
        # Ensure SQLite database directory exists
        db_path = db_url.replace('sqlite:///', '').replace('sqlite:///', '')
        if db_path and not db_path.startswith(':memory:'):
            db_dir = Path(db_path).parent
            db_dir.mkdir(parents=True, exist_ok=True)
            logger.info(f"SQLite database directory ensured: {db_dir}")
    
    elif db_url.startswith('postgresql'):
        # PostgreSQL-specific configuration
        config.update({
            'pool_size': 10,
            'max_overflow': 20,
            'pool_timeout': 30,
        })
    
    return config

# Create SQLAlchemy engine with appropriate configuration
engine_config = get_database_config()
engine = create_engine(**engine_config)

# SQLite-specific optimizations
if settings.DATABASE_URL.startswith('sqlite'):
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        """Set SQLite pragma settings for better performance and consistency."""
        cursor = dbapi_connection.cursor()
        
        # Enable foreign key constraints
        cursor.execute("PRAGMA foreign_keys=ON")
        
        # Set WAL mode for better concurrent access
        cursor.execute("PRAGMA journal_mode=WAL")
        
        # Set synchronous mode for better performance
        cursor.execute("PRAGMA synchronous=NORMAL")
        
        # Set cache size (negative value means KB)
        cursor.execute("PRAGMA cache_size=-64000")  # 64MB cache
        
        # Set temp store to memory
        cursor.execute("PRAGMA temp_store=MEMORY")
        
        # Enable memory-mapped I/O
        cursor.execute("PRAGMA mmap_size=268435456")  # 256MB
        
        cursor.close()
        logger.debug("SQLite pragma settings applied")

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create Base class for models
Base = declarative_base()

def get_database_info():
    """Get database information for logging/debugging."""
    try:
        with engine.connect() as conn:
            if settings.DATABASE_URL.startswith('sqlite'):
                result = conn.execute("SELECT sqlite_version()").fetchone()
                return f"SQLite {result[0]}"
            elif settings.DATABASE_URL.startswith('postgresql'):
                result = conn.execute("SELECT version()").fetchone()
                return f"PostgreSQL {result[0].split()[1]}"
            else:
                return "Unknown database"
    except Exception as e:
        return f"Database info unavailable: {e}"

async def create_tables():
    """Create all database tables if they don't exist."""
    try:
        # Check if tables already exist
        inspector = inspect(engine)
        existing_tables = inspector.get_table_names()
        
        if existing_tables:
            logger.info(f"Database tables already exist: {', '.join(sorted(existing_tables))}")
            logger.info("Verifying table schema...")
        else:
            logger.info("No existing tables found, creating new database schema...")
        
        # Import all models to ensure they're registered with Base
        from app.models import (
            User, Receipt, InventoryItem, MarketplaceListing, 
            Message, ShelfLifeData, Order
        )
        
        # This will create tables only if they don't exist
        Base.metadata.create_all(bind=engine)
        
        # Check what we have now
        updated_tables = inspect(engine).get_table_names()
        
        if not existing_tables and updated_tables:
            logger.info(f"✅ Created {len(updated_tables)} database tables: {', '.join(sorted(updated_tables))}")
        elif existing_tables:
            logger.info("✅ Database schema verified - all tables exist")
            
            # Log table counts for verification
            try:
                with engine.connect() as conn:
                    for table in updated_tables:
                        count_result = conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()
                        count = count_result[0] if count_result else 0
                        logger.debug(f"   Table '{table}': {count} records")
            except Exception as e:
                logger.debug(f"Could not get table counts: {e}")
        else:
            logger.info("✅ Database tables ready")
        
        # Log database information
        db_info = get_database_info()
        logger.info(f"Database: {db_info}")
        logger.info(f"Database URL: {settings.DATABASE_URL.split('@')[0] + '@***' if '@' in settings.DATABASE_URL else settings.DATABASE_URL}")
            
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

async def check_database_health():
    """Check database health and connectivity."""
    try:
        with engine.connect() as conn:
            # Simple connectivity test
            if settings.DATABASE_URL.startswith('sqlite'):
                result = conn.execute("SELECT 1").fetchone()
            elif settings.DATABASE_URL.startswith('postgresql'):
                result = conn.execute("SELECT 1").fetchone()
            else:
                result = conn.execute("SELECT 1").fetchone()
            
            return {
                'status': 'healthy',
                'database': get_database_info(),
                'url_masked': settings.DATABASE_URL.split('@')[0] + '@***' if '@' in settings.DATABASE_URL else settings.DATABASE_URL
            }
    except Exception as e:
        return {
            'status': 'unhealthy',
            'error': str(e),
            'database': 'unavailable'
        }

def reset_database():
    """Drop and recreate all database tables. Use with caution!"""
    try:
        logger.warning("🚨 DROPPING ALL DATABASE TABLES...")
        
        # Import all models first
        from app.models import (
            User, Receipt, InventoryItem, MarketplaceListing, 
            Message, ShelfLifeData, Order
        )
        
        # Drop all tables
        Base.metadata.drop_all(bind=engine)
        logger.info("✅ All tables dropped")
        
        # Recreate all tables
        Base.metadata.create_all(bind=engine)
        logger.info("✅ All tables recreated")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Database reset failed: {e}")
        raise

# Database connection pool information
def get_pool_status():
    """Get database connection pool status."""
    if hasattr(engine.pool, 'size'):
        return {
            'pool_size': engine.pool.size(),
            'checked_in': engine.pool.checkedin(),
            'checked_out': engine.pool.checkedout(),
        }
    return {'status': 'Pool information not available'}
