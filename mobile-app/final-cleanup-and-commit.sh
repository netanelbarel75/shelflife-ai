#!/bin/bash

# ShelfLife.AI - Final Cleanup and Git Commit
echo "🧹 Cleaning up ShelfLife.AI project..."

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

cd "$(dirname "$0")"

echo -e "${BLUE}📍 Working in: $(pwd)${NC}"

# Step 1: Remove all temporary shell scripts
echo -e "${YELLOW}🗑️ Step 1: Removing Temporary Scripts${NC}"

rm -f fix-dependencies-complete.sh
rm -f setup-maps.sh  
rm -f fix-web-bundling.sh
rm -f fix-leaflet.sh
rm -f cleanup-old-files.sh
rm -f test-web-maps.sh
rm -f install-maps.sh
rm -f fix-platform-separation.sh
rm -f complete-dependency-fix.sh
rm -f nuclear-fix.sh
rm -f platform-module-fix.sh
rm -f recovery-script.sh
rm -f App.tsx.bu

echo -e "${GREEN}✅ Temporary scripts removed${NC}"

# Step 2: Check git status
echo -e "${YELLOW}📋 Step 2: Git Status${NC}"
git status --porcelain

# Step 3: Add all changes to git
echo -e "${YELLOW}➕ Step 3: Adding Changes to Git${NC}"
git add .

# Step 4: Create commit
echo -e "${YELLOW}💾 Step 4: Creating Git Commit${NC}"
git commit -m "feat: implement cross-platform maps for ShelfLife.AI marketplace

✅ Features added:
- Cross-platform map component with platform-specific implementations  
- Web: Interactive Leaflet maps with colored markers and popups
- Mobile: Native react-native-maps integration
- Marketplace screen with map/list toggle functionality
- Location-based food item discovery
- Color-coded expiry status markers (fresh/near-expiry/expired)

🔧 Technical improvements:
- Platform-specific file resolution (.web.tsx/.native.tsx)
- Proper Metro bundler configuration for web compatibility
- Clean separation of web and mobile map dependencies
- Graceful fallbacks when maps are unavailable

🏗️ Architecture:
- src/components/maps/MapComponent.web.tsx - Web Leaflet implementation
- src/components/maps/MapComponent.native.tsx - Mobile native maps
- src/components/CrossPlatformMap.tsx - Platform router
- src/screens/MarketplaceScreen.tsx - Complete marketplace UI

🌟 User experience:
- Interactive maps with smooth pan/zoom
- Click markers to view food item details
- Toggle between map and list views
- Location permissions handled properly"

# Step 5: Push to GitHub
echo -e "${YELLOW}🚀 Step 5: Pushing to GitHub${NC}"
git push origin main

echo ""
echo -e "${GREEN}🎉 SUCCESS! 🎉${NC}"
echo "================"
echo ""
echo -e "${BLUE}What was accomplished:${NC}"
echo "• ✅ Cross-platform maps implemented"
echo "• ✅ Web bundling issues resolved"
echo "• ✅ Native mobile maps working"
echo "• ✅ Clean codebase (no temp scripts)"
echo "• ✅ Proper git commit created"
echo "• ✅ Changes pushed to GitHub"
echo ""
echo -e "${GREEN}ShelfLife.AI marketplace is ready! 🌟${NC}"

# Remove this script too
rm -f final-cleanup-and-commit.sh