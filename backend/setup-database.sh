#!/bin/bash

# ShelfLife.AI Database Setup Script
echo "🗄️ Setting up ShelfLife.AI Database..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Navigate to project root
cd "$(dirname "$0")/.."

# Start PostgreSQL and Redis using Docker Compose
echo "🚀 Starting database services..."
docker-compose up -d postgres redis

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
until docker-compose exec postgres pg_isready -U shelflife_user -d shelflife_db; do
    echo "Waiting for PostgreSQL..."
    sleep 2
done

echo "✅ PostgreSQL is ready!"

# Optional: Start pgAdmin for database management
read -p "Do you want to start pgAdmin for database management? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker-compose --profile tools up -d pgadmin
    echo "🔧 pgAdmin started at http://localhost:5050"
    echo "   Email: admin@shelflife.ai"
    echo "   Password: admin"
fi

echo ""
echo "🎉 Database setup complete!"
echo "📊 PostgreSQL running on localhost:5432"
echo "🔄 Redis running on localhost:6379"
echo ""
echo "Database credentials:"
echo "  Host: localhost"
echo "  Port: 5432"
echo "  Database: shelflife_db"
echo "  Username: shelflife_user"
echo "  Password: shelflife_pass"
echo ""
echo "You can now start your backend with: source venv/bin/activate && python3 main.py"
