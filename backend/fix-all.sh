#!/bin/bash

# Comprehensive Backend Fix Script
echo "🔧 ShelfLife.AI Backend Fix Script"
echo "=================================="

# Check if we're in the right directory
if [ ! -f "main.py" ]; then
    echo "❌ Please run this script from the backend directory"
    echo "Usage: cd backend && ./fix-all.sh"
    exit 1
fi

echo "📂 Current directory: $(pwd)"

# Step 1: Clean up any existing issues
echo ""
echo "🧹 Step 1: Cleaning up..."
rm -rf __pycache__/
rm -rf app/__pycache__/
rm -rf tests/__pycache__/
find . -name "*.pyc" -delete
echo "✅ Cleaned up cache files"

# Step 2: Ensure __init__.py files exist
echo ""
echo "📁 Step 2: Creating missing __init__.py files..."
touch app/__init__.py
touch app/routers/__init__.py
touch app/services/__init__.py
touch tests/__init__.py
echo "✅ Created missing __init__.py files"

# Step 3: Virtual environment setup
echo ""
echo "🐍 Step 3: Setting up virtual environment..."
if [ ! -d "venv" ]; then
    echo "Creating new virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate
echo "✅ Virtual environment activated"

# Step 4: Upgrade pip and install dependencies
echo ""
echo "📦 Step 4: Installing dependencies..."
python3 -m pip install --upgrade pip
python3 -m pip install -r requirements.txt
echo "✅ Dependencies installed"

# Step 5: Test imports
echo ""
echo "🧪 Step 5: Testing imports..."
python3 test_imports.py

# Step 6: Run a quick test
echo ""
echo "🔬 Step 6: Running tests..."
python3 -m pytest tests/ -v --tb=short

echo ""
echo "🎉 Backend setup complete!"
echo ""
echo "Next steps:"
echo "1. Start Docker services: ../docker.sh start"
echo "2. Start the backend: python3 main.py"
echo "3. Run tests: python3 -m pytest tests/"
echo "4. View API docs: http://localhost:8000/docs"
