import asyncio
import sys
import os
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient

# Add backend directory to sys.path to import modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Try to use app's config and security
try:
    from app.core.config import settings
    from app.core.security import get_password_hash
    MONGO_URI = settings.MONGODB_URL
    DB_NAME = "branchiq"
except ImportError:
    # Fallback to hardcoded values from seed_db.py if app structure is not findable
    # This shouldn't happen but is a safety measure
    MONGO_URI = "mongodb+srv://rajn5686_db_user:Nikhil5686@nikhil5686.kcs0kd5.mongodb.net/branchiq?retryWrites=true&w=majority&appName=nikhil5686"
    DB_NAME = "branchiq"
    
    # We'll need a way to hash the password if we can't import get_password_hash
    # But given our path manipulation it should work.
    pass

async def seed_admin():
    print(f"Connecting to database: {DB_NAME}")
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[DB_NAME]
    
    email = "nikhilshukla5686@gmail.com"
    password = "Nikhil@12345"
    
    # Check if admin already exists
    existing_user = await db.users.find_one({"email": email})
    
    if existing_user:
        print(f"Admin user '{email}' already exists. Updating password hash to ensure it matches '{password}'.")
        admin_pw = get_password_hash(password)
        await db.users.update_one(
            {"email": email},
            {"$set": {"hashed_password": admin_pw, "role": "admin", "email_verified": True, "phone_verified": True}}
        )
        admin_id = str(existing_user["_id"])
    else:
        print(f"Creating new admin user: {email}")
        admin_pw = get_password_hash(password)
        admin_result = await db.users.insert_one({
            "name": "Nikhil Shukla",
            "email": email,
            "hashed_password": admin_pw,
            "role": "admin",
            "phone": "+91-9999999999",
            "address": "Lucknow, Uttar Pradesh",
            "profile_photo": None,
            "email_verified": True,
            "phone_verified": True,
            "created_at": datetime.now(timezone.utc),
        })
        admin_id = str(admin_result.inserted_id)
        print(f"Admin user created with ID: {admin_id}")

    # Ensure admin has an account for testing
    existing_account = await db.accounts.find_one({"user_id": admin_id})
    if not existing_account:
        print("Creating test account for admin...")
        await db.accounts.insert_one({
            "user_id": admin_id,
            "account_number": "IQADMIN00001",
            "account_type": "current",
            "balance": 999999.00,
            "atm_pin_hash": None,
            "card_applied": True,
            "card_status": "approved",
            "status": "active",
            "created_at": datetime.now(timezone.utc),
        })
        print("Admin account IQADMIN00001 created.")
    else:
        print(f"Admin account already exists: {existing_account['account_number']}")

    print("\n--- SAFE SEED COMPLETE ---")
    print(f"Admin Login: {email} / {password}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_admin())
