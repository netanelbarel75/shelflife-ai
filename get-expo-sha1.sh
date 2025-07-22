#!/bin/bash

# Get Expo Development Certificate SHA-1 for Google OAuth
echo "🔐 Getting Expo Development Certificate for Google OAuth"
echo "======================================================="

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

# Check if we're in mobile-app directory
if [ ! -f "app.json" ] && [ ! -f "../mobile-app/app.json" ]; then
    print_error "Please run from mobile-app directory or shelflife-ai root"
    exit 1
fi

# Navigate to mobile-app if needed
if [ -f "../mobile-app/app.json" ]; then
    cd mobile-app
fi

echo ""
print_info "Getting Expo development certificate SHA-1..."
echo ""

# Get Expo development certificate
echo "🔍 Method 1: Expo Development Certificate"
echo "========================================"
npx expo credentials:manager --platform android

echo ""
echo "🔍 Method 2: Manual SHA-1 Extraction"
echo "===================================="
echo ""

# Alternative: Get SHA-1 directly
if command -v keytool >/dev/null 2>&1; then
    print_info "Found keytool, attempting to get Expo debug certificate..."
    
    # Try to find Expo debug keystore
    EXPO_KEYSTORE="$HOME/.android/debug.keystore"
    if [ -f "$EXPO_KEYSTORE" ]; then
        print_status "Found Expo debug keystore"
        echo ""
        echo "SHA-1 Fingerprint:"
        keytool -list -v -keystore "$EXPO_KEYSTORE" -alias androiddebugkey -storepass android -keypass android | grep SHA1
    else
        print_warning "Expo debug keystore not found at $EXPO_KEYSTORE"
    fi
else
    print_warning "keytool not found - you may need to install Java/Android SDK"
fi

echo ""
echo "📋 INSTRUCTIONS FOR GOOGLE CLOUD CONSOLE:"
echo "=========================================="
echo ""
echo "1. Go to Google Cloud Console → Credentials"
echo "2. Create OAuth 2.0 Client ID"
echo "3. Choose 'Android' application type"
echo "4. Enter these details:"
echo ""
echo "   Package name: host.exp.exponent"
echo "   (For Expo development builds)"
echo ""
echo "   SHA-1 certificate fingerprint:"
echo "   (Copy the SHA-1 from above output)"
echo ""
echo "5. For production, you'll need to create your own keystore"
echo "   and update the package name to your actual bundle ID"
echo ""
print_warning "DEVELOPMENT ONLY: This setup works for Expo development builds"
print_info "For production deployment, you'll need a production keystore"
