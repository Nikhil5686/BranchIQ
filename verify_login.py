import asyncio
import sys
import os
from motor.motor_asyncio import AsyncIOMotorClient

# Add backend directory to sys.path to import modules
sys.path.append(os.path.abspath(os.path.join(os.getcwd(), 'backend')))

from app.core.config import settings
from app.core.security import verify_password

async def verify_login():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client.branchiq
    email = "nikhilshukla5686@gmail.com"
    password = "Nikhil@12345"
    
    print(f"Testing login for: {email}")
    user = await db.users.find_one({"email": email})
    
    if user:
        is_ok = verify_password(password, user["hashed_password"])
        if is_ok:
            print("[OK] Login successful! Password matches.")
            print(f"Role: {user['role']}")
        else:
            print("[FAIL] Password mismatch!")
    else:
        print("[FAIL] User not found!")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(verify_login())
