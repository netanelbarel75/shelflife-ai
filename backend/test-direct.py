#!/usr/bin/env python3

# Direct test of the exact failing import
import sys
import os

print("🔍 Direct Import Test")
print(f"Python: {sys.executable}")
print(f"Virtual Env: {os.environ.get('VIRTUAL_ENV', 'None')}")
print(f"Current Dir: {os.getcwd()}")

# Add current directory to path (this is what pytest needs)
sys.path.insert(0, os.getcwd())

print("\nTesting the exact import chain that fails in pytest...")

try:
    print("1. Testing pydantic_settings...")
    from pydantic_settings import BaseSettings
    print("✅ pydantic_settings imported")
    
    print("2. Testing app.config...")
    from app.config import settings
    print("✅ app.config imported")
    
    print("3. Testing app.database...")
    from app.database import Base
    print("✅ app.database imported")
    
    print("4. Testing app.models...")
    from app.models import InventoryItem, ItemStatus, ItemSource
    print("✅ app.models imported")
    
    print("5. Testing app.services.inventory_service...")
    from app.services.inventory_service import InventoryService
    print("✅ inventory_service imported")
    
    print("\n🎉 All imports successful! The issue might be with pytest's environment.")
    print("Try running: python pytest-runner.py")
    
except ImportError as e:
    print(f"\n❌ Import failed: {e}")
    print("\n🔧 Troubleshooting steps:")
    print("1. Make sure you're in the backend directory")
    print("2. Activate virtual environment: source venv/bin/activate")
    print("3. Install dependencies: pip install -r requirements.txt")
    print("4. Check Python path includes current directory")
