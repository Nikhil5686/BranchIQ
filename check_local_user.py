import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

LOCAL_URI = "mongodb://localhost:27017"

async def check_local_user():
    print(f"Connecting to LOCAL database...")
    try:
        client = AsyncIOMotorClient(LOCAL_URI, serverSelectionTimeoutMS=2000)
        db = client.branchiq
        email = "nikhilshukla5686@gmail.com"
        
        user = await db.users.find_one({"email": email})
        if user:
            print(f"[OK] User found in LOCAL: {user['email']}")
            print(f"Role: {user['role']}")
        else:
            print("[FAIL] User NOT found in LOCAL database.")
        client.close()
    except Exception as e:
        print(f"Error connecting to local MongoDB: {e}")

if __name__ == "__main__":
    asyncio.run(check_local_user())
