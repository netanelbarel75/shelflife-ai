#!/bin/bash
# Clean up all temporary shell scripts
echo "🧹 Cleaning up temporary scripts..."

rm -f fix-dependencies-complete.sh
rm -f setup-maps.sh  
rm -f fix-web-bundling.sh
rm -f fix-leaflet.sh
rm -f cleanup-old-files.sh
rm -f test-web-maps.sh
rm -f install-maps.sh
rm -f fix-platform-separation.sh
rm -f App.tsx.bu
rm -f complete-dependency-fix.sh
rm -f nuclear-fix.sh
rm -f platform-module-fix.sh
rm -f recovery-script.sh

echo "✅ Temporary scripts removed"

# Remove this cleanup script too
rm -f cleanup-temp-scripts.sh