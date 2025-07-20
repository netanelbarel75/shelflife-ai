#!/usr/bin/env python3
"""
Database connection test for ShelfLife.AI
"""
import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError

def test_database_connection():
    """Test the database connection"""
    
    # Load environment variables
    database_url = os.getenv(
        "DATABASE_URL", 
        "postgresql://shelflife_user:shelflife_pass@localhost:5432/shelflife_db"
    )
    
    print(f"🧪 Testing database connection...")
    print(f"📍 Database URL: {database_url.replace('shelflife_pass', '***')}")
    
    try:
        # Create engine and test connection
        engine = create_engine(database_url)
        
        with engine.connect() as conn:
            # Test basic query
            result = conn.execute(text("SELECT version();"))
            version = result.fetchone()[0]
            
            print(f"✅ Successfully connected to PostgreSQL!")
            print(f"🔍 PostgreSQL version: {version}")
            
            # Test if we can create a simple table (and drop it)
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS connection_test (
                    id SERIAL PRIMARY KEY,
                    test_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """))
            
            conn.execute(text("INSERT INTO connection_test DEFAULT VALUES;"))
            result = conn.execute(text("SELECT COUNT(*) FROM connection_test;"))
            count = result.fetchone()[0]
            
            conn.execute(text("DROP TABLE connection_test;"))
            conn.commit()
            
            print(f"✅ Database write/read test passed!")
            print(f"🎉 Database is ready for ShelfLife.AI!")
            
            return True
            
    except OperationalError as e:
        print(f"❌ Database connection failed!")
        print(f"💡 Error details: {str(e)}")
        
        if "role" in str(e) and "does not exist" in str(e):
            print("\n🔧 This looks like a role/user issue. Try:")
            print("   1. Start PostgreSQL with Docker: docker-compose up -d postgres")
            print("   2. Or create the user manually if using local PostgreSQL")
            
        elif "database" in str(e) and "does not exist" in str(e):
            print("\n🔧 This looks like a missing database. Try:")
            print("   1. Start PostgreSQL with Docker: docker-compose up -d postgres")
            print("   2. Or create the database manually if using local PostgreSQL")
            
        elif "connection refused" in str(e) or "could not connect" in str(e):
            print("\n🔧 PostgreSQL server is not running. Try:")
            print("   1. Start with Docker: docker-compose up -d postgres")
            print("   2. Or start local PostgreSQL service")
            
        return False
        
    except Exception as e:
        print(f"❌ Unexpected error: {str(e)}")
        return False

if __name__ == "__main__":
    success = test_database_connection()
    sys.exit(0 if success else 1)
