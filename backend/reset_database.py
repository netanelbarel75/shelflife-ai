#!/usr/bin/env python3

"""
Database reset utility for ShelfLife.AI
This script drops all existing tables and recreates them with the correct schema.
"""

import sys
import os

# Add the current directory to Python path
sys.path.insert(0, os.getcwd())

def reset_database():
    """Reset the database by dropping and recreating all tables."""
    print("🗄️ Resetting ShelfLife.AI Database...")
    
    try:
        from app.config import settings
        from app.database import engine, Base
        
        print(f"📍 Database URL: {settings.DATABASE_URL}")
        
        # Drop all existing tables
        print("🗑️ Dropping existing tables...")
        Base.metadata.drop_all(bind=engine)
        print("✅ Existing tables dropped")
        
        # Create all tables with new schema
        print("🏗️ Creating tables with new schema...")
        Base.metadata.create_all(bind=engine)
        print("✅ All tables created successfully")
        
        print("\n🎉 Database reset completed successfully!")
        print("🚀 You can now start the application.")
        
    except Exception as e:
        print(f"❌ Database reset failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    reset_database()
