#!/bin/bash

# Check Google OAuth Configuration Status
echo "🔍 Google OAuth Configuration Status"
echo "====================================="

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
echo "🔧 BACKEND CONFIGURATION:"
echo "========================"

if [ -f "backend/.env" ]; then
    if grep -q "^GOOGLE_CLIENT_ID=" backend/.env; then
        CLIENT_ID=$(grep "^GOOGLE_CLIENT_ID=" backend/.env | cut -d'=' -f2)
        if [ "$CLIENT_ID" = "demo-google-client-id.googleusercontent.com" ] || [ -z "$CLIENT_ID" ]; then
            print_warning "Backend using DEMO credentials"
        else
            print_status "Backend configured with REAL Google credentials"
            echo "   Client ID: ${CLIENT_ID:0:20}..."
        fi
    else
        print_error "GOOGLE_CLIENT_ID not found in backend/.env"
    fi
    
    if grep -q "^GOOGLE_CLIENT_SECRET=" backend/.env; then
        SECRET=$(grep "^GOOGLE_CLIENT_SECRET=" backend/.env | cut -d'=' -f2)
        if [ "$SECRET" = "demo-google-client-secret" ] || [ -z "$SECRET" ]; then
            print_warning "Backend using DEMO secret"
        else
            print_status "Backend has real Google client secret"
        fi
    else
        print_error "GOOGLE_CLIENT_SECRET not found in backend/.env"
    fi
else
    print_error "backend/.env file not found"
fi

echo ""
echo "📱 MOBILE CONFIGURATION:"
echo "========================"

if [ -f "mobile-app/src/config/oauth.ts" ]; then
    if grep -q "demo-client-id" mobile-app/src/config/oauth.ts; then
        print_warning "Mobile app using DEMO credentials"
    else
        MOBILE_ID=$(grep "return" mobile-app/src/config/oauth.ts | grep -o "'[^']*'" | head -1 | tr -d "'")
        if [ ! -z "$MOBILE_ID" ] && [ "$MOBILE_ID" != "demo-client-id" ]; then
            print_status "Mobile app configured with REAL Google credentials"
            echo "   Mobile Client ID: ${MOBILE_ID:0:20}..."
        else
            print_warning "Mobile app configuration unclear"
        fi
    fi
else
    print_error "mobile-app/src/config/oauth.ts not found"
fi

echo ""
echo "🎯 SUMMARY:"
echo "==========="

# Check overall status
backend_real=false
mobile_real=false

if [ -f "backend/.env" ] && grep -q "^GOOGLE_CLIENT_ID=" backend/.env; then
    CLIENT_ID=$(grep "^GOOGLE_CLIENT_ID=" backend/.env | cut -d'=' -f2)
    if [ "$CLIENT_ID" != "demo-google-client-id.googleusercontent.com" ] && [ ! -z "$CLIENT_ID" ]; then
        backend_real=true
    fi
fi

if [ -f "mobile-app/src/config/oauth.ts" ] && ! grep -q "demo-client-id" mobile-app/src/config/oauth.ts; then
    mobile_real=true
fi

if [ "$backend_real" = true ] && [ "$mobile_real" = true ]; then
    print_status "REAL Google OAuth configured - production ready!"
    echo ""
    echo "🚀 Test real Google login:"
    echo "   1. ./test-login-fix.sh"
    echo "   2. Click 'Continue with Google'"
    echo "   3. Should redirect to actual Google sign-in"
elif [ "$backend_real" = false ] && [ "$mobile_real" = false ]; then
    print_warning "DEMO Google OAuth - works for testing"
    echo ""
    echo "🔧 To set up real Google OAuth:"
    echo "   1. Get credentials from Google Cloud Console"
    echo "   2. ./setup-google-oauth.sh"
    echo "   3. Follow the prompts"
else
    print_error "MIXED configuration - needs fixing"
    echo ""
    echo "🔧 Run: ./setup-google-oauth.sh to fix configuration"
fi
