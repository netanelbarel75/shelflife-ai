#!/bin/bash

# Local PostgreSQL Setup for ShelfLife.AI
echo "🗄️ Setting up local PostgreSQL for ShelfLife.AI..."

# Install PostgreSQL if not already installed
if ! command -v psql &> /dev/null; then
    echo "📦 Installing PostgreSQL..."
    sudo apt update
    sudo apt install -y postgresql postgresql-contrib
fi

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
echo "🔧 Creating database and user..."
sudo -u postgres psql << EOF
CREATE USER shelflife_user WITH PASSWORD 'shelflife_pass';
CREATE DATABASE shelflife_db OWNER shelflife_user;
GRANT ALL PRIVILEGES ON DATABASE shelflife_db TO shelflife_user;
ALTER USER shelflife_user CREATEDB;
\q
EOF

echo "✅ Local PostgreSQL setup complete!"
echo ""
echo "Database credentials:"
echo "  Host: localhost"
echo "  Port: 5432"
echo "  Database: shelflife_db"
echo "  Username: shelflife_user"
echo "  Password: shelflife_pass"
echo ""
echo "Test the connection with: python3 test-database.py"
