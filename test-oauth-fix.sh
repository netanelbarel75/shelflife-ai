#!/bin/bash

# Test Google OAuth 400 Error Fix
echo "🔧 Testing Google OAuth 400 Error Fix"
echo "======================================"

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

echo ""
print_info "CHANGES MADE TO FIX 400 ERROR:"
echo "=============================="
echo ""
echo "✅ Frontend (authService.ts):"
echo "   - Send auth_code as URLSearchParams form data"
echo "   - Use application/x-www-form-urlencoded content type"
echo ""
echo "✅ Backend (oauth.py):"
echo "   - Added Form(...) parameter annotation"
echo "   - Explicitly expects form data"
echo ""

# Kill any existing processes
pkill -f "python main.py" 2>/dev/null || true
pkill -f "expo start" 2>/dev/null || true
sleep 2

# Start backend
echo ""
print_info "Starting backend with OAuth fixes..."
cd backend

if [ -d "venv" ]; then
    source venv/bin/activate
else
    print_error "Backend venv not found"
    exit 1
fi

python main.py &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

sleep 4

# Test backend health
if curl -s http://localhost:8000/api/health > /dev/null; then
    print_status "Backend is running with OAuth fixes"
else
    print_error "Backend failed to start"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

# Start mobile app
echo ""
print_info "Starting mobile app with OAuth fixes..."
cd ../mobile-app

# Clear cache
npx expo r -c 2>/dev/null || true

echo ""
echo "🧪 TESTING INSTRUCTIONS (400 ERROR FIX):"
echo "========================================="
echo ""
print_status "The Google OAuth should now work! Here's what to test:"
echo ""
echo "1. 📱 App will load - you'll see the login screen"
echo "2. 🔐 Click 'Continue with Google'"
echo "3. 🌐 Should redirect to REAL Google sign-in (not demo)"
echo "4. ✅ Sign in with your Google account"
echo "5. 🔄 Should redirect back and complete login"
echo "6. 🎉 You should be logged in to the main app!"
echo ""
echo "📊 In Browser Console (F12), you should see:"
echo "   - '✅ Got authorization code, sending to backend...'"
echo "   - '📤 Sending auth code to backend: 4/0...'"
echo "   - '🎉 Backend response received'"
echo "   - NO MORE 400 OR 422 ERRORS!"
echo ""
print_warning "If you still see errors, copy the complete error details!"
echo ""

# Cleanup function
cleanup() {
    echo ""
    echo "🧹 Stopping servers..."
    [ ! -z "$BACKEND_PID" ] && kill $BACKEND_PID 2>/dev/null && print_status "Backend stopped"
    pkill -f "expo start" 2>/dev/null && print_status "Mobile app stopped"
    exit 0
}

trap cleanup EXIT INT TERM

print_status "Starting app - Google OAuth 400 error should be fixed!"

# Start with web platform
npx expo start --web --clear

# Keep script running
wait
