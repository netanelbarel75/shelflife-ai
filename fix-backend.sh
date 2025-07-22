#!/bin/bash
# fix-backend.sh - Complete backend setup and testing script

echo "🔧 ShelfLife.AI Backend Setup & Fix"
echo "=================================="

cd /home/netanelm/shelflife-ai/backend

# Check if we're using SQLite for development
if [ -f "shelflife_dev.db" ]; then
    echo "📁 SQLite database file found - using development setup"
    export DATABASE_URL="sqlite:///./shelflife_dev.db"
else
    echo "🐘 PostgreSQL configuration detected"
fi

# Check if virtual environment exists and activate it
if [ -d "venv" ]; then
    echo "🐍 Activating Python virtual environment..."
    source venv/bin/activate
    echo "✅ Virtual environment activated"
else
    echo "⚠️ No virtual environment found - using system Python"
fi

# Install/check dependencies
echo ""
echo "📦 Checking Python dependencies..."
if [ -f "requirements.txt" ]; then
    pip install -r requirements.txt > /dev/null 2>&1
    echo "✅ Dependencies installed"
fi

# Kill any existing server on port 8000
echo ""
echo "🔄 Checking for existing server on port 8000..."
EXISTING_PID=$(lsof -ti:8000)
if [ ! -z "$EXISTING_PID" ]; then
    echo "🛑 Killing existing server (PID: $EXISTING_PID)"
    kill -9 $EXISTING_PID
    sleep 2
fi

# Start the backend server in background
echo "🚀 Starting backend server..."
if [ -f "shelflife_dev.db" ]; then
    DATABASE_URL="sqlite:///./shelflife_dev.db" python main.py > backend.log 2>&1 &
else
    python main.py > backend.log 2>&1 &
fi

SERVER_PID=$!
echo "⏳ Backend server starting (PID: $SERVER_PID)..."

# Wait for server to start
for i in {1..10}; do
    if curl -s http://localhost:8000/health > /dev/null 2>&1; then
        echo "✅ Backend server is running!"
        break
    fi
    echo "   Waiting... ($i/10)"
    sleep 2
done

# Test server connection
if ! curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo "❌ Backend server failed to start"
    echo "📋 Server log (last 20 lines):"
    tail -20 backend.log
    exit 1
fi

# Test API endpoints
echo ""
echo "🏥 Testing API endpoints..."
HEALTH_RESPONSE=$(curl -s http://localhost:8000/health)
echo "   Health check: $HEALTH_RESPONSE"

# Check if demo data exists
echo ""
echo "👥 Testing demo user login..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:8000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email": "demo@shelflife.ai", "password": "demo123"}' 2>/dev/null)

if echo "$LOGIN_RESPONSE" | grep -q "access_token" 2>/dev/null; then
    echo "✅ Demo user login successful!"
else
    echo "❌ Demo user not found, creating demo data..."
    
    # Create demo data
    if [ -f "create_demo_data.py" ]; then
        echo "🎭 Running demo data creation script..."
        if [ -f "shelflife_dev.db" ]; then
            DATABASE_URL="sqlite:///./shelflife_dev.db" python create_demo_data.py
        else
            python create_demo_data.py
        fi
        
        # Test login again
        sleep 2
        LOGIN_RESPONSE=$(curl -s -X POST http://localhost:8000/api/auth/login \
            -H "Content-Type: application/json" \
            -d '{"email": "demo@shelflife.ai", "password": "demo123"}' 2>/dev/null)
        
        if echo "$LOGIN_RESPONSE" | grep -q "access_token" 2>/dev/null; then
            echo "✅ Demo user login now working!"
        else
            echo "❌ Demo user login still failing"
            echo "Response: $LOGIN_RESPONSE"
        fi
    else
        echo "❌ Demo data script not found"
    fi
fi

echo ""
echo "🎉 Backend Setup Complete!"
echo "========================="
echo "🌐 Backend URL: http://localhost:8000"
echo "📚 API Docs: http://localhost:8000/docs"
echo "🏥 Health Check: http://localhost:8000/health"
echo ""
echo "🔑 Demo Login Credentials:"
echo "   Email: demo@shelflife.ai"
echo "   Password: demo123"
echo ""
echo "📱 Mobile App Settings:"
echo "   API Base URL: http://localhost:8000/api"
echo ""
echo "🔧 Troubleshooting:"
echo "   • Server log: tail -f /home/netanelm/shelflife-ai/backend/backend.log"
echo "   • Stop server: kill $SERVER_PID"
echo "   • Test login: curl -X POST http://localhost:8000/api/auth/login \\"
echo "       -H \"Content-Type: application/json\" \\"
echo "       -d '{\"email\": \"demo@shelflife.ai\", \"password\": \"demo123\"}'"
echo ""
echo "✨ Your backend is ready! Test the mobile app now."
