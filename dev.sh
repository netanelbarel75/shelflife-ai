#!/bin/bash

# ShelfLife.AI Development Helper Script

echo "🥬 ShelfLife.AI Development Environment"
echo ""

case "$1" in
  backend)
    echo "🐍 Starting backend API..."
    cd backend
    if [ ! -d "venv" ]; then
      echo "⚠️ Virtual environment not found. Run './setup.sh' first."
      exit 1
    fi
    source venv/bin/activate
    echo "✅ Activated virtual environment"
    echo "🚀 Starting FastAPI server at http://localhost:8000"
    python3 main.py
    ;;
  mobile)
    echo "📱 Starting mobile app..."
    cd mobile-app
    if [ ! -d "node_modules" ]; then
      echo "⚠️ Node modules not found. Run './setup.sh' first."
      exit 1
    fi
    echo "🚀 Starting Expo development server..."
    npm start
    ;;
  services)
    echo "🐳 Starting backend services (Database & Redis)..."
    ./docker.sh start
    ;;
  full)
    echo "🚀 Starting full development environment..."
    echo ""
    echo "1. Starting backend services..."
    ./docker.sh start
    sleep 5
    
    echo ""
    echo "2. Backend API will be available at: http://localhost:8000"
    echo "3. Start the backend in a new terminal: ./dev.sh backend"
    echo "4. Start the mobile app in another terminal: ./dev.sh mobile"
    echo ""
    echo "Press any key to continue or Ctrl+C to cancel..."
    read -n 1
    ;;
  test)
    echo "🧪 Running tests..."
    cd backend
    if [ ! -d "venv" ]; then
      echo "⚠️ Virtual environment not found. Run './setup.sh' first."
      exit 1
    fi
    source venv/bin/activate
    echo "🐍 Running backend tests..."
    python3 -m pytest tests/ -v
    ;;
  *)
    echo "Usage: $0 {command}"
    echo ""
    echo "Commands:"
    echo "  backend   - Start the FastAPI backend server"
    echo "  mobile    - Start the React Native mobile app"
    echo "  services  - Start Docker services (DB + Redis)"
    echo "  full      - Start the complete development environment"
    echo "  test      - Run backend tests"
    echo ""
    echo "Quick Start:"
    echo "  1. ./dev.sh services  # Start databases"
    echo "  2. ./dev.sh backend   # Start API (new terminal)"
    echo "  3. ./dev.sh mobile    # Start mobile app (new terminal)"
    echo ""
    ;;
esac
