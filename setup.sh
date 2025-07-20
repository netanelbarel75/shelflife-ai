#!/bin/bash

# ShelfLife.AI Setup Script
# This script sets up the development environment for ShelfLife.AI

set -e

echo "🚀 Setting up ShelfLife.AI development environment..."

# Check if running in WSL
if grep -q microsoft /proc/version; then
    echo "✅ Detected WSL environment"
fi

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command_exists docker; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command_exists docker-compose; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

if ! command_exists node; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

if ! command_exists python3; then
    echo "❌ Python 3 is not installed. Please install Python 3 first."
    exit 1
fi

echo "✅ All prerequisites found"

# Setup environment variables
echo "🔧 Setting up environment variables..."
if [ ! -f .env ]; then
    cp .env.development .env
    echo "✅ Created .env file from template"
    echo "⚠️  Please review and update .env file with your specific settings"
else
    echo "✅ .env file already exists"
fi

# Setup backend
echo "🐍 Setting up Python backend..."
cd backend

if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo "✅ Created Python virtual environment"
fi

source venv/bin/activate
pip install -r requirements.txt
echo "✅ Installed Python dependencies"

cd ..

# Setup mobile app
echo "📱 Setting up React Native app..."
cd mobile-app

if [ ! -d "node_modules" ]; then
    npm install
    echo "✅ Installed Node.js dependencies"
else
    echo "✅ Node.js dependencies already installed"
fi

cd ..

# Setup ML model
echo "🤖 Setting up ML model..."
cd ml-model

if [ ! -d "models" ]; then
    mkdir -p models
fi

if [ ! -f "models/expiry_model.pkl" ]; then
    echo "🏋️ Training ML model (this may take a few minutes)..."
    python3 train.py
    echo "✅ ML model trained and saved"
else
    echo "✅ ML model already exists"
fi

cd ..

# Start services with Docker
echo "🐳 Starting backend services with Docker..."
docker-compose up -d postgres redis

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 10

# Run database migrations (if you have any)
echo "🗄️ Setting up database..."
# Uncomment this when you have migrations set up:
# cd backend && python -m alembic upgrade head && cd ..

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Review and update the .env file with your settings"
echo "2. Start the backend API:"
echo "   cd backend && source venv/bin/activate && python3 main.py"
echo ""
echo "3. In a new terminal, start the mobile app:"
echo "   cd mobile-app && npm start"
echo ""
echo "4. The API will be available at: http://localhost:8000"
echo "5. The API docs will be available at: http://localhost:8000/docs"
echo "6. Follow the Expo CLI instructions to run the mobile app"
echo ""
echo "🔧 Development commands:"
echo "- Run tests: cd backend && python3 -m pytest tests/"
echo "- Stop services: docker-compose down"
echo "- View logs: docker-compose logs"
echo ""
echo "Happy coding! 🚀"
