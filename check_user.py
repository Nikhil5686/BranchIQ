import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import sys
import os

# Add backend directory to sys.path to import modules
sys.path.append(os.path.abspath(os.path.join(os.getcwd(), 'backend')))

from app.core.config import settings
from app.core.security import verify_password, get_password_hash

async def check_user():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client.branchiq
    user_email = "nikhilshukla5686@gmail.com"
    user_password = "Nikhil@12345"
    
    print(f"Checking user: {user_email}")
    user = await db.users.find_one({"email": user_email})
    
    if user:
        print(f"User found: {user['email']}")
        print(f"Role: {user.get('role')}")
        print(f"Hashed password in DB: {user.get('hashed_password')}")
        
        is_correct = verify_password(user_password, user['hashed_password'])
        print(f"Password matches: {is_correct}")
        
        if not is_correct:
            new_hash = get_password_hash(user_password)
            print(f"Suggested hash for this password: {new_hash}")
    else:
        print("User not found in database.")
        
    client.close()

if __name__ == "__main__":
    asyncio.run(check_user())
