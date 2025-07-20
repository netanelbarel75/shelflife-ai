#!/bin/bash

# Fix backend dependencies
echo "🔧 Fixing backend Python dependencies..."

cd backend

# Check if we're in the project root
if [ ! -f "main.py" ]; then
    echo "❌ Please run this script from the backend directory"
    exit 1
fi

# Activate virtual environment
if [ ! -d "venv" ]; then
    echo "📦 Creating Python virtual environment..."
    python3 -m venv venv
fi

echo "🐍 Activating virtual environment..."
source venv/bin/activate

# Upgrade pip first
echo "📈 Upgrading pip..."
pip install --upgrade pip

# Install requirements
echo "📦 Installing Python dependencies..."
pip install -r requirements.txt

# Verify key packages
echo "🔍 Verifying key packages..."
python -c "import pydantic_settings; print('✅ pydantic_settings imported successfully')" || echo "❌ pydantic_settings import failed"
python -c "import fastapi; print('✅ FastAPI imported successfully')" || echo "❌ FastAPI import failed"
python -c "import sqlalchemy; print('✅ SQLAlchemy imported successfully')" || echo "❌ SQLAlchemy import failed"

# Test if we can import our app modules
echo "🧪 Testing app imports..."
python -c "from app.config import settings; print('✅ Config imported successfully')" || echo "❌ Config import failed"
python -c "from app.database import Base; print('✅ Database imported successfully')" || echo "❌ Database import failed"

echo ""
echo "✅ Backend dependencies setup complete!"
echo "🚀 You can now run the backend with: python main.py"
echo "🧪 Or run tests with: python -m pytest tests/"
