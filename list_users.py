import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import sys
import os

# Add backend directory to sys.path to import modules
sys.path.append(os.path.abspath(os.path.join(os.getcwd(), 'backend')))

from app.core.config import settings

async def list_users():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client.branchiq
    print("Listing all users:")
    cursor = db.users.find({})
    users = await cursor.to_list(length=100)
    for user in users:
        print(f"- {user['email']} (Role: {user.get('role')})")
    
    if not users:
        print("No users found in database.")
        
    client.close()

if __name__ == "__main__":
    asyncio.run(list_users())
