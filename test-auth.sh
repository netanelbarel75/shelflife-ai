#!/bin/bash

# Quick Authentication Test for ShelfLife.AI
echo "🌱 ShelfLife.AI - Quick Authentication Test"
echo "==========================================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_status() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }

echo ""
echo "Starting backend server..."
cd backend

# Quick backend start
if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
else
    print_warning "Creating virtual environment..."
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
fi

# Start backend
python main.py &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

# Wait for server
sleep 3

# Quick backend test
echo ""
echo "Testing backend..."
curl -s http://localhost:8000/api/health > /dev/null
if [ $? -eq 0 ]; then
    print_status "Backend is running on http://localhost:8000"
else
    print_error "Backend failed to start"
    exit 1
fi

echo ""
echo "Starting mobile app..."
cd ../mobile-app

# Start mobile app
npx expo start --web &
EXPO_PID=$!

echo ""
echo "🎯 TESTING CHECKLIST:"
echo "====================="
echo ""
echo "✅ Backend: http://localhost:8000 (running)"
echo "✅ Mobile app: Will open in browser automatically"
echo ""
echo "📱 TEST THESE FEATURES:"
echo "----------------------"
echo "1. Login Screen:"
echo "   - Click 'Use Demo Account' button"
echo "   - Email: demo@shelflife.ai"
echo "   - Password: demo123"
echo "   - Or register a new account"
echo ""
echo "2. After Login:"
echo "   - Navigate to Profile tab"
echo "   - Your name should show (Test User or your registered name)"
echo "   - Click 'Logout' button"
echo "   - Should return to login screen"
echo ""
echo "3. Google Login (Demo Mode):"
echo "   - Click 'Continue with Google'"
echo "   - Should work in demo mode"
echo ""
echo "🚨 PRESS CTRL+C TO STOP ALL SERVERS"
echo ""

# Cleanup function
cleanup() {
    echo ""
    echo "🧹 Stopping servers..."
    [ ! -z "$BACKEND_PID" ] && kill $BACKEND_PID 2>/dev/null && print_status "Backend stopped"
    [ ! -z "$EXPO_PID" ] && kill $EXPO_PID 2>/dev/null && print_status "Expo stopped"
    exit 0
}

trap cleanup EXIT INT TERM

# Keep script running
echo "Servers are running... Press Ctrl+C to stop"
wait
