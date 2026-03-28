import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import json
from bson import json_util
import os

CLOUD_URI = "mongodb+srv://rajn5686_db_user:Nikhil5686@nikhil5686.kcs0kd5.mongodb.net/branchiq?retryWrites=true&w=majority&appName=nikhil5686"

async def inspect_cloud_user_to_file():
    client = AsyncIOMotorClient(CLOUD_URI)
    db = client.branchiq
    email = "nikhilshukla5686@gmail.com"
    
    user = await db.users.find_one({"email": email})
    with open("cloud_user_inspect.txt", "w") as f:
        if user:
            f.write(f"User found: {user['email']}\n")
            user_json = json.loads(json_util.dumps(user))
            f.write(json.dumps(user_json, indent=2))
            f.write("\n\nField Types:\n")
            for key, value in user.items():
                f.write(f"- {key}: {type(value)}\n")
        else:
            f.write("User not found in cloud.")
            
    client.close()

if __name__ == "__main__":
    asyncio.run(inspect_cloud_user_to_file())
