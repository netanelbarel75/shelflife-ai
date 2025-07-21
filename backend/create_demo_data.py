#!/usr/bin/env python3

"""
Create demo data for ShelfLife.AI backend testing.
This script creates demo users, inventory items, and marketplace listings.
"""

import sys
import os
from datetime import datetime, timedelta
import uuid

# Add the current directory to Python path
sys.path.insert(0, os.getcwd())

def create_demo_data():
    """Create demo users and data for testing."""
    print("🎭 Creating ShelfLife.AI Demo Data...")
    
    try:
        from app.config import settings
        from app.database import SessionLocal
        from app.models import User, InventoryItem, MarketplaceListing, ItemStatus, ItemSource, ListingStatus
        from app.services.auth_service import AuthService
        
        db = SessionLocal()
        auth_service = AuthService(db)
        
        # Demo users
        demo_users = [
            {
                "email": "demo@shelflife.ai",
                "username": "demouser",
                "password": "demo123",
                "first_name": "Demo",
                "last_name": "User",
                "phone": "+1234567890",
                "city": "San Francisco",
                "state": "CA",
                "country": "USA",
                "latitude": 37.7749,
                "longitude": -122.4194
            },
            {
                "email": "alice@example.com",
                "username": "alice_chef",
                "password": "alice123",
                "first_name": "Alice",
                "last_name": "Smith",
                "phone": "+1234567891",
                "city": "San Francisco",
                "state": "CA", 
                "country": "USA",
                "latitude": 37.7849,
                "longitude": -122.4094
            },
            {
                "email": "bob@example.com",
                "username": "bob_foodie",
                "password": "bob123",
                "first_name": "Bob",
                "last_name": "Johnson",
                "phone": "+1234567892",
                "city": "San Francisco",
                "state": "CA",
                "country": "USA", 
                "latitude": 37.7649,
                "longitude": -122.4294
            }
        ]
        
        created_users = []
        
        print("👥 Creating demo users...")
        for user_data in demo_users:
            # Check if user already exists
            existing_user = db.query(User).filter(User.email == user_data["email"]).first()
            if existing_user:
                print(f"   ⏭️ User {user_data['email']} already exists, skipping...")
                created_users.append(existing_user)
                continue
            
            # Create user
            user = User(
                id=uuid.uuid4(),
                email=user_data["email"],
                username=user_data["username"],
                hashed_password=auth_service.get_password_hash(user_data["password"]),
                first_name=user_data["first_name"],
                last_name=user_data["last_name"],
                phone=user_data["phone"],
                is_active=True,
                is_verified=True,
                city=user_data["city"],
                state=user_data["state"],
                country=user_data["country"],
                latitude=user_data["latitude"],
                longitude=user_data["longitude"],
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            
            db.add(user)
            created_users.append(user)
            print(f"   ✅ Created user: {user_data['email']}")
        
        db.commit()
        print(f"✅ Created {len(created_users)} users")
        
        # Create demo inventory items
        print("🥕 Creating demo inventory items...")
        demo_items = [
            {
                "name": "Organic Bananas",
                "category": "Fruits",
                "brand": "Organic Valley",
                "quantity": 6,
                "unit": "pieces",
                "purchase_price": 4.99,
                "days_until_expiry": 3,
                "status": ItemStatus.NEARING
            },
            {
                "name": "Greek Yogurt",
                "category": "Dairy",
                "brand": "Chobani",
                "quantity": 1,
                "unit": "container",
                "purchase_price": 5.99,
                "days_until_expiry": 2,
                "status": ItemStatus.NEARING
            },
            {
                "name": "Sourdough Bread", 
                "category": "Bakery",
                "brand": "Local Bakery",
                "quantity": 1,
                "unit": "loaf",
                "purchase_price": 6.50,
                "days_until_expiry": 1,
                "status": ItemStatus.NEARING
            },
            {
                "name": "Baby Spinach",
                "category": "Vegetables", 
                "brand": "Organic",
                "quantity": 1,
                "unit": "bag",
                "purchase_price": 3.99,
                "days_until_expiry": 5,
                "status": ItemStatus.FRESH
            },
            {
                "name": "Whole Milk",
                "category": "Dairy",
                "brand": "Horizon",
                "quantity": 1,
                "unit": "gallon",
                "purchase_price": 4.99,
                "days_until_expiry": 7,
                "status": ItemStatus.FRESH
            }
        ]
        
        created_items = []
        for i, item_data in enumerate(demo_items):
            user = created_users[i % len(created_users)]  # Distribute items among users
            
            purchase_date = datetime.utcnow() - timedelta(days=2)
            expiry_date = purchase_date + timedelta(days=item_data["days_until_expiry"])
            
            item = InventoryItem(
                id=uuid.uuid4(),
                user_id=user.id,
                name=item_data["name"],
                category=item_data["category"],
                brand=item_data["brand"],
                quantity=item_data["quantity"],
                unit=item_data["unit"],
                purchase_price=item_data["purchase_price"],
                purchase_date=purchase_date,
                store_name="Demo Store",
                predicted_expiry_date=expiry_date,
                confidence_score=0.85,
                status=item_data["status"],
                source=ItemSource.RECEIPT,
                created_at=datetime.utcnow(),
                last_updated=datetime.utcnow()
            )
            
            db.add(item)
            created_items.append(item)
            print(f"   ✅ Created item: {item_data['name']} (expires in {item_data['days_until_expiry']} days)")
        
        db.commit()
        print(f"✅ Created {len(created_items)} inventory items")
        
        # Create demo marketplace listings
        print("🛒 Creating demo marketplace listings...")
        demo_listings = [
            {
                "title": "Fresh Organic Bananas - Expiring Soon!",
                "description": "6 organic bananas, perfect for smoothies or banana bread. Expiring in 2 days, great deal!",
                "category": "Fruits",
                "quantity": 6,
                "unit": "pieces",
                "price": 2.99,
                "days_until_expiry": 2,
                "delivery_available": True,
                "delivery_radius_miles": 5.0
            },
            {
                "title": "Greek Yogurt - Quick Sale",
                "description": "Unopened Chobani Greek yogurt, expires tomorrow. Perfect for someone who will use it right away!",
                "category": "Dairy", 
                "quantity": 1,
                "unit": "container",
                "price": 3.99,
                "days_until_expiry": 1,
                "delivery_available": False,
                "delivery_radius_miles": 0
            },
            {
                "title": "Artisan Sourdough Bread",
                "description": "Fresh sourdough from local bakery. Expires today but still perfectly good! Great for toast or bread pudding.",
                "category": "Bakery",
                "quantity": 1,
                "unit": "loaf", 
                "price": 4.00,
                "days_until_expiry": 0,
                "delivery_available": True,
                "delivery_radius_miles": 3.0
            }
        ]
        
        created_listings = []
        for i, listing_data in enumerate(demo_listings):
            user = created_users[i % len(created_users)]  # Distribute listings among users
            item = created_items[i % len(created_items)]   # Link to inventory items
            
            expiry_date = datetime.utcnow() + timedelta(days=listing_data["days_until_expiry"])
            available_until = expiry_date - timedelta(hours=6)  # Stop selling 6 hours before expiry
            
            listing = MarketplaceListing(
                id=uuid.uuid4(),
                seller_id=user.id,
                inventory_item_id=item.id,
                title=listing_data["title"],
                description=listing_data["description"],
                category=listing_data["category"],
                quantity=listing_data["quantity"],
                unit=listing_data["unit"],
                price=listing_data["price"],
                currency="USD",
                is_negotiable=True,
                latitude=user.latitude,
                longitude=user.longitude,
                pickup_address=f"{user.city}, {user.state}",
                delivery_available=listing_data["delivery_available"],
                delivery_radius_miles=listing_data["delivery_radius_miles"],
                expiry_date=expiry_date,
                available_from=datetime.utcnow(),
                available_until=available_until,
                status=ListingStatus.ACTIVE,
                views_count=0,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            
            db.add(listing)
            created_listings.append(listing)
            print(f"   ✅ Created listing: {listing_data['title']} (${listing_data['price']})")
        
        db.commit()
        print(f"✅ Created {len(created_listings)} marketplace listings")
        
        print("\n🎉 Demo data created successfully!")
        print("=" * 60)
        print("📧 Demo Login Credentials:")
        print("   Email: demo@shelflife.ai")
        print("   Password: demo123")
        print("")
        print("   Email: alice@example.com") 
        print("   Password: alice123")
        print("")
        print("   Email: bob@example.com")
        print("   Password: bob123")
        print("=" * 60)
        print("🌐 Test the API at: http://localhost:8000/docs")
        print("🔗 Try the login endpoint with the demo credentials!")
        
        db.close()
        
    except Exception as e:
        print(f"❌ Demo data creation failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    create_demo_data()
