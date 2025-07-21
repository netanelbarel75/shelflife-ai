#!/bin/bash

echo "🔧 Fixing ShelfLife Mobile App Dependencies"
echo "=========================================="

# Check if we're in the mobile-app directory
if [[ ! -f "package.json" ]]; then
    echo "❌ Please run this from the mobile-app directory"
    echo "📁 Expected: /home/netanelm/shelflife-ai/mobile-app/"
    exit 1
fi

echo "1️⃣ Cleaning existing dependencies..."
rm -rf node_modules
rm -f package-lock.json
rm -f yarn.lock

echo "2️⃣ Clearing npm cache..."
npm cache clean --force

echo "3️⃣ Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Dependencies fixed successfully!"
    echo ""
    echo "🚀 Starting the app..."
    npm start
else
    echo ""
    echo "❌ Installation failed. Trying with legacy peer deps..."
    npm install --legacy-peer-deps
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ Dependencies fixed with legacy peer deps!"
        echo ""
        echo "🚀 Starting the app..."
        npm start
    else
        echo ""
        echo "❌ Installation still failed. Manual intervention needed."
        exit 1
    fi
fi
