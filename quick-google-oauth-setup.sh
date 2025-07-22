#!/bin/bash

# Quick Google OAuth Setup - Step by Step Guide
echo "🚀 Quick Google OAuth Setup - 5 Minute Guide"
echo "=============================================="

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
print_step() { echo -e "${BOLD}${CYAN}$1${NC}"; }

echo ""
print_info "This will guide you through setting up real Google OAuth in 5 minutes"
print_warning "You'll need to create credentials in Google Cloud Console"
echo ""

read -p "Ready to start? Press Enter to continue..."

# Step 1: Open Google Cloud Console
print_step "🌐 STEP 1: Create Google Cloud Project"
echo "========================================"
echo ""
echo "1. I'll open Google Cloud Console for you"
echo "2. Sign in with your Google account"
echo "3. Create a new project called 'ShelfLife AI'"
echo ""

read -p "Press Enter to open Google Cloud Console..."

# Try to open Google Cloud Console
if command -v xdg-open > /dev/null; then
    xdg-open "https://console.cloud.google.com/"
elif command -v open > /dev/null; then
    open "https://console.cloud.google.com/"
else
    echo "Please open: https://console.cloud.google.com/"
fi

echo ""
print_warning "In Google Cloud Console:"
echo "1. Click 'New Project' (or select project dropdown → New Project)"
echo "2. Project Name: ShelfLife AI"
echo "3. Click 'Create'"
echo "4. Wait for project to be created"
echo ""

read -p "Project created? Press Enter to continue..."

# Step 2: Enable APIs
print_step "🔧 STEP 2: Enable Required APIs"
echo "==============================="
echo ""
echo "1. Go to 'APIs & Services' → 'Library'"
echo "2. Search for 'Google+ API'"
echo "3. Click it and press 'Enable'"
echo "4. Also enable 'People API' if you want (optional)"
echo ""

read -p "APIs enabled? Press Enter to continue..."

# Step 3: Create OAuth Consent Screen
print_step "🛡️  STEP 3: Configure OAuth Consent Screen"
echo "==========================================="
echo ""
echo "1. Go to 'APIs & Services' → 'OAuth consent screen'"
echo "2. Choose 'External' (unless you have Google Workspace)"
echo "3. Fill required fields:"
echo ""
echo "   App name: ShelfLife.AI"
echo "   User support email: your-email@gmail.com"
echo "   Developer contact: your-email@gmail.com"
echo ""
echo "4. Click 'Save and Continue' through all steps"
echo "5. Add your email as a test user"
echo ""

read -p "Consent screen configured? Press Enter to continue..."

# Step 4: Create Web Client ID
print_step "🌐 STEP 4: Create Web Client ID (Backend)"
echo "==========================================="
echo ""
echo "1. Go to 'APIs & Services' → 'Credentials'"
echo "2. Click 'Create Credentials' → 'OAuth 2.0 Client IDs'"
echo "3. Application type: Web application"
echo "4. Name: ShelfLife Web Client"
echo "5. Authorized redirect URIs:"
echo "   Add: http://localhost:8000/api/oauth/google/callback"
echo "6. Click 'Create'"
echo ""
print_warning "COPY the Client ID and Client Secret - you'll need them!"
echo ""

read -p "Web Client ID created and copied? Press Enter to continue..."

# Step 5: Get SHA-1 Certificate
print_step "🔐 STEP 5: Get SHA-1 Certificate Fingerprint"
echo "==============================================="
echo ""
print_info "Before creating the Android Client ID, we need your SHA-1 certificate"
echo ""
read -p "Press Enter to get your SHA-1 certificate fingerprint..."

# Run SHA-1 extraction script
./get-sha1-for-google.sh

echo ""
read -p "Got your SHA-1? Press Enter to continue..."

# Step 6: Create Android Client ID  
print_step "📱 STEP 6: Create Android Client ID (Mobile)"
echo "============================================"
echo ""
echo "1. Click 'Create Credentials' → 'OAuth 2.0 Client IDs' again"
echo "2. Application type: Android"
echo "3. Name: ShelfLife Mobile Client"
echo "4. Package name: host.exp.exponent"
echo "   (This is Expo's development package name)"
echo "5. SHA-1 certificate fingerprint:"
echo "   Use the SHA-1 from the previous step"
echo "   (NOT empty - Google requires this!)"
echo "6. Click 'Create'"
echo ""
print_warning "COPY the Android Client ID - you'll need it!"
echo ""

read -p "Android Client ID created and copied? Press Enter to continue..."

# Step 7: Configure App
print_step "⚙️  STEP 7: Configure Your App"
echo "=============================="
echo ""
print_info "Now I'll help you configure your app with these credentials"
echo ""

echo "You should have:"
echo "• Web Client ID (long string ending in .apps.googleusercontent.com)"
echo "• Web Client Secret (starts with GOCSPX-)"
echo "• Android Client ID (different long string ending in .apps.googleusercontent.com)"
echo ""

read -p "Have all three credentials? Press Enter to configure app..."

# Run the OAuth setup script
echo ""
print_info "Running configuration script..."
./setup-google-oauth.sh

echo ""
print_step "🧪 STEP 8: Test Google OAuth"
echo "============================"
echo ""
print_status "Configuration complete! Let's test it:"
echo ""
echo "1. I'll start your app with the new Google OAuth credentials"
echo "2. Try clicking 'Continue with Google'"
echo "3. Should redirect to REAL Google sign-in page"
echo "4. Sign in and get redirected back to your app"
echo ""

read -p "Ready to test? Press Enter to start app..."

# Start the app for testing
./test-login-fix.sh
