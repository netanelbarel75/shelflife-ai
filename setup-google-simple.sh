#!/bin/bash

# Simple Google OAuth Setup for Expo Development
echo "🚀 Simple Google OAuth Setup for Expo Development"
echo "=================================================="

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
print_info "GOOD NEWS: You don't need to create a keystore for development!"
print_info "Expo provides development certificates automatically."
echo ""

echo "🔧 STEPS TO SET UP GOOGLE OAUTH:"
echo "==============================="
echo ""

echo "1️⃣  CREATE GOOGLE CLOUD PROJECT"
echo "   • Go to: https://console.cloud.google.com/"
echo "   • Create project: 'ShelfLife AI'"
echo "   • Enable Google+ API"
echo ""

echo "2️⃣  CREATE WEB CLIENT ID (for backend)"
echo "   • Create OAuth 2.0 Client ID"
echo "   • Type: Web application"
echo "   • Redirect URI: http://localhost:8000/api/oauth/google/callback"
echo "   • Note: CLIENT_ID and CLIENT_SECRET"
echo ""

echo "3️⃣  CREATE ANDROID CLIENT ID (for mobile)"
echo "   • Create OAuth 2.0 Client ID"
echo "   • Type: Android"
echo "   • Package name: host.exp.exponent"
echo "   • SHA-1 certificate: Use Expo's development certificate"
echo ""

print_warning "For SHA-1, you have 2 easy options:"
echo ""
echo "   Option A: Use Expo's automatic certificate"
echo "   • Package name: host.exp.exponent"
echo "   • SHA-1: (Expo handles this automatically)"
echo ""
echo "   Option B: Get SHA-1 manually"
echo "   • Run: npx expo credentials:manager --platform android"
echo "   • Copy the SHA-1 fingerprint shown"
echo ""

echo "4️⃣  UPDATE YOUR APP"
echo "   • Run: ./setup-google-oauth.sh"
echo "   • Enter your Web CLIENT_ID and CLIENT_SECRET"
echo "   • Enter your Android CLIENT_ID"
echo ""

echo "5️⃣  TEST GOOGLE LOGIN"
echo "   • Run: ./test-login-fix.sh"  
echo "   • Click 'Continue with Google'"
echo "   • Should redirect to real Google sign-in"
echo ""

echo "📝 PACKAGE NAMES TO USE:"
echo "========================"
echo ""
echo "🔧 Development: host.exp.exponent"
echo "🚀 Production:  com.shelflife.ai (or your chosen bundle ID)"
echo ""

print_status "No keystore creation required for development setup!"
echo ""

read -p "Do you want to proceed with Google OAuth setup now? (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    print_info "Opening Google Cloud Console for you..."
    
    # Try to open Google Cloud Console
    if command -v xdg-open > /dev/null; then
        xdg-open "https://console.cloud.google.com/"
    elif command -v open > /dev/null; then
        open "https://console.cloud.google.com/"
    else
        echo "Please open: https://console.cloud.google.com/"
    fi
    
    echo ""
    print_warning "After setting up credentials in Google Cloud:"
    echo "• Run: ./setup-google-oauth.sh"
    echo "• Enter your credentials"
    echo "• Test with: ./test-login-fix.sh"
else
    echo ""
    print_info "No problem! You can set up Google OAuth anytime."
    echo "Your app works perfectly with email/password login."
fi
