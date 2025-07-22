# ShelfLife.AI Database Configuration Guide

This guide explains how to configure and manage the database for your ShelfLife.AI backend.

## 🎯 Quick Start

### For Development (SQLite - Recommended)
```bash
# 1. Copy environment file
cp .env.example .env

# 2. The default SQLite configuration will work out of the box
# DATABASE_URL=sqlite:///./shelflife_dev.db (already set in .env)

# 3. Install dependencies
pip install -r requirements.txt

# 4. Setup database
python manage_db.py setup

# 5. Create demo data (optional)
python manage_db.py demo

# 6. Start the application
./start_shelflife.sh
```

### For Production (PostgreSQL - Recommended)
```bash
# 1. Install and setup PostgreSQL
sudo apt install postgresql postgresql-contrib  # Ubuntu/Debian
# or
brew install postgresql  # macOS

# 2. Create database and user
sudo -u postgres psql
CREATE DATABASE shelflife_db;
CREATE USER shelflife_user WITH PASSWORD 'shelflife_pass';
GRANT ALL PRIVILEGES ON DATABASE shelflife_db TO shelflife_user;
\q

# 3. Configure environment
cp .env.example .env
# Edit .env file:
# - Uncomment PostgreSQL settings
# - Comment out SQLite DATABASE_URL
# - Set DATABASE_TYPE=postgresql

# 4. Install dependencies and setup
pip install -r requirements.txt
python manage_db.py setup
python manage_db.py demo  # Optional demo data

# 5. Start application
./start_shelflife.sh
```

## 🗄️ Database Types

### SQLite (Development)
**Pros:**
- ✅ No additional setup required
- ✅ Perfect for development and testing
- ✅ Single file database (easy backup/restore)
- ✅ Built into Python

**Cons:**
- ❌ Limited concurrent connections
- ❌ Not suitable for production with multiple users

**Configuration:**
```bash
DATABASE_URL=sqlite:///./shelflife_dev.db
```

### PostgreSQL (Production)
**Pros:**
- ✅ Excellent performance and scalability
- ✅ Advanced features (JSON support, full-text search)
- ✅ Strong ACID compliance
- ✅ Excellent for production use

**Cons:**
- ❌ Requires installation and setup
- ❌ More complex configuration

**Configuration:**
```bash
DATABASE_TYPE=postgresql
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=shelflife_user
POSTGRES_PASSWORD=shelflife_pass
POSTGRES_DB=shelflife_db
DATABASE_URL=postgresql://shelflife_user:shelflife_pass@localhost:5432/shelflife_db
```

## 🛠️ Database Management Commands

We provide a comprehensive database management script:

```bash
python manage_db.py <command>
```

### Available Commands

| Command | Description | Example |
|---------|-------------|---------|
| `setup` | Create all database tables | `python manage_db.py setup` |
| `reset` | Drop and recreate all tables (⚠️ DESTRUCTIVE) | `python manage_db.py reset` |
| `status` | Show database health and table info | `python manage_db.py status` |
| `backup` | Backup SQLite database | `python manage_db.py backup` |
| `restore` | Restore from SQLite backup | `python manage_db.py restore` |
| `demo` | Create demo users and data | `python manage_db.py demo` |
| `clean` | Clean up old data | `python manage_db.py clean` |

### Example Usage
```bash
# Check database status
python manage_db.py status

# Setup fresh database
python manage_db.py setup

# Create sample data for testing
python manage_db.py demo

# Backup database (SQLite only)
python manage_db.py backup

# Reset database (careful!)
python manage_db.py reset
```

## 🔧 Configuration Files

### Environment Configuration (.env)
The `.env` file controls all database settings. Key variables:

```bash
# Basic database setting - this overrides everything else
DATABASE_URL=sqlite:///./shelflife_dev.db

# For auto-configuration
DATABASE_TYPE=auto  # auto, sqlite, postgresql
ENVIRONMENT=development  # development, staging, production

# PostgreSQL specific (used when DATABASE_TYPE=postgresql)
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=shelflife_user
POSTGRES_PASSWORD=shelflife_pass
POSTGRES_DB=shelflife_db
```

### Configuration Priority
1. **Explicit DATABASE_URL** - If set and not default, used as-is
2. **DATABASE_TYPE** - If set to 'postgresql', uses PostgreSQL settings
3. **ENVIRONMENT** - If 'production', auto-uses PostgreSQL
4. **Default** - Falls back to SQLite for development

## 📊 Database Schema

The application creates these main tables:

| Table | Description |
|-------|-------------|
| `users` | User accounts and profiles |
| `receipts` | Uploaded receipt data |
| `inventory_items` | Food items tracked by users |
| `marketplace_listings` | Items for sale/trade |
| `messages` | User-to-user messages |
| `orders` | Purchase transactions |
| `shelf_life_data` | Reference data for food expiry |

## 🚨 Troubleshooting

### Common Issues and Solutions

#### "Database connection failed"
```bash
# Check your DATABASE_URL format
python test_config.py

# For PostgreSQL, ensure service is running
sudo systemctl status postgresql  # Linux
brew services list | grep postgresql  # macOS
```

#### "Table doesn't exist" errors
```bash
# Recreate database schema
python manage_db.py reset
python manage_db.py setup
```

#### "Permission denied" on SQLite file
```bash
# Check file permissions
ls -la shelflife_dev.db*

# Fix permissions
chmod 664 shelflife_dev.db
chown $USER:$USER shelflife_dev.db
```

#### PostgreSQL connection issues
```bash
# Test connection manually
psql -h localhost -U shelflife_user -d shelflife_db

# Check PostgreSQL is running
sudo systemctl start postgresql  # Linux
brew services start postgresql   # macOS

# Verify user/database exist
sudo -u postgres psql -c "\du"  # List users
sudo -u postgres psql -c "\l"   # List databases
```

#### "Module not found" errors
```bash
# Ensure virtual environment is activated
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### Environment Variables Debug
```bash
# Test configuration
python test_config.py

# Check what configuration is loaded
python -c "
from app.config import settings
print('Database URL:', settings._mask_db_url(settings.DATABASE_URL))
print('Database Type:', settings.get_database_type())
print('Environment:', settings.ENVIRONMENT)
"
```

## 📈 Performance Optimization

### SQLite Optimizations
The system automatically applies these SQLite optimizations:
- Foreign key constraints enabled
- WAL mode for better concurrency
- 64MB cache size
- Memory-mapped I/O

### PostgreSQL Optimizations
For production PostgreSQL:
```bash
# In .env file
DB_POOL_SIZE=10
DB_MAX_OVERFLOW=20
DB_POOL_TIMEOUT=30
```

## 🔒 Security Considerations

### Development
- SQLite files should not be committed to version control
- Default passwords are for development only

### Production
- Use strong, unique database passwords
- Enable SSL/TLS for database connections
- Restrict database access by IP/network
- Regular backups and security updates

### Database URL Security
The system automatically masks passwords in logs:
```
postgresql://user:***@host:port/db
```

## 🔄 Migration Strategy

### SQLite to PostgreSQL Migration
```bash
# 1. Backup current SQLite data
python manage_db.py backup

# 2. Export data (custom script needed)
python export_data.py > data_export.json

# 3. Switch to PostgreSQL in .env
DATABASE_TYPE=postgresql

# 4. Setup PostgreSQL database
python manage_db.py setup

# 5. Import data (custom script needed)
python import_data.py data_export.json
```

### Database Version Management
For future versions, we'll implement Alembic migrations:
```bash
# Initialize migrations (future)
alembic init alembic

# Create migration (future)
alembic revision --autogenerate -m "description"

# Apply migrations (future)
alembic upgrade head
```

## 📚 Additional Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [SQLAlchemy ORM Documentation](https://docs.sqlalchemy.org/)
- [FastAPI Database Guide](https://fastapi.tiangolo.com/tutorial/sql-databases/)
- [Pydantic Settings](https://docs.pydantic.dev/latest/usage/settings/)

## 🆘 Getting Help

If you encounter issues:

1. **Check logs**: Look for error messages in the console
2. **Test configuration**: Run `python test_config.py`
3. **Check database status**: Run `python manage_db.py status`
4. **Reset if needed**: Run `python manage_db.py reset` (⚠️ destroys data)
5. **Create issue**: If problems persist, create a GitHub issue with:
   - Your operating system
   - Python version
   - Database type
   - Error messages
   - Steps to reproduce

---

*This guide covers the comprehensive database setup for ShelfLife.AI. Keep this document updated as the system evolves.*
