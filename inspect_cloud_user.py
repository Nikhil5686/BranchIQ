import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import json
from bson import json_util

CLOUD_URI = "mongodb+srv://rajn5686_db_user:Nikhil5686@nikhil5686.kcs0kd5.mongodb.net/branchiq?retryWrites=true&w=majority&appName=nikhil5686"

async def inspect_cloud_user():
    print(f"Inspecting CLOUD user data structure...")
    client = AsyncIOMotorClient(CLOUD_URI)
    db = client.branchiq
    email = "nikhilshukla5686@gmail.com"
    
    user = await db.users.find_one({"email": email})
    if user:
        print(f"User found: {user['email']}")
        # Convert BSON to JSON for clear inspection
        user_json = json.loads(json_util.dumps(user))
        print(json.dumps(user_json, indent=2))
        
        # Check specific types
        print(f"\nField Types:")
        for key, value in user.items():
            print(f"- {key}: {type(value)}")
    else:
        print("User not found in cloud.")
        
    client.close()

if __name__ == "__main__":
    asyncio.run(inspect_cloud_user())
