#!/usr/bin/env python3
"""
Diagnose pytest and environment issues
"""

import sys
import os
import subprocess

def diagnose_environment():
    """Diagnose the current Python environment"""
    print("🔍 ShelfLife.AI Environment Diagnostics")
    print("=" * 50)
    
    print(f"🐍 Python executable: {sys.executable}")
    print(f"🐍 Python version: {sys.version}")
    print(f"📂 Current working directory: {os.getcwd()}")
    print(f"📦 Python path: {sys.path}")
    
    print("\n📋 Virtual Environment Check:")
    venv_path = os.environ.get('VIRTUAL_ENV')
    if venv_path:
        print(f"✅ Virtual environment active: {venv_path}")
    else:
        print("❌ No virtual environment detected")
    
    print("\n📦 Package Installation Check:")
    try:
        import pydantic_settings
        print(f"✅ pydantic_settings found at: {pydantic_settings.__file__}")
    except ImportError as e:
        print(f"❌ pydantic_settings not found: {e}")
    
    try:
        import fastapi
        print(f"✅ fastapi found at: {fastapi.__file__}")
    except ImportError as e:
        print(f"❌ fastapi not found: {e}")
    
    print("\n🔧 pytest Configuration:")
    try:
        result = subprocess.run([sys.executable, "-m", "pytest", "--version"], 
                              capture_output=True, text=True)
        print(f"✅ pytest version: {result.stdout.strip()}")
    except Exception as e:
        print(f"❌ pytest not found: {e}")
    
    print("\n🧪 Import Test from Current Directory:")
    try:
        sys.path.insert(0, os.getcwd())
        from app.config import settings
        print("✅ Can import app.config.settings")
    except ImportError as e:
        print(f"❌ Cannot import app.config: {e}")

if __name__ == "__main__":
    diagnose_environment()
