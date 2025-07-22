#!/bin/bash

# Test the authentication fixes
echo "🔧 Testing Authentication Fixes"
echo "==============================="

cd mobile-app

# Kill any existing Metro processes
pkill -f "expo start" 2>/dev/null || true
pkill -f "metro" 2>/dev/null || true

echo "🧹 Cleared existing Metro processes"
echo ""

# Clear React Native cache
npx expo r -c 2>/dev/null || true

echo "📱 Starting mobile app with fresh cache..."
echo ""
echo "🎯 TEST PLAN:"
echo "============"
echo ""
echo "1. App should load login screen"
echo "2. Click 'Use Demo Account' button"
echo "3. Should automatically redirect to main app (NOT stay on login)"
echo "4. Navigate to Profile tab"
echo "5. Should show user info: Demo Google User / demo.google@shelflife.ai"
echo "6. Click Logout - should return to login screen"
echo ""
echo "🚨 If login STILL doesn't work, press Ctrl+C and I'll add debug logging"
echo ""

# Start with web platform for easier debugging
npx expo start --web --clear
