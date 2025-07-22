#!/bin/bash

# ShelfLife.AI Database Fix - Final Setup
# This script ensures all files have correct permissions and provides next steps

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "🔧 ShelfLife.AI Database Configuration Fix"
echo "=========================================="
echo "Setting up file permissions and finalizing installation..."
echo -e "${NC}"

# Make all shell scripts executable
echo -e "${BLUE}📁 Setting file permissions...${NC}"
chmod +x start_shelflife.sh
chmod +x quick_setup.sh
chmod +x setup_permissions.sh

# Make Python scripts executable  
chmod +x test_config.py
chmod +x manage_db.py
chmod +x verify_fix.py

echo -e "${GREEN}✅ File permissions set${NC}"

# Check that all key files exist
echo -e "${BLUE}📋 Checking installation...${NC}"

required_files=(
    "test_config.py"
    "manage_db.py"
    "start_shelflife.sh"
    "quick_setup.sh"
    "verify_fix.py"
    ".env"
    ".env.example"
    "DATABASE_SETUP.md"
    "DATABASE_FIX_README.md"
    "app/config.py"
    "app/database.py"
)

all_files_present=true

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅${NC} $file"
    else
        echo -e "${RED}❌${NC} $file (missing)"
        all_files_present=false
    fi
done

echo ""

if [ "$all_files_present" = true ]; then
    echo -e "${GREEN}🎉 All files are present and ready!${NC}"
else
    echo -e "${RED}⚠️  Some files are missing. Please check the installation.${NC}"
    exit 1
fi

# Show next steps
echo ""
echo -e "${BLUE}🚀 Database Configuration Fix Complete!${NC}"
echo "==========================================="
echo ""
echo -e "${YELLOW}Choose your next step:${NC}"
echo ""
echo -e "${GREEN}Option 1: Quick Setup (Recommended)${NC}"
echo -e "   ${BLUE}./quick_setup.sh${NC}"
echo -e "   - One command does everything"
echo -e "   - Sets up virtual environment"
echo -e "   - Installs dependencies"
echo -e "   - Configures database"
echo -e "   - Creates demo data"
echo -e "   - Tests everything"
echo ""
echo -e "${GREEN}Option 2: Manual Step-by-Step${NC}"
echo -e "   ${BLUE}source venv/bin/activate${NC}      # Activate virtual environment"
echo -e "   ${BLUE}python test_config.py${NC}         # Test configuration"
echo -e "   ${BLUE}python manage_db.py setup${NC}     # Setup database"
echo -e "   ${BLUE}python manage_db.py demo${NC}      # Create demo data"
echo -e "   ${BLUE}./start_shelflife.sh${NC}          # Start the server"
echo ""
echo -e "${GREEN}Option 3: Verify Everything First${NC}"
echo -e "   ${BLUE}python verify_fix.py${NC}          # Run comprehensive verification"
echo ""
echo -e "${YELLOW}📚 Documentation:${NC}"
echo -e "   ${BLUE}DATABASE_FIX_README.md${NC}       # Overview of all fixes"
echo -e "   ${BLUE}DATABASE_SETUP.md${NC}            # Detailed database guide"
echo ""
echo -e "${YELLOW}🛠️  Useful Commands:${NC}"
echo -e "   ${BLUE}python manage_db.py status${NC}    # Check database health"
echo -e "   ${BLUE}python manage_db.py reset${NC}     # Reset database (⚠️  destructive)"
echo -e "   ${BLUE}python test_config.py${NC}         # Test configuration"
echo ""
echo -e "${YELLOW}🎯 After Setup:${NC}"
echo -e "   📍 API URL: ${GREEN}http://localhost:8000${NC}"
echo -e "   📖 API Docs: ${GREEN}http://localhost:8000/docs${NC}"
echo -e "   🔍 Health Check: ${GREEN}http://localhost:8000/health${NC}"
echo ""
echo -e "${YELLOW}🔑 Demo Credentials:${NC}"
echo -e "   📧 Email: ${GREEN}demo@shelflife.ai${NC}"
echo -e "   🔐 Password: ${GREEN}demo123${NC}"
echo ""
echo -e "${BLUE}💡 Pro Tip:${NC} If you're new to this, start with ${GREEN}./quick_setup.sh${NC}"
echo ""
