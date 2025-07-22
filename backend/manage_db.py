#!/usr/bin/env python3

"""
Database Management Utility for ShelfLife.AI
Provides commands for database setup, migration, reset, and maintenance.

Usage:
    python manage_db.py setup     # Setup database (create tables)
    python manage_db.py reset     # Reset database (drop and recreate)
    python manage_db.py status    # Show database status
    python manage_db.py migrate   # Run database migrations (future)
    python manage_db.py backup    # Backup database (SQLite only)
    python manage_db.py restore   # Restore database (SQLite only)
    python manage_db.py demo      # Create demo data
    python manage_db.py clean     # Clean up old data
"""

import sys
import os
import argparse
import shutil
from datetime import datetime, timedelta
from pathlib import Path

# Add the current directory to Python path
sys.path.insert(0, os.getcwd())

def setup_database():
    """Setup database by creating all tables."""
    print("🏗️ Setting up ShelfLife.AI Database...")
    
    try:
        from app.config import settings
        from app.database import create_tables, get_database_info
        
        print(f"Database: {settings._mask_db_url(settings.DATABASE_URL)}")
        print(f"Type: {settings.get_database_type()}")
        
        # Create tables
        import asyncio
        asyncio.run(create_tables())
        
        print("✅ Database setup completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Database setup failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def reset_database():
    """Reset database by dropping and recreating all tables."""
    print("🗑️ Resetting ShelfLife.AI Database...")
    
    # Confirm destructive action
    response = input("⚠️  This will DELETE ALL DATA. Are you sure? (yes/no): ")
    if response.lower() not in ['yes', 'y']:
        print("❌ Database reset cancelled.")
        return False
    
    try:
        from app.config import settings
        from app.database import reset_database as db_reset
        
        print(f"Database: {settings._mask_db_url(settings.DATABASE_URL)}")
        
        # Reset database
        db_reset()
        
        print("✅ Database reset completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Database reset failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def show_database_status():
    """Show database status and information."""
    print("📊 ShelfLife.AI Database Status")
    print("=" * 50)
    
    try:
        from app.config import settings
        from app.database import engine, check_database_health, get_pool_status
        from sqlalchemy import inspect, text
        
        # Configuration info
        config = settings.get_config_summary()
        print("Configuration:")
        for key, value in config.items():
            if 'database' in key:
                print(f"  {key}: {value}")
        
        print(f"  Environment: {settings.ENVIRONMENT}")
        
        # Database health
        import asyncio
        health = asyncio.run(check_database_health())
        print(f"\nDatabase Health:")
        print(f"  Status: {health['status']}")
        if 'database' in health:
            print(f"  Info: {health['database']}")
        if 'error' in health:
            print(f"  Error: {health['error']}")
        
        if health['status'] == 'healthy':
            # Table information
            inspector = inspect(engine)
            tables = inspector.get_table_names()
            
            print(f"\nTables ({len(tables)}):")
            if tables:
                try:
                    with engine.connect() as conn:
                        for table in sorted(tables):
                            try:
                                result = conn.execute(text(f"SELECT COUNT(*) FROM {table}")).fetchone()
                                count = result[0] if result else 0
                                print(f"  {table}: {count:,} records")
                            except Exception as e:
                                print(f"  {table}: Error getting count - {e}")
                except Exception as e:
                    print(f"  Could not get table counts: {e}")
            else:
                print("  No tables found")
            
            # Connection pool info
            pool_info = get_pool_status()
            if 'pool_size' in pool_info:
                print(f"\nConnection Pool:")
                for key, value in pool_info.items():
                    print(f"  {key}: {value}")
        
        return True
        
    except Exception as e:
        print(f"❌ Failed to get database status: {e}")
        import traceback
        traceback.print_exc()
        return False

def backup_database():
    """Backup SQLite database."""
    try:
        from app.config import settings
        
        if not settings.is_sqlite():
            print("❌ Backup is only supported for SQLite databases")
            return False
        
        # Extract SQLite path from DATABASE_URL
        db_path = settings.DATABASE_URL.replace('sqlite:///', '').replace('sqlite://', '')
        
        if not os.path.exists(db_path):
            print(f"❌ Database file not found: {db_path}")
            return False
        
        # Create backup filename with timestamp
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_path = f"{db_path}.backup_{timestamp}"
        
        print(f"📋 Backing up database...")
        print(f"  Source: {db_path}")
        print(f"  Backup: {backup_path}")
        
        shutil.copy2(db_path, backup_path)
        
        print("✅ Database backup completed successfully!")
        print(f"💾 Backup saved to: {backup_path}")
        
        return True
        
    except Exception as e:
        print(f"❌ Database backup failed: {e}")
        return False

def restore_database():
    """Restore SQLite database from backup."""
    try:
        from app.config import settings
        
        if not settings.is_sqlite():
            print("❌ Restore is only supported for SQLite databases")
            return False
        
        # Extract SQLite path from DATABASE_URL
        db_path = settings.DATABASE_URL.replace('sqlite:///', '').replace('sqlite://', '')
        
        # Find available backups
        db_dir = Path(db_path).parent
        backup_files = list(db_dir.glob(f"{Path(db_path).name}.backup_*"))
        
        if not backup_files:
            print("❌ No backup files found")
            return False
        
        # Sort by modification time (newest first)
        backup_files.sort(key=lambda x: x.stat().st_mtime, reverse=True)
        
        print("📋 Available backups:")
        for i, backup_file in enumerate(backup_files):
            mtime = datetime.fromtimestamp(backup_file.stat().st_mtime)
            size = backup_file.stat().st_size
            print(f"  {i+1}. {backup_file.name} ({size:,} bytes, {mtime.strftime('%Y-%m-%d %H:%M:%S')})")
        
        # Get user selection
        try:
            choice = int(input("\nSelect backup to restore (number): ")) - 1
            if choice < 0 or choice >= len(backup_files):
                print("❌ Invalid selection")
                return False
        except (ValueError, KeyboardInterrupt):
            print("❌ Restore cancelled")
            return False
        
        selected_backup = backup_files[choice]
        
        # Confirm destructive action
        response = input(f"⚠️  This will REPLACE the current database with {selected_backup.name}. Continue? (yes/no): ")
        if response.lower() not in ['yes', 'y']:
            print("❌ Restore cancelled")
            return False
        
        # Backup current database first
        if os.path.exists(db_path):
            current_backup = f"{db_path}.before_restore_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            shutil.copy2(db_path, current_backup)
            print(f"💾 Current database backed up to: {current_backup}")
        
        # Restore from backup
        print(f"📋 Restoring database from {selected_backup.name}...")
        shutil.copy2(selected_backup, db_path)
        
        print("✅ Database restore completed successfully!")
        
        return True
        
    except Exception as e:
        print(f"❌ Database restore failed: {e}")
        return False

def create_demo_data():
    """Create demo data by running the create_demo_data.py script."""
    print("🎭 Creating demo data...")
    
    try:
        # Import and run the demo data creation
        from create_demo_data import create_demo_data
        create_demo_data()
        return True
        
    except Exception as e:
        print(f"❌ Demo data creation failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def clean_old_data():
    """Clean up old data based on retention policies."""
    print("🧹 Cleaning up old data...")
    
    try:
        from app.config import settings
        from app.database import SessionLocal
        from app.models import Receipt, Message
        from sqlalchemy import and_
        
        db = SessionLocal()
        
        # Clean up old receipts (older than 1 year)
        cutoff_date = datetime.utcnow() - timedelta(days=365)
        
        old_receipts = db.query(Receipt).filter(Receipt.created_at < cutoff_date).count()
        if old_receipts > 0:
            db.query(Receipt).filter(Receipt.created_at < cutoff_date).delete()
            print(f"  🗑️ Cleaned up {old_receipts} old receipts")
        
        # Clean up old messages (older than 6 months)
        message_cutoff = datetime.utcnow() - timedelta(days=180)
        old_messages = db.query(Message).filter(Message.created_at < message_cutoff).count()
        if old_messages > 0:
            db.query(Message).filter(Message.created_at < message_cutoff).delete()
            print(f"  💬 Cleaned up {old_messages} old messages")
        
        db.commit()
        db.close()
        
        print("✅ Data cleanup completed!")
        return True
        
    except Exception as e:
        print(f"❌ Data cleanup failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Main CLI interface."""
    parser = argparse.ArgumentParser(
        description="ShelfLife.AI Database Management Utility",
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    
    parser.add_argument(
        'command',
        choices=['setup', 'reset', 'status', 'migrate', 'backup', 'restore', 'demo', 'clean'],
        help='Database management command to run'
    )
    
    args = parser.parse_args()
    
    print("🍃 ShelfLife.AI Database Manager")
    print("=" * 40)
    
    commands = {
        'setup': setup_database,
        'reset': reset_database,
        'status': show_database_status,
        'migrate': lambda: print("🚧 Database migrations not yet implemented"),
        'backup': backup_database,
        'restore': restore_database,
        'demo': create_demo_data,
        'clean': clean_old_data,
    }
    
    try:
        success = commands[args.command]()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n❌ Operation cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
