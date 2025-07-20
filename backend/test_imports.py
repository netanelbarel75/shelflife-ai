#!/usr/bin/env python3
"""
Simple verification script to test backend imports
"""

def test_imports():
    """Test all critical imports"""
    try:
        print("🧪 Testing backend imports...")
        
        # Test pydantic settings
        from pydantic_settings import BaseSettings
        print("✅ pydantic_settings imported successfully")
        
        # Test FastAPI
        import fastapi
        print("✅ FastAPI imported successfully")
        
        # Test our config
        from app.config import settings
        print("✅ App config imported successfully")
        
        # Test database
        from app.database import Base
        print("✅ Database imported successfully")
        
        # Test models
        from app.models import User, InventoryItem
        print("✅ Models imported successfully")
        
        # Test services
        from app.services.inventory_service import InventoryService
        print("✅ Services imported successfully")
        
        print("\n🎉 All imports successful! Backend is ready.")
        return True
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

if __name__ == "__main__":
    success = test_imports()
    exit(0 if success else 1)
