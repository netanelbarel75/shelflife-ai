#!/bin/bash

# ShelfLife.AI Docker Management Script

case "$1" in
  start)
    echo "🐳 Starting ShelfLife.AI services..."
    docker-compose up -d postgres redis
    echo "✅ Services started!"
    echo "📊 Postgres: localhost:5432"
    echo "🔄 Redis: localhost:6379"
    ;;
  stop)
    echo "🛑 Stopping ShelfLife.AI services..."
    docker-compose down
    echo "✅ Services stopped!"
    ;;
  restart)
    echo "🔄 Restarting ShelfLife.AI services..."
    docker-compose down
    docker-compose up -d postgres redis
    echo "✅ Services restarted!"
    ;;
  status)
    echo "📊 ShelfLife.AI services status:"
    docker-compose ps
    ;;
  logs)
    echo "📋 ShelfLife.AI services logs:"
    docker-compose logs -f
    ;;
  clean)
    echo "🧹 Cleaning up ShelfLife.AI services and volumes..."
    docker-compose down -v
    docker system prune -f
    echo "✅ Cleanup complete!"
    ;;
  db)
    echo "🗄️ Accessing PostgreSQL database..."
    docker-compose exec postgres psql -U shelflife_user -d shelflife_db
    ;;
  pgadmin)
    echo "🌐 Starting pgAdmin for database management..."
    docker-compose --profile tools up -d pgadmin
    echo "✅ pgAdmin started at http://localhost:5050"
    echo "📧 Email: admin@shelflife.ai"
    echo "🔐 Password: admin"
    ;;
  *)
    echo "ShelfLife.AI Docker Management Script"
    echo ""
    echo "Usage: $0 {command}"
    echo ""
    echo "Commands:"
    echo "  start    - Start database and redis services"
    echo "  stop     - Stop all services"
    echo "  restart  - Restart all services"
    echo "  status   - Show service status"
    echo "  logs     - View service logs"
    echo "  clean    - Stop services and clean volumes"
    echo "  db       - Access PostgreSQL database"
    echo "  pgadmin  - Start pgAdmin for database management"
    echo ""
    echo "Examples:"
    echo "  $0 start   # Start the development environment"
    echo "  $0 logs    # View logs from all services"
    echo "  $0 db      # Access the database directly"
    ;;
esac
