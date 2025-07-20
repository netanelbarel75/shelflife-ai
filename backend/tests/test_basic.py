import os
import sys

def test_basic_imports():
    """Test basic Python imports"""
    try:
        import pytest
        assert pytest is not None
        print("✅ pytest imported successfully")
    except ImportError:
        assert False, "pytest not available"

def test_pydantic_settings():
    """Test pydantic_settings import"""
    try:
        from pydantic_settings import BaseSettings
        assert BaseSettings is not None
        print("✅ pydantic_settings imported successfully")
    except ImportError as e:
        assert False, f"pydantic_settings import failed: {e}"

def test_environment():
    """Test environment setup"""
    # Check if we're in the right directory
    assert os.path.exists("main.py"), "main.py not found - are we in the backend directory?"
    assert os.path.exists("app"), "app directory not found"
    assert os.path.exists("app/config.py"), "app/config.py not found"
    print("✅ Directory structure verified")

def test_python_path():
    """Test Python path configuration"""
    current_dir = os.getcwd()
    assert current_dir in sys.path or any(current_dir in p for p in sys.path), \
        "Current directory not in Python path"
    print(f"✅ Python path includes: {current_dir}")

if __name__ == "__main__":
    test_basic_imports()
    test_pydantic_settings()
    test_environment()
    test_python_path()
    print("🎉 All basic tests passed!")
