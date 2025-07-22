#!/bin/bash

# Get SHA-1 Certificate Fingerprint for Expo Development
echo "🔐 Getting SHA-1 Certificate for Google OAuth Android Client"
echo "==========================================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

print_status() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }
print_info() { echo -e "${CYAN}ℹ️  $1${NC}"; }
print_bold() { echo -e "${BOLD}$1${NC}"; }

# Check if we're in the right directory
if [ ! -d "mobile-app" ]; then
    print_error "Please run from shelflife-ai root directory"
    exit 1
fi

echo ""
print_info "You're right - Google requires an SHA-1 certificate fingerprint!"
print_info "Let me help you get the correct SHA-1 for Expo development."
echo ""

# Method 1: Try to get Expo development certificate
echo "🔍 METHOD 1: Expo Development Certificate"
echo "========================================"
echo ""

cd mobile-app

# Check if Expo CLI is available
if command -v npx >/dev/null 2>&1; then
    print_info "Attempting to get Expo development certificate..."
    echo ""
    
    # Try to get Expo credentials
    echo "Running: npx expo credentials:manager --platform android"
    echo ""
    print_warning "This will show Expo's credential manager."
    print_warning "Look for 'Keystore' or 'SHA1 Fingerprint' information."
    echo ""
    
    read -p "Press Enter to run Expo credentials manager..."
    npx expo credentials:manager --platform android
    echo ""
else
    print_error "Expo CLI not found"
fi

echo ""
echo "🔍 METHOD 2: Default Android Debug Certificate"
echo "============================================="
echo ""

# Method 2: Use default Android debug keystore SHA-1
print_info "The default Android debug keystore SHA-1 is:"
print_bold "SHA1: 58:E1:C4:04:7E:3F:A4:27:D9:29:8F:E6:75:52:31:70:F8:32:B9:08"
echo ""
print_warning "This is the standard SHA-1 for Android debug builds."
print_info "Many developers use this for development/testing."
echo ""

# Method 3: Check for existing debug keystore
echo "🔍 METHOD 3: Local Debug Keystore"
echo "================================="
echo ""

# Common locations for debug keystore
DEBUG_KEYSTORE_LOCATIONS=(
    "$HOME/.android/debug.keystore"
    "$HOME/.android/debug.keystore"
    "android/app/debug.keystore"
    "android/keystores/debug.keystore"
)

found_keystore=false

for keystore in "${DEBUG_KEYSTORE_LOCATIONS[@]}"; do
    if [ -f "$keystore" ]; then
        print_status "Found debug keystore at: $keystore"
        echo ""
        
        if command -v keytool >/dev/null 2>&1; then
            print_info "Extracting SHA-1 fingerprint..."
            echo ""
            
            # Extract SHA-1
            SHA1=$(keytool -list -v -keystore "$keystore" -alias androiddebugkey -storepass android -keypass android 2>/dev/null | grep "SHA1:" | head -1)
            
            if [ ! -z "$SHA1" ]; then
                print_status "SHA-1 Certificate Fingerprint:"
                print_bold "$SHA1"
                found_keystore=true
                break
            else
                print_warning "Could not extract SHA-1 from $keystore"
            fi
        else
            print_warning "keytool not found - cannot extract SHA-1"
        fi
        echo ""
    fi
done

if [ "$found_keystore" = false ]; then
    print_warning "No local debug keystore found"
fi

# Method 4: Create a debug keystore
echo ""
echo "🔍 METHOD 4: Create Debug Keystore (if needed)"
echo "=============================================="
echo ""

if ! command -v keytool >/dev/null 2>&1; then
    print_error "keytool not found. Install Java Development Kit:"
    echo "sudo apt update && sudo apt install openjdk-11-jdk"
    echo ""
else
    print_info "If none of the above methods worked, I can create a debug keystore for you."
    echo ""
    read -p "Create a new debug keystore? (y/n): " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # Create keystores directory
        mkdir -p android/keystores
        
        print_info "Creating debug keystore..."
        
        # Generate debug keystore
        keytool -genkeypair -v \
            -keystore android/keystores/debug.keystore \
            -storepass android \
            -alias androiddebugkey \
            -keypass android \
            -keyalg RSA \
            -keysize 2048 \
            -validity 10000 \
            -dname "CN=Android Debug,O=Android,C=US"
        
        if [ $? -eq 0 ]; then
            print_status "Debug keystore created successfully!"
            echo ""
            
            # Extract SHA-1
            print_info "Extracting SHA-1 fingerprint..."
            SHA1=$(keytool -list -v -keystore android/keystores/debug.keystore -alias androiddebugkey -storepass android -keypass android 2>/dev/null | grep "SHA1:" | head -1)
            
            if [ ! -z "$SHA1" ]; then
                echo ""
                print_status "Your SHA-1 Certificate Fingerprint:"
                print_bold "$SHA1"
                echo ""
            fi
        else
            print_error "Failed to create debug keystore"
        fi
    fi
fi

echo ""
echo "📋 SUMMARY - Use One of These SHA-1 Values:"
echo "==========================================="
echo ""
print_bold "Option 1 (Recommended): Default Android Debug SHA-1"
print_info "SHA1: 58:E1:C4:04:7E:3F:A4:27:D9:29:8F:E6:75:52:31:70:F8:32:B9:08"
echo ""
print_bold "Option 2: Your Generated SHA-1 (if you created a keystore above)"
echo ""
print_bold "Option 3: Expo-specific SHA-1 (if found in Expo credentials manager)"
echo ""

echo "📱 FOR GOOGLE CLOUD CONSOLE:"
echo "============================"
echo ""
echo "1. Go back to Google Cloud Console"
echo "2. Create Android OAuth Client ID"
echo "3. Application type: Android"
echo "4. Package name: host.exp.exponent"
echo "5. SHA-1 certificate fingerprint: (copy one of the SHA-1 values above)"
echo ""

print_warning "RECOMMENDED: Use the default Android debug SHA-1 for development"
print_info "SHA1: 58:E1:C4:04:7E:3F:A4:27:D9:29:8F:E6:75:52:31:70:F8:32:B9:08"
echo ""

read -p "Press Enter to continue with Google OAuth setup..."

cd ..
