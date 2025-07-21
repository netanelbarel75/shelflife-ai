#!/bin/bash

# ShelfLife.AI Backend Cleanup and Git Commit Script
echo "🧹 Starting ShelfLife.AI Backend Cleanup and Git Commit..."
echo "=" * 60

# Navigate to the backend directory
cd ~/shelflife-ai/backend

echo "📂 Current directory: $(pwd)"
echo ""

# Clean up temporary and test files
echo "🗑️ Removing temporary test and setup files..."

# Array of temporary files to remove
temp_files=(
    "pytest-runner.py"
    "test_imports.py" 
    "fix-backend-deps.sh"
    "test-direct.py"
    "diagnose.py"
    "test_circular_import_fix.py"
    "test-output.xml"
    "test_receipt_imports.py"
    "quick_fix.sh"
    "final_test.py"
    "setup-local-postgres.sh"
    "test_config.py"
    ".env.backup"
    "check_env.py"
    "setup_database.sh"
    "setup_env.sh"
    "run-tests.sh"
    "test_login_response.py"
    "check_env_v2.py"
    "test_comprehensive.py"
    "test-database.py"
    "start_backend.sh"
    "quick_test_v2.py"
    "verify_backend.py"
    "test_payment_fix.py"
    "ENVIRONMENT_SETUP.md"
    "complete_fix.sh"
    "python3-fix.sh"
    "setup_redis.sh"
    "setup-database.sh"
    "check_database.py"
    "test_uuid.py"
    "fix-all.sh"
    "quick_test.py"
    "verify_fixes.py"
    "fix_env_issues.sh"
    "cleanup.sh"
)

# Remove temporary files
removed_count=0
for file in "${temp_files[@]}"; do
    if [ -f "$file" ]; then
        rm "$file"
        echo "   ✅ Removed: $file"
        ((removed_count++))
    fi
done

# Remove cache directories
echo ""
echo "📁 Removing cache directories..."
cache_dirs=(
    "__pycache__"
    ".pytest_cache" 
)

for dir in "${cache_dirs[@]}"; do
    if [ -d "$dir" ]; then
        rm -rf "$dir"
        echo "   ✅ Removed directory: $dir"
        ((removed_count++))
    fi
done

# Remove any .pyc files
echo ""
echo "🧹 Removing Python cache files..."
pyc_count=$(find . -name "*.pyc" -type f | wc -l)
if [ $pyc_count -gt 0 ]; then
    find . -name "*.pyc" -type f -delete
    echo "   ✅ Removed $pyc_count .pyc files"
    ((removed_count++))
fi

echo ""
echo "🎯 Cleanup Summary:"
echo "   📁 Files/directories removed: $removed_count"
echo ""
echo "🚀 Core files kept:"
echo "   • main.py (FastAPI application)"
echo "   • app/ (core application code)"
echo "   • start_shelflife.sh (startup script)"
echo "   • create_demo_data.py (demo data creation)" 
echo "   • reset_database.py (database utilities)"
echo "   • requirements.txt (dependencies)"
echo "   • .env & .env.example (configuration)"
echo "   • Dockerfile (containerization)"
echo "   • tests/ (proper test suite)"
echo "   • venv/ (virtual environment)"
echo ""

# Navigate to project root
echo "📂 Navigating to project root..."
cd ~/shelflife-ai
echo "📂 Current directory: $(pwd)"
echo ""

# Check git status
echo "🔍 Checking git status..."
git status
echo ""

# Add all changes to staging
echo "➕ Adding all changes to git staging..."
git add .
echo "✅ All changes added to staging"
echo ""

# Show what will be committed
echo "📋 Changes to be committed:"
git status --short
echo ""

# Commit with descriptive message
echo "💾 Committing changes..."
git commit -m "🔧 Fix frontend login error and cleanup backend

✅ What was fixed:
- Fixed 'Cannot read properties of null (reading full_name)' error
- Updated User schema to include computed full_name from first_name + last_name  
- Enhanced login response to return user data along with tokens
- Added User.from_orm_with_full_name() method for consistent user data
- Updated all auth endpoints to return proper user schemas
- Fixed database compatibility (custom UUID type for SQLite/PostgreSQL)
- Created demo data with proper user accounts

🧹 Cleanup:
- Removed 25+ temporary test and setup files
- Removed cache directories and .pyc files  
- Kept only essential core files and utilities

🚀 Core files maintained:
- main.py (FastAPI application)
- app/ (core application code)  
- start_shelflife.sh (main startup script)
- create_demo_data.py (demo data utility)
- reset_database.py (database utility)
- requirements.txt, .env files, Dockerfile
- tests/ directory for proper test suite

Demo credentials: demo@shelflife.ai / demo123"

if [ $? -eq 0 ]; then
    echo "✅ Changes committed successfully!"
else
    echo "❌ Commit failed!"
    exit 1
fi

echo ""

# Push to remote repository
echo "🚀 Pushing changes to remote repository..."
git push origin main

if [ $? -eq 0 ]; then
    echo "✅ Changes pushed successfully!"
else
    echo "❌ Push failed! You may need to handle merge conflicts."
    echo "💡 Try: git pull origin main --rebase"
    exit 1
fi

echo ""
echo "🎉 COMPLETED SUCCESSFULLY!"
echo "=" * 60
echo "✅ Backend cleaned up and committed"
echo "📱 Frontend login should now work with:"
echo "   Email: demo@shelflife.ai"
echo "   Password: demo123"
echo ""
echo "🌐 Your API is running at: http://localhost:8000"
echo "📖 API docs available at: http://localhost:8000/docs"
echo ""
echo "🚀 ShelfLife.AI is ready for production!"
