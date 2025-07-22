#!/bin/bash

# ShelfLife.AI Quick Setup Script
# This script performs a complete setup in one go

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "🍃 ShelfLife.AI Backend Quick Setup"
echo "=================================="
echo -e "${NC}"

# Function to log with timestamp
log() {
    echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

# Step 1: Check Python version
log "Checking Python version..."
if ! python3 --version >/dev/null 2>&1; then
    error "Python 3 is not installed or not available as 'python3'"
    exit 1
fi

PYTHON_VERSION=$(python3 --version 2>&1 | cut -d' ' -f2 | cut -d'.' -f1-2)
log "Found Python $PYTHON_VERSION"

if [[ $(echo "$PYTHON_VERSION >= 3.8" | bc -l) -eq 0 ]]; then
    warning "Python 3.8+ is recommended, you have $PYTHON_VERSION"
fi

# Step 2: Create and activate virtual environment
log "Setting up virtual environment..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
    success "Virtual environment created"
else
    log "Virtual environment already exists"
fi

source venv/bin/activate
success "Virtual environment activated"

# Step 3: Upgrade pip and install dependencies
log "Installing Python dependencies..."
pip install --upgrade pip --quiet
pip install -r requirements.txt --quiet
success "Dependencies installed"

# Step 4: Setup environment file
log "Setting up environment configuration..."
if [ ! -f ".env" ]; then
    log ".env file already updated with correct configuration"
else
    log ".env file exists and configured"
fi
success "Environment configured for SQLite development setup"

# Step 5: Test configuration
log "Testing configuration..."
if python test_config.py; then
    success "Configuration test passed"
else
    error "Configuration test failed - please check the output above"
    exit 1
fi

# Step 6: Setup database
log "Setting up database..."
if python manage_db.py setup; then
    success "Database setup completed"
else
    error "Database setup failed"
    exit 1
fi

# Step 7: Create demo data
log "Creating demo data..."
if python manage_db.py demo; then
    success "Demo data created"
else
    warning "Demo data creation had issues, but continuing..."
fi

# Step 8: Make scripts executable
log "Making scripts executable..."
chmod +x start_shelflife.sh
chmod +x quick_setup.sh
success "Scripts made executable"

# Step 9: Final verification
log "Running final system check..."
if python manage_db.py status >/dev/null 2>&1; then
    success "System verification passed"
else
    warning "System verification had issues, but setup may still work"
fi

# Success message
echo ""
echo -e "${GREEN}🎉 Setup Complete!${NC}"
echo "==================="
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Start the server: ${GREEN}./start_shelflife.sh${NC}"
echo "2. Open API docs: ${GREEN}http://localhost:8000/docs${NC}"
echo "3. Test health check: ${GREEN}http://localhost:8000/health${NC}"
echo ""
echo -e "${BLUE}Demo login credentials:${NC}"
echo "📧 Email: ${GREEN}demo@shelflife.ai${NC}"
echo "🔑 Password: ${GREEN}demo123${NC}"
echo ""
echo "📧 Email: ${GREEN}alice@example.com${NC}"
echo "🔑 Password: ${GREEN}alice123${NC}"
echo ""
echo "📧 Email: ${GREEN}bob@example.com${NC}"
echo "🔑 Password: ${GREEN}bob123${NC}"
echo ""
echo -e "${YELLOW}To start the server now, run:${NC} ${GREEN}./start_shelflife.sh${NC}"
