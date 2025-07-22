#!/bin/bash

# Google OAuth Real Credentials Setup Script
echo "🔐 Google OAuth Real Credentials Setup"
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

if [ ! -d "backend" ] || [ ! -d "mobile-app" ]; then
    print_error "Please run from shelflife-ai root directory"
    exit 1
fi

echo ""
print_info "This script will help you configure real Google OAuth credentials"
print_warning "You need to get credentials from Google Cloud Console first!"
echo ""

# Get backend credentials
echo "🌐 BACKEND CREDENTIALS (Web Application):"
echo "=========================================="
read -p "Enter your Google Web Client ID: " WEB_CLIENT_ID
read -p "Enter your Google Client Secret: " CLIENT_SECRET

if [ -z "$WEB_CLIENT_ID" ] || [ -z "$CLIENT_SECRET" ]; then
    print_error "Web credentials are required for backend"
    exit 1
fi

# Get mobile credentials
echo ""
echo "📱 MOBILE CREDENTIALS (Android/Mobile):"
echo "======================================="
read -p "Enter your Google Mobile Client ID: " MOBILE_CLIENT_ID

if [ -z "$MOBILE_CLIENT_ID" ]; then
    print_error "Mobile Client ID is required"
    exit 1
fi

# Update backend .env
echo ""
print_info "Updating backend/.env..."

# Backup original .env
cp backend/.env backend/.env.backup.$(date +%Y%m%d-%H%M%S)
print_status "Backed up original .env file"

# Update Google OAuth settings in backend .env
sed -i.tmp '
/^#GOOGLE_CLIENT_ID=/c\
GOOGLE_CLIENT_ID='"$WEB_CLIENT_ID"'
/^#GOOGLE_CLIENT_SECRET=/c\
GOOGLE_CLIENT_SECRET='"$CLIENT_SECRET"'
' backend/.env

# Add the lines if they don't exist
if ! grep -q "GOOGLE_CLIENT_ID=" backend/.env; then
    echo "" >> backend/.env
    echo "# Google OAuth Settings" >> backend/.env
    echo "GOOGLE_CLIENT_ID=$WEB_CLIENT_ID" >> backend/.env
    echo "GOOGLE_CLIENT_SECRET=$CLIENT_SECRET" >> backend/.env
    echo "GOOGLE_REDIRECT_URI=http://localhost:8000/api/oauth/google/callback" >> backend/.env
fi

print_status "Backend .env updated"

# Update mobile app config
echo ""
print_info "Updating mobile-app/src/config/oauth.ts..."

# Backup original oauth.ts
cp mobile-app/src/config/oauth.ts mobile-app/src/config/oauth.ts.backup.$(date +%Y%m%d-%H%M%S)

# Create new oauth.ts with real credentials
cat > mobile-app/src/config/oauth.ts << EOF
// src/config/oauth.ts - Real Google OAuth Configuration
export const OAUTH_CONFIG = {
  GOOGLE_CLIENT_ID: {
    // Real Google Client IDs
    EXPO: '$MOBILE_CLIENT_ID',
    ANDROID: '$MOBILE_CLIENT_ID', 
    IOS: '$MOBILE_CLIENT_ID',
  },
  // Add more OAuth providers here if needed
  FACEBOOK_APP_ID: 'your-facebook-app-id',
  APPLE_CLIENT_ID: 'your-apple-client-id',
};

// Get the appropriate client ID based on platform
export const getGoogleClientId = () => {
  // Return real Mobile Client ID
  return '$MOBILE_CLIENT_ID';
};
EOF

print_status "Mobile app config updated"

# Verify configuration
echo ""
print_info "Verifying configuration..."
echo ""
echo "📄 Backend (.env):"
grep "GOOGLE_CLIENT_ID" backend/.env | head -1
echo ""
echo "📱 Mobile (oauth.ts):"
grep "return" mobile-app/src/config/oauth.ts | head -1
echo ""

print_status "Google OAuth real credentials configured!"
echo ""
print_warning "NEXT STEPS:"
echo "1. Restart your servers: ./test-login-fix.sh"
echo "2. Test 'Continue with Google' button"
echo "3. Should redirect to REAL Google sign-in page"
echo "4. Sign in and get redirected back to app"
echo ""
print_info "Your app now uses real Google OAuth! 🎉"
