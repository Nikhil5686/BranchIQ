import random
import string
from datetime import datetime, timedelta, timezone


def generate_otp(length: int = 6) -> str:
    """Generate a numeric OTP code."""
    return "".join(random.choices(string.digits, k=length))


async def store_otp(user_id: str, otp_type: str, code: str):
    """Store OTP in DB with 10-minute expiry. Overwrites existing OTP of same type."""
    from app.db.mongodb import get_db

    db = await get_db()
    expiry = datetime.now(timezone.utc) + timedelta(minutes=10)
    await db.otps.update_one(
        {"user_id": user_id, "type": otp_type},
        {"$set": {"code": code, "expires_at": expiry, "used": False}},
        upsert=True,
    )


async def verify_otp(user_id: str, otp_type: str, code: str) -> bool:
    """Validate OTP and mark as used if correct."""
    from app.db.mongodb import get_db

    db = await get_db()
    otp_doc = await db.otps.find_one(
        {
            "user_id": user_id,
            "type": otp_type,
            "code": code,
            "used": False,
            "expires_at": {"$gt": datetime.now(timezone.utc)},
        }
    )
    if otp_doc:
        await db.otps.update_one({"_id": otp_doc["_id"]}, {"$set": {"used": True}})
        return True
    return False


async def send_otp_to_user(user_id: str, otp_type: str) -> str:
    """Generate, store, and return OTP (simulated — no external provider)."""
    code = generate_otp()
    await store_otp(user_id, otp_type, code)
    print(f"[DEV-OTP] type={otp_type} user={user_id} code={code}")
    return code
