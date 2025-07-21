#!/bin/bash

# ShelfLife.AI Backend Startup Script
echo "🚀 Starting ShelfLife.AI Backend..."

# Navigate to backend directory
cd "$(dirname "$0")"

# Activate virtual environment
echo "📦 Activating virtual environment..."
source venv/bin/activate

# Test configuration first
echo "🔧 Testing configuration..."
python3 test_config.py

# If configuration test passes, reset database and start the application
if [ $? -eq 0 ]; then
    echo "✅ Configuration test passed!"
    
    # Reset database to ensure clean schema
    echo "🗄️ Resetting database schema..."
    python3 reset_database.py
    
    if [ $? -eq 0 ]; then
        echo "✅ Database reset successful! Starting the application..."
        echo "🌐 The API will be available at: http://localhost:8000"
        echo "📖 API documentation will be available at: http://localhost:8000/docs"
        echo ""
        python3 main.py
    else
        echo "❌ Database reset failed. Please check the error messages above."
        exit 1
    fi
else
    echo "❌ Configuration test failed. Please check your .env file."
    exit 1
fi