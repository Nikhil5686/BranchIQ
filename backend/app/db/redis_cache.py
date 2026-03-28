import redis.asyncio as redis

from app.core.config import settings

redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)


async def get_redis():
    return redis_client


async def set_session(session_id: str, data: str):
    try:
        # Store session with 30 minute TTL (1800 seconds)
        await redis_client.setex(f"session:{session_id}", 1800, data)
    except Exception as e:
        print(f"⚠️  Redis not available (set_session): {e}")


async def get_session(session_id: str):
    try:
        return await redis_client.get(f"session:{session_id}")
    except Exception as e:
        print(f"⚠️  Redis not available (get_session): {e}")
        return None
