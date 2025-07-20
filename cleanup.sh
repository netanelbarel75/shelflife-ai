#!/bin/bash

echo "🧹 Cleaning up ShelfLife.AI project..."

# Remove unnecessary shell scripts and temp files
echo "Removing unnecessary scripts..."

# Remove the backup files and unnecessary scripts
if [ -f "quick-test.sh.backup" ]; then
    rm quick-test.sh.backup
    echo "✅ Removed quick-test.sh.backup"
fi

if [ -f "temp_delete_fix-mobile-deps.sh" ]; then
    rm temp_delete_fix-mobile-deps.sh
    echo "✅ Removed temp_delete_fix-mobile-deps.sh"
fi

if [ -f "to_delete_recovery-script.sh" ]; then
    rm to_delete_recovery-script.sh
    echo "✅ Removed recovery-script.sh"
fi

# Remove this cleanup script after running
if [ -f "cleanup.sh" ]; then
    echo "✅ Will remove cleanup.sh after git commit"
fi

echo ""
echo "📝 Adding files to git..."
git add .
git add .gitignore

echo ""
echo "📊 Git status after cleanup:"
git status

echo ""
echo "💾 Creating commit..."
git commit -m "chore: cleanup unnecessary scripts and add comprehensive .gitignore

- Removed unnecessary shell scripts (quick-test.sh, fix-mobile-deps.sh, recovery-script.sh)
- Kept essential development scripts (dev.sh, setup.sh, docker.sh)
- Added comprehensive .gitignore for Node.js, Python, Docker, ML, and IDE files
- Updated README.md with development scripts documentation

Remaining useful scripts:
✅ dev.sh - Development helper commands
✅ setup.sh - Environment setup script
✅ docker.sh - Docker management commands"

if [ $? -eq 0 ]; then
    echo "✅ Commit successful!"
    
    echo ""
    echo "🚀 Pushing to GitHub..."
    git push
    
    if [ $? -eq 0 ]; then
        echo "✅ Successfully pushed to GitHub!"
    else
        echo "⚠️ Push failed. You may need to set up remote or resolve conflicts."
        echo "Try: git remote -v to check remotes"
    fi
else
    echo "❌ Commit failed. Check git status and try again."
fi

echo ""
echo "🎯 Remaining useful scripts:"
echo "  ✅ dev.sh - Development helper"
echo "  ✅ setup.sh - Environment setup" 
echo "  ✅ docker.sh - Docker management"
echo ""
echo "📝 Created comprehensive .gitignore file"
echo "📚 Updated README.md with development scripts documentation"
echo ""
echo "🎉 Cleanup complete!"

# Remove this cleanup script
rm cleanup.sh
echo "✅ Removed cleanup.sh"
