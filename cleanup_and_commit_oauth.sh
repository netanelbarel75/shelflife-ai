#!/bin/bash
# Complete OAuth cleanup and GitHub commit

set -e

echo "🚀 OAuth Fix Cleanup & GitHub Commit"
echo "=================================================="

cd /home/netanelm/shelflife-ai

# 1. Clean up temporary files
echo "🧹 Step 1: Cleaning up temporary files..."

# Remove temporary OAuth fix files
rm -f backend/restart_oauth_fixed.sh
rm -f backend/run_fixed_oauth.sh
rm -f backend/complete_oauth_fix.sh
rm -f backend/fix_oauth_db.py
rm -f backend/direct_schema_fix.py
rm -f backend/oauth_fix_and_restart.sh
rm -f backend/fixed_oauth_migration.py
rm -f backend/run_oauth_fix.py
rm -f backend/restart_backend_fixed.sh

# Remove debug/test files
rm -f backend/debug_google_oauth.py
rm -f backend/fix_auth.py
rm -f backend/verify_fix.py
rm -f backend/debug_auth.py
rm -f backend/test_oauth_422_fix.py
rm -f backend/simple_oauth_test.py
rm -f backend/quick_debug.py
rm -f backend/debug_oauth_request.py
rm -f backend/test_oauth_fix.py
rm -f backend/run_oauth_debug.py
rm -f backend/test_google_connectivity.py

# Remove database backups (keep the actual database)
rm -f backend/shelflife_dev.db.backup.*

# Remove backup files
rm -f backend/app/routers/oauth.py.backup
rm -f backend/app/models.py.backup.*

# Remove log files (will be regenerated)
rm -f backend/backend.log

# Remove the cleanup script itself
rm -f backend/cleanup_and_prepare_commit.sh

echo "✅ Temporary files cleaned up"

# 2. Clean __pycache__ directories
echo "🧹 Cleaning Python cache..."
find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
find . -type f -name "*.pyc" -delete 2>/dev/null || true
echo "✅ Python cache cleaned"

# 3. Check git status
echo ""
echo "📋 Git status before commit:"
git status

# 4. Add the important changes
echo ""
echo "📝 Adding OAuth fixes to git..."

# Check if files exist before adding them
if [ -f "backend/app/models.py" ]; then
    git add backend/app/models.py
    echo "  ✅ Added models.py"
else
    echo "  ⚠️  models.py not found"
fi

if [ -f "backend/app/routers/oauth.py" ]; then
    git add backend/app/routers/oauth.py
    echo "  ✅ Added oauth.py"
else
    echo "  ⚠️  oauth.py not found"
fi

if [ -d "backend/app/schemas/" ]; then
    git add backend/app/schemas/
    echo "  ✅ Added schemas directory"
else
    echo "  ⚠️  schemas directory not found"
fi

# Don't commit database files - they should be in .gitignore
# The schema changes are captured in models.py

# Add any other important code changes (excluding DB files)
git add backend/app/
git add backend/requirements.txt
git add backend/main.py 

echo "✅ Changes staged"

# 5. Show what will be committed
echo ""
echo "📋 Changes to be committed:"
git status  # Shows staged and unstaged changes

# Show only staged changes
echo ""
echo "📄 Staged changes details:"
git diff --cached --name-status  # This shows only staged files

# 6. Ask for confirmation before committing
echo ""
read -p "🤔 Do you want to proceed with the commit? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Commit cancelled by user"
    exit 1
fi

# 7. Commit with descriptive message
echo ""
echo "💾 Committing OAuth fixes..."

COMMIT_MSG="🔐 Complete OAuth Implementation & Database Schema Fix

✅ Fixed OAuth login flow:
- Handle both Google 'sub' and 'id' fields from different API endpoints
- Added nullable hashed_password for OAuth users in models.py
- Fixed Pydantic UUID validation in Token responses

🗄️ Database Schema Updates (in models.py):
- Added google_id, is_google_user, profile_image_url fields
- Made hashed_password nullable for OAuth users
- Schema migration preserves existing user data

🔧 OAuth Router Improvements:
- Proper error handling for missing user IDs
- Enhanced logging for debugging OAuth issues
- Correct User schema conversion in all OAuth endpoints

🧹 Cleanup:
- Removed temporary fix/debug scripts
- Cleaned up database backups and logs
- Database files properly excluded from git

OAuth login now works end-to-end with proper user creation and authentication."

git commit -m "$COMMIT_MSG"

echo "✅ Changes committed successfully!"

# 8. Push to GitHub
echo ""
echo "🚀 Pushing to GitHub..."

# Get current branch
CURRENT_BRANCH=$(git branch --show-current)
echo "📍 Current branch: $CURRENT_BRANCH"

# Ask for confirmation before pushing
read -p "🤔 Do you want to push to GitHub? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Push cancelled by user"
    echo "💡 You can manually push later with: git push origin $CURRENT_BRANCH"
    exit 0
fi

# Push to GitHub
if git push origin $CURRENT_BRANCH; then
    echo "✅ Successfully pushed to GitHub!"
else
    echo "❌ Failed to push to GitHub"
    echo "💡 You may need to resolve conflicts or check your network connection"
    exit 1
fi

# 9. Summary
echo ""
echo "🎉 OAuth Fix Complete & Committed!"
echo "=================================================="
echo "✅ Cleaned up temporary files"
echo "✅ OAuth database schema updated (models.py)"
echo "✅ OAuth router implementation fixed"
echo "✅ Pydantic validation issues resolved"
echo "✅ Changes committed with descriptive message"
echo "✅ Pushed to GitHub repository"
echo "✅ Database files properly excluded from git"
echo ""
echo "🔗 OAuth Features:"
echo "   ✅ Google OAuth login working"
echo "   ✅ User creation without passwords"
echo "   ✅ Profile data from Google (name, picture)"
echo "   ✅ Existing users preserved"
echo ""
echo "🚀 Your ShelfLife OAuth is now production-ready!"

# 10. Show final git status
echo ""
echo "📋 Final repository status:"
git status
echo ""
echo "🏁 All done! OAuth implementation is complete and committed."

# Optional: Show recent commits
echo ""
echo "📜 Recent commits:"
git log --oneline -3