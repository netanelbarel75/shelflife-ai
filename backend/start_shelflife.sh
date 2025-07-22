#!/bin/bash

# ShelfLife.AI Backend Startup Script with Enhanced Database Management
# This script provides a robust startup process with proper error handling

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
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

# Function to check if virtual environment exists and is activated
check_virtualenv() {
    log "Checking virtual environment..."
    
    if [ ! -d "venv" ]; then
        error "Virtual environment not found!"
        log "Creating virtual environment..."
        python3 -m venv venv
        success "Virtual environment created"
    fi
    
    # Check if virtual environment is activated
    if [[ "$VIRTUAL_ENV" != "" ]]; then
        success "Virtual environment already activated: $VIRTUAL_ENV"
    else
        log "Activating virtual environment..."
        source venv/bin/activate
        success "Virtual environment activated"
    fi
}

# Function to install/update dependencies
install_dependencies() {
    log "Checking Python dependencies..."
    
    if [ -f "requirements.txt" ]; then
        # Check if requirements are already satisfied
        if python3 -c "import pkg_resources; pkg_resources.require(open('requirements.txt').read().splitlines())" &>/dev/null; then
            success "All dependencies already satisfied"
        else
            log "Installing/updating dependencies..."
            pip install --upgrade pip
            pip install -r requirements.txt
            success "Dependencies installed"
        fi
    else
        warning "requirements.txt not found, skipping dependency installation"
    fi
}

# Function to check configuration
check_configuration() {
    log "Checking application configuration..."
    
    if [ ! -f ".env" ]; then
        warning ".env file not found"
        if [ -f ".env.example" ]; then
            log "Creating .env from .env.example..."
            cp .env.example .env
            warning "Please review and update .env file with your settings"
        else
            error "No .env or .env.example file found"
            return 1
        fi
    fi
    
    # Run configuration test
    if python3 test_config.py; then
        success "Configuration test passed"
        return 0
    else
        error "Configuration test failed"
        return 1
    fi
}

# Function to handle database setup
setup_database() {
    log "Setting up database..."
    
    # Check database status first
    if python3 manage_db.py status >/dev/null 2>&1; then
        success "Database is healthy"
        
        # Ask if user wants to create demo data
        read -p "$(echo -e "${YELLOW}🎭 Create demo data? (y/N):${NC} ")" -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            python3 manage_db.py demo
        fi
    else
        warning "Database needs setup"
        
        # Ask if user wants to reset or setup
        read -p "$(echo -e "${YELLOW}🏗️  Setup fresh database? (Y/n):${NC} ")" -n 1 -r
        echo
        if [[ $REPLY =~ ^[Nn]$ ]]; then
            log "Skipping database setup"
        else
            python3 manage_db.py setup
            
            # Offer to create demo data
            read -p "$(echo -e "${YELLOW}🎭 Create demo data? (Y/n):${NC} ")" -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Nn]$ ]]; then
                python3 manage_db.py demo
            fi
        fi
    fi
}

# Function to start the application
start_application() {
    log "Starting ShelfLife.AI API server..."
    
    # Show startup information
    echo ""
    echo "🍃 ShelfLife.AI Backend Starting..."
    echo "=================================="
    echo "📍 API URL: http://localhost:8000"
    echo "📖 API Docs: http://localhost:8000/docs"
    echo "🔍 Health Check: http://localhost:8000/health"
    echo "=================================="
    echo ""
    
    # Start the application with proper signal handling
    python3 main.py
}

# Function to handle cleanup on exit
cleanup() {
    log "Shutting down ShelfLife.AI..."
    # Add any cleanup tasks here
    success "Shutdown complete"
}

# Main execution
main() {
    # Set up trap for cleanup
    trap cleanup EXIT INT TERM
    
    log "🚀 Starting ShelfLife.AI Backend Setup..."
    
    # Navigate to backend directory (in case script is called from elsewhere)
    cd "$(dirname "$0")"
    
    # Check and setup virtual environment
    if ! check_virtualenv; then
        error "Failed to setup virtual environment"
        exit 1
    fi
    
    # Install dependencies
    if ! install_dependencies; then
        error "Failed to install dependencies"
        exit 1
    fi
    
    # Check configuration
    if ! check_configuration; then
        error "Configuration check failed"
        exit 1
    fi
    
    # Setup database
    if ! setup_database; then
        error "Database setup failed"
        exit 1
    fi
    
    # Start the application
    start_application
}

# Parse command line arguments
case "${1:-}" in
    --help|-h)
        echo "ShelfLife.AI Backend Startup Script"
        echo ""
        echo "Usage: $0 [options]"
        echo ""
        echo "Options:"
        echo "  --help, -h     Show this help message"
        echo "  --reset-db     Reset database before starting"
        echo "  --no-demo      Skip demo data creation"
        echo "  --dev          Development mode (auto-reload)"
        echo ""
        exit 0
        ;;
    --reset-db)
        log "Resetting database before startup..."
        python3 manage_db.py reset
        ;;
    --dev)
        warning "Development mode requested"
        export SHELFLIFE_DEV_MODE=true
        ;;
esac

# Run main function
main "$@"
