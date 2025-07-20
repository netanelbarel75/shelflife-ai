#!/bin/bash

# Comprehensive test runner for ShelfLife.AI backend
echo "🧪 ShelfLife.AI Backend Test Runner"
echo "==================================="

# Ensure we're in the backend directory
if [ ! -f "main.py" ]; then
    echo "❌ Please run this script from the backend directory"
    exit 1
fi

# Check if virtual environment is activated
if [ -z "$VIRTUAL_ENV" ]; then
    echo "⚠️  Virtual environment not detected. Activating..."
    if [ -d "venv" ]; then
        source venv/bin/activate
        echo "✅ Virtual environment activated"
    else
        echo "❌ No virtual environment found. Please run setup.sh first."
        exit 1
    fi
else
    echo "✅ Virtual environment already active: $VIRTUAL_ENV"
fi

# Run diagnostics
echo ""
echo "🔍 Running environment diagnostics..."
python3 diagnose.py

# Test basic imports first
echo ""
echo "🧪 Testing basic functionality..."
python3 -c "
import sys
import os
sys.path.insert(0, os.getcwd())

print('Testing imports...')
try:
    from pydantic_settings import BaseSettings
    print('✅ pydantic_settings OK')
except ImportError as e:
    print(f'❌ pydantic_settings failed: {e}')
    sys.exit(1)

try:
    from app.config import settings
    print('✅ app.config OK')
except ImportError as e:
    print(f'❌ app.config failed: {e}')
    sys.exit(1)

print('✅ All imports successful!')
"

if [ $? -ne 0 ]; then
    echo "❌ Basic import tests failed. Please check your environment."
    exit 1
fi

# Run pytest with explicit configuration
echo ""
echo "🚀 Running pytest..."
export PYTHONPATH=".:$PYTHONPATH"

# First run the basic test
echo "Running basic tests..."
python3 -m pytest tests/test_basic.py -v

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Basic tests passed! Now running all tests..."
    python3 -m pytest tests/ -v --tb=line
else
    echo "❌ Basic tests failed. Check the output above."
    exit 1
fi

echo ""
echo "🎉 Test run complete!"
