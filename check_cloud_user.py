import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

# Using the URI from your .env file
CLOUD_URI = "mongodb+srv://rajn5686_db_user:Nikhil5686@nikhil5686.kcs0kd5.mongodb.net/branchiq?retryWrites=true&w=majority&appName=nikhil5686"

async def check_cloud_user():
    print(f"Connecting to CLOUD database...")
    client = AsyncIOMotorClient(CLOUD_URI)
    db = client.branchiq
    email = "nikhilshukla5686@gmail.com"
    
    user = await db.users.find_one({"email": email})
    if user:
        print(f"[OK] User found in CLOUD: {user['email']}")
        print(f"Role: {user['role']}")
    else:
        print("[FAIL] User NOT found in CLOUD database.")
        
    client.close()

if __name__ == "__main__":
    asyncio.run(check_cloud_user())
