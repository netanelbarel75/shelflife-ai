#!/usr/bin/env python3
"""
Custom pytest runner that ensures proper environment setup
"""
import os
import sys
import subprocess
from pathlib import Path

def main():
    # Add current directory to Python path
    current_dir = Path(__file__).parent
    if str(current_dir) not in sys.path:
        sys.path.insert(0, str(current_dir))
    
    # Set environment variables
    os.environ["PYTHONPATH"] = f"{current_dir}:{os.environ.get('PYTHONPATH', '')}"
    
    # Test imports before running pytest
    print("🔍 Pre-test import check...")
    try:
        from pydantic_settings import BaseSettings
        print("✅ pydantic_settings imported successfully")
    except ImportError as e:
        print(f"❌ pydantic_settings import failed: {e}")
        print("💡 Try running: pip install pydantic-settings")
        return 1
    
    try:
        from app.config import settings
        print("✅ app.config imported successfully")
    except ImportError as e:
        print(f"❌ app.config import failed: {e}")
        return 1
    
    print("✅ All imports successful, running tests...")
    
    # Run pytest
    pytest_args = sys.argv[1:] if len(sys.argv) > 1 else ["tests/", "-v"]
    result = subprocess.run(["python3", "-m", "pytest"] + pytest_args)
    
    return result.returncode

if __name__ == "__main__":
    sys.exit(main())
