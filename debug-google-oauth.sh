#!/bin/bash

# Debug Google OAuth Flow
echo "🔐 Debug Google OAuth Flow"
echo "=========================="

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

# Check configuration
echo ""
echo "🔍 CHECKING GOOGLE OAUTH CONFIGURATION:"
echo "======================================="
echo ""

# Backend config
print_info "Backend Configuration:"
if [ -f "backend/.env" ]; then
    echo "GOOGLE_CLIENT_ID=$(grep '^GOOGLE_CLIENT_ID=' backend/.env | cut -d'=' -f2)"
    echo "GOOGLE_CLIENT_SECRET=$(grep '^GOOGLE_CLIENT_SECRET=' backend/.env | cut -d'=' -f2 | cut -c1-10)..."
    echo "GOOGLE_REDIRECT_URI=$(grep '^GOOGLE_REDIRECT_URI=' backend/.env | cut -d'=' -f2)"
else
    print_error "Backend .env not found"
fi

echo ""
print_info "Mobile App Configuration:"
if [ -f "mobile-app/src/config/oauth.ts" ]; then
    echo "OAuth config file exists"
    if grep -q "demo-client-id" mobile-app/src/config/oauth.ts; then
        print_warning "Still contains demo-client-id references"
    else
        print_status "Real OAuth configuration detected"
    fi
else
    print_error "Mobile oauth.ts not found"
fi

echo ""
print_info "Testing backend OAuth endpoint..."

# Test backend OAuth endpoint
if curl -s http://localhost:8000/api/oauth/google/login > /dev/null; then
    print_status "Backend OAuth endpoint accessible"
else
    print_warning "Backend may not be running or OAuth endpoint not accessible"
fi

# Kill any existing processes
pkill -f "python main.py" 2>/dev/null || true
pkill -f "expo start" 2>/dev/null || true
sleep 2

# Start backend with logging
echo ""
print_info "Starting backend with enhanced logging..."
cd backend

if [ -d "venv" ]; then
    source venv/bin/activate
else
    print_error "Backend venv not found"
    exit 1
fi

# Start backend in background
python main.py &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

sleep 4

# Test backend health
if curl -s http://localhost:8000/api/health > /dev/null; then
    print_status "Backend is running"
else
    print_error "Backend failed to start"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

# Start mobile app
echo ""
print_info "Starting mobile app with debug console..."
cd ../mobile-app

# Clear cache for fresh start
npx expo r -c 2>/dev/null || true

echo ""
echo "🧪 GOOGLE OAUTH DEBUG TESTING:"
echo "=============================="
echo ""
print_info "When the app loads:"
echo ""
echo "1. 📱 Open Browser Developer Tools (F12)"
echo "2. 🔍 Go to Console tab"
echo "3. 🔐 Click 'Continue with Google'"
echo "4. 📊 Watch the console for debug messages:"
echo "   - '🔐 Starting real Google OAuth flow...'"
echo "   - '📱 Client ID: [your-client-id]'"
echo "   - '🌐 Redirect URI: [expo-redirect]'"
echo "   - '📡 Auth result: [success/error]'"
echo "   - '📤 Sending auth code to backend: [code]...'"
echo "   - '🎉 Backend response received'"
echo ""
print_warning "If you see errors, copy the error details!"
echo ""
print_status "App starting with debug mode..."

# Cleanup function
cleanup() {
    echo ""
    echo "🧹 Stopping servers..."
    [ ! -z "$BACKEND_PID" ] && kill $BACKEND_PID 2>/dev/null && print_status "Backend stopped"
    pkill -f "expo start" 2>/dev/null && print_status "Mobile app stopped"
    exit 0
}

trap cleanup EXIT INT TERM

# Start with web platform for easier debugging
npx expo start --web --clear

# Keep script running
wait
