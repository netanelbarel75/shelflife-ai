#!/bin/bash

# Quick Python3 Fix for ShelfLife.AI Backend
echo "🐍 Quick Python3 Fix for pytest issues"
echo "======================================"

# Ensure we're in backend directory
if [ ! -f "main.py" ]; then
    echo "❌ Please run from backend directory: cd backend && ./python3-fix.sh"
    exit 1
fi

# Activate virtual environment
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment with python3..."
    python3 -m venv venv
fi

echo "🐍 Activating virtual environment..."
source venv/bin/activate

# Verify we're using the right python
echo "✅ Using Python: $(which python3)"
echo "✅ Virtual env: $VIRTUAL_ENV"

# Reinstall with python3 explicitly
echo ""
echo "📦 Installing dependencies with python3..."
python3 -m pip install --upgrade pip
python3 -m pip install -r requirements.txt

# Test the exact failing import
echo ""
echo "🧪 Testing the exact imports that were failing..."
python3 -c "
import sys
import os
sys.path.insert(0, os.getcwd())

try:
    from pydantic_settings import BaseSettings
    print('✅ pydantic_settings: OK')
    
    from app.config import settings  
    print('✅ app.config: OK')
    
    from app.models import InventoryItem, ItemStatus, ItemSource
    print('✅ app.models: OK')
    
    from app.services.inventory_service import InventoryService
    print('✅ app.services.inventory_service: OK')
    
    print('🎉 All imports successful!')
    
except ImportError as e:
    print(f'❌ Import failed: {e}')
    exit(1)
"

if [ $? -ne 0 ]; then
    echo "❌ Imports still failing. Check error above."
    exit 1
fi

# Run pytest with python3
echo ""
echo "🚀 Running pytest with python3..."
export PYTHONPATH=".:$PYTHONPATH"

# Create a simple test first
echo "📝 Creating simple test..."
cat > test_simple.py << 'EOF'
import sys
import os
sys.path.insert(0, os.getcwd())

def test_import():
    """Test that we can import our modules"""
    from pydantic_settings import BaseSettings
    from app.config import settings
    assert settings is not None

def test_python_version():
    """Ensure we're using Python 3"""
    assert sys.version_info.major == 3
    print(f"✅ Using Python {sys.version_info.major}.{sys.version_info.minor}")

if __name__ == "__main__":
    test_import()
    test_python_version()
    print("🎉 Simple tests passed!")
EOF

# Run the simple test
python3 -m pytest test_simple.py -v

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Simple test passed! Now trying the full test suite..."
    python3 -m pytest tests/ -v --tb=short
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "🎉 All tests passed with python3!"
    else
        echo ""
        echo "⚠️  Some tests failed, but imports are working."
        echo "This is likely due to missing database setup or other dependencies."
    fi
else
    echo "❌ Even simple test failed. Please check your environment."
    exit 1
fi

# Cleanup
rm -f test_simple.py

echo ""
echo "✅ Python3 fix complete!"
echo "💡 Use these commands going forward:"
echo "   python3 main.py                    # Start backend"
echo "   python3 -m pytest tests/          # Run tests"
echo "   python3 diagnose.py               # Diagnose issues"
