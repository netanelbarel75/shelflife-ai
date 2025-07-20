#!/bin/bash

# Install Cross-Platform Map Dependencies for ShelfLife.AI
echo "🗺️ Installing cross-platform map dependencies..."

cd "$(dirname "$0")"

# Remove any existing problematic react-leaflet
echo "Removing existing react-leaflet (web-only)..."
npm uninstall react-leaflet leaflet @types/leaflet 2>/dev/null || true

# Install proper cross-platform dependencies
echo "Installing react-native-maps (mobile)..."
npm install react-native-maps --legacy-peer-deps

# Install expo location services
echo "Installing Expo location services..."
npm install expo-location --legacy-peer-deps

# For web support, install react-leaflet as optional dependency
echo "Installing web map support..."
npm install react-leaflet leaflet @types/leaflet --legacy-peer-deps --optional

# Update app.json to include location permissions
echo "Updating app.json with location permissions..."
node -e "
const fs = require('fs');
const appJson = require('./app.json');

// Add location permissions
if (!appJson.expo.ios) appJson.expo.ios = {};
if (!appJson.expo.android) appJson.expo.android = {};

appJson.expo.ios.infoPlist = {
  ...appJson.expo.ios.infoPlist,
  NSLocationWhenInUseUsageDescription: 'This app needs location to show nearby food items',
  NSLocationAlwaysAndWhenInUseUsageDescription: 'This app needs location to show nearby food items'
};

appJson.expo.android.permissions = [
  ...(appJson.expo.android.permissions || []),
  'ACCESS_FINE_LOCATION',
  'ACCESS_COARSE_LOCATION'
];

appJson.expo.plugins = [
  ...(appJson.expo.plugins || []),
  'expo-location'
];

fs.writeFileSync('app.json', JSON.stringify(appJson, null, 2));
"

echo "✅ Map dependencies installed successfully!"
echo ""
echo "📱 Next steps:"
echo "1. Copy the CrossPlatformMap.tsx to src/components/"
echo "2. Use the component in your screens"
echo "3. npm start"
echo ""
echo "🌐 Platform support:"
echo "• Mobile (iOS/Android): Uses react-native-maps"
echo "• Web: Uses react-leaflet (fallback to list view)"
echo "• Fallback: List view when maps unavailable"