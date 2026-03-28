import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import sys
import os

# Add backend directory to sys.path to import modules
sys.path.append(os.path.abspath(os.path.join(os.getcwd(), 'backend')))

from app.core.config import settings

async def list_users_to_file():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client.branchiq
    output_file = "users_list.txt"
    with open(output_file, "w") as f:
        f.write("Listing all users from database:\n")
        cursor = db.users.find({})
        users = await cursor.to_list(length=1000)
        for user in users:
            f.write(f"- {user['email']} (Role: {user.get('role')})\n")
        
        if not users:
            f.write("No users found in database.\n")
            
    print(f"Users listed in {output_file}")
    client.close()

if __name__ == "__main__":
    asyncio.run(list_users_to_file())
