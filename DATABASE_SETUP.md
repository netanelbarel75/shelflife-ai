# ShelfLife.AI Database Setup Troubleshooting Guide

## 🔍 Quick Diagnosis

Run this command to test your database connection:
```bash
cd /home/netanelm/shelflife-ai/backend
python3 test-database.py
```

## 🚀 Solution 1: Docker Setup (Recommended)

### Start PostgreSQL with Docker:
```bash
cd /home/netanelm/shelflife-ai
docker-compose up -d postgres redis

# Wait 30 seconds, then test
cd backend
python3 test-database.py

# If successful, start backend
source venv/bin/activate && python3 main.py
```

### View Docker logs if issues:
```bash
docker-compose logs postgres
```

### Stop and restart if needed:
```bash
docker-compose down
docker-compose up -d postgres redis
```

## 🔧 Solution 2: Local PostgreSQL

### Install and setup local PostgreSQL:
```bash
cd /home/netanelm/shelflife-ai/backend
chmod +x setup-local-postgres.sh
./setup-local-postgres.sh
```

### Test connection:
```bash
python3 test-database.py
```

## 🐛 Common Issues & Fixes

### Issue: "role postgres does not exist"
**Fix:** Your PostgreSQL wasn't started with the correct configuration.
```bash
# Use Docker (recommended):
docker-compose up -d postgres

# OR setup local PostgreSQL:
./setup-local-postgres.sh
```

### Issue: "Connection refused"
**Fix:** PostgreSQL server is not running.
```bash
# For Docker:
docker-compose up -d postgres

# For local PostgreSQL:
sudo systemctl start postgresql
```

### Issue: "database does not exist" 
**Fix:** Database wasn't created.
```bash
# Docker will create it automatically:
docker-compose up -d postgres

# For local setup:
sudo -u postgres createdb shelflife_db
```

### Issue: Docker not working
**Fix:** Make sure Docker is installed and running:
```bash
# Check Docker status:
docker --version
docker info

# Start Docker if stopped:
sudo systemctl start docker
```

## 📊 Verify Everything Works

### 1. Test database connection:
```bash
python3 test-database.py
```

### 2. Start the backend:
```bash
source venv/bin/activate
python3 main.py
```

### 3. Test the API:
```bash
curl http://localhost:8000/health
```

Should return:
```json
{
  "status": "healthy",
  "service": "ShelfLife.AI API",
  "version": "1.0.0"
}
```

## 🔍 Debug Information

Your current configuration:
- **Database URL:** postgresql://shelflife_user:shelflife_pass@localhost:5432/shelflife_db
- **Expected credentials:** User: `shelflife_user`, Password: `shelflife_pass`, DB: `shelflife_db`

## 📞 Still Need Help?

1. Run `python3 test-database.py` and share the output
2. Check Docker logs: `docker-compose logs postgres`  
3. Verify your `.env` file matches the expected configuration
