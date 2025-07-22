#!/bin/bash

# 🌱 ShelfLife.AI - Authentication Fix Test
echo "🌱 ShelfLife.AI - Authentication Fix Test"
echo "========================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m' 
CYAN='\033[0;36m'
NC='\033[0m'

print_status() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }
print_info() { echo -e "${CYAN}ℹ️  $1${NC}"; }

# Check if we're in the right directory
if [ ! -d "backend" ] || [ ! -d "mobile-app" ]; then
    print_error "Please run from shelflife-ai root directory"
    exit 1
fi

echo ""
print_info "WHAT WE FIXED:"
echo "  - Response format mismatch between backend/frontend"
echo "  - User type definitions"
echo "  - Token refresh logic"
echo "  - Logout functionality"
echo ""

# Kill any existing processes
pkill -f "python main.py" 2>/dev/null || true
pkill -f "expo start" 2>/dev/null || true
sleep 2

# Start Backend
echo "🔧 Starting Backend Server..."
cd backend

if [ -d "venv" ]; then
    source venv/bin/activate
else
    print_warning "Creating Python virtual environment..."
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
fi

print_status "Backend environment activated"

# Start backend in background
python main.py &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

# Wait for backend to start
sleep 6

# Test backend health
echo ""
echo "🧪 Testing Backend Health..."
if curl -s http://localhost:8000/api/health > /dev/null; then
    print_status "Backend is running: http://localhost:8000"
else
    print_error "Backend failed to start!"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

# Quick backend auth test
echo ""
echo "🔑 Testing Backend Auth..."
LOGIN_TEST=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "demo@shelflife.ai", "password": "demo123"}')

if echo "$LOGIN_TEST" | grep -q "access_token"; then
    print_status "Backend auth is working"
else
    print_warning "Backend auth test inconclusive"
    echo "Response: $LOGIN_TEST"
fi

# Start Mobile App  
echo ""
echo "📱 Starting Mobile App..."
cd ../mobile-app

# Clear cache
npx expo r -c 2>/dev/null || echo "Cache cleared"

print_status "Mobile app starting..."

echo ""
echo "🎯 TESTING INSTRUCTIONS:"
echo "========================"
echo ""
echo "$(tput bold)CRITICAL TEST: Does login work now?$(tput sgr0)"
echo ""
echo "1. 📱 App should open in browser automatically"
echo "2. 🔐 You should see the LOGIN SCREEN"
echo "3. 🎮 Click 'Use Demo Account' button"
echo "4. ✨ Login form should auto-fill:"
echo "   Email: demo@shelflife.ai"
echo "   Password: demo123"
echo "5. 🚀 Click 'Sign In' button"
echo ""
echo "$(tput bold)EXPECTED RESULT:$(tput sgr0)"
echo "🎉 Should redirect to MAIN APP with bottom tabs"
echo "🚫 Should NOT stay on login screen anymore!"
echo ""
echo "$(tput bold)IF SUCCESS - TEST THESE:$(tput sgr0)"
echo "6. 👤 Click Profile tab (rightmost)"
echo "7. 📧 Should show: Demo Google User / demo.google@shelflife.ai" 
echo "8. 🚪 Scroll down and click 'Logout' button"
echo "9. ✅ Should return to login screen"
echo ""
echo "$(tput bold)IF LOGIN STILL FAILS:$(tput sgr0)"
echo "❌ Press F12 → Console tab → Look for errors"
echo "🔍 Screenshot the error and let me know!"
echo ""
echo "🚨 Press Ctrl+C to stop all servers"
echo ""

# Cleanup function
cleanup() {
    echo ""
    echo "🧹 Cleaning up..."
    [ ! -z "$BACKEND_PID" ] && kill $BACKEND_PID 2>/dev/null && print_status "Backend stopped"
    pkill -f "expo start" 2>/dev/null && print_status "Mobile app stopped"
    exit 0
}

trap cleanup EXIT INT TERM

# Start mobile app
npx expo start --web --clear

# Keep script running
wait
