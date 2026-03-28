import pymongo
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings

client = AsyncIOMotorClient(settings.MONGODB_URL, serverSelectionTimeoutMS=5000)
db = client.branchiq


async def init_db():
    """Create required indexes for all collections."""
    try:
        # Queries collection
        await db.queries.create_index([("timestamp", pymongo.DESCENDING)])
        await db.queries.create_index([("language", pymongo.ASCENDING)])
        await db.queries.create_index([("escalated", pymongo.ASCENDING)])
        await db.queries.create_index([("session_id", pymongo.ASCENDING)])

        # Users collection
        await db.users.create_index([("email", pymongo.ASCENDING)], unique=True)
        await db.users.create_index([("role", pymongo.ASCENDING)])

        # Requests collection
        await db.requests.create_index([("user_id", pymongo.ASCENDING)])
        await db.requests.create_index([("status", pymongo.ASCENDING)])
        await db.requests.create_index([("type", pymongo.ASCENDING)])
        await db.requests.create_index([("created_at", pymongo.DESCENDING)])

        # Transactions collection
        await db.transactions.create_index([("user_id", pymongo.ASCENDING)])
        await db.transactions.create_index([("timestamp", pymongo.DESCENDING)])

        # Accounts collection
        await db.accounts.create_index([("user_id", pymongo.ASCENDING)], unique=True)
        await db.accounts.create_index(
            [("account_number", pymongo.ASCENDING)], unique=True
        )

        # OTPs collection (with TTL of 10 minutes)
        await db.otps.create_index(
            [("expires_at", pymongo.ASCENDING)], expireAfterSeconds=0
        )
        await db.otps.create_index(
            [("user_id", pymongo.ASCENDING), ("type", pymongo.ASCENDING)]
        )

        print("[OK] MongoDB connected and all indexes created.")
    except Exception as e:
        print(f"[WARN] MongoDB not available: {e}")
        print("   Server will still run - database features will be disabled.")


async def get_db():
    return db


async def save_query(query_data: dict):
    try:
        await db.queries.insert_one(query_data)
        if query_data.get("escalated"):
            await db.escalations.insert_one(query_data)
    except Exception as e:
        print(f"[WARN] Could not save query to DB: {e}")


async def get_session_history(session_id: str):
    try:
        cursor = (
            db.queries.find({"session_id": session_id})
            .sort("timestamp", pymongo.DESCENDING)
            .limit(10)
        )
        docs = await cursor.to_list(length=10)
        docs.reverse()
        history = []
        for doc in docs:
            history.append({"role": "user", "content": doc["user_message"]})
            history.append({"role": "assistant", "content": doc["ai_reply"]})
        return history
    except Exception:
        return []


async def mark_escalated(session_id: str):
    try:
        latest = await db.queries.find_one(
            {"session_id": session_id}, sort=[("timestamp", pymongo.DESCENDING)]
        )
        if latest:
            escalated_doc = latest.copy()
            escalated_doc.pop("_id", None)
            await db.queries.update_one(
                {"_id": latest["_id"]}, {"$set": {"escalated": True}}
            )
            await db.escalations.insert_one(escalated_doc)
    except Exception as e:
        print(f"[WARN] Could not mark escalation: {e}")
