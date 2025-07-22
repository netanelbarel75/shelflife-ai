#!/bin/bash
# test-backend.sh - Quick backend testing script

echo "🔍 Testing ShelfLife.AI Backend Connection..."
echo "========================================"

cd /home/netanelm/shelflife-ai/backend

echo ""
echo "📡 Testing backend server connection..."

# Test if backend is responding
if curl -s http://localhost:8000/health > /dev/null; then
    echo "✅ Backend server is running on port 8000"
    
    # Test the health endpoint
    echo ""
    echo "🏥 Health check response:"
    curl -s http://localhost:8000/health | python -m json.tool
    
    # Test the root endpoint
    echo ""
    echo "🏠 Root endpoint response:"
    curl -s http://localhost:8000/ | python -m json.tool
    
else
    echo "❌ Backend server is not responding on port 8000"
    echo ""
    echo "🚀 Starting backend server..."
    
    # Check if virtual environment exists
    if [ -d "venv" ]; then
        source venv/bin/activate
        echo "✅ Virtual environment activated"
    else
        echo "⚠️ No virtual environment found"
    fi
    
    # Start the server in background
    python main.py &
    SERVER_PID=$!
    echo "🔄 Backend server starting with PID $SERVER_PID"
    
    # Wait a moment for server to start
    sleep 3
    
    # Test connection again
    if curl -s http://localhost:8000/health > /dev/null; then
        echo "✅ Backend server is now running!"
    else
        echo "❌ Backend server failed to start"
        exit 1
    fi
fi

echo ""
echo "👥 Checking if demo data exists..."

# Try to test login with demo credentials
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:8000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email": "demo@shelflife.ai", "password": "demo123"}')

if echo "$LOGIN_RESPONSE" | grep -q "access_token"; then
    echo "✅ Demo user login successful!"
    echo "🎉 Demo data is available"
else
    echo "❌ Demo user not found, creating demo data..."
    echo ""
    echo "🎭 Running demo data creation script..."
    python create_demo_data.py
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ Demo data created successfully!"
        
        # Test login again
        LOGIN_RESPONSE=$(curl -s -X POST http://localhost:8000/api/auth/login \
            -H "Content-Type: application/json" \
            -d '{"email": "demo@shelflife.ai", "password": "demo123"}')
        
        if echo "$LOGIN_RESPONSE" | grep -q "access_token"; then
            echo "✅ Demo user login now working!"
        else
            echo "❌ Demo user login still failing"
            echo "Response: $LOGIN_RESPONSE"
        fi
    else
        echo "❌ Failed to create demo data"
    fi
fi

echo ""
echo "📱 Mobile App API Configuration:"
echo "   API Base URL should be: http://localhost:8000/api"
echo ""
echo "🔑 Demo Login Credentials:"
echo "   Email: demo@shelflife.ai"
echo "   Password: demo123"
echo ""
echo "🌐 API Documentation: http://localhost:8000/docs"
echo "🔗 Test the API endpoints in your browser!"
