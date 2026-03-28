import asyncio
import sys
import random
import uuid
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient

# Ensure local app imports work
sys.path.insert(0, '.')
from app.core.config import settings
from app.core.security import get_password_hash

MONGO_URI = settings.MONGODB_URL
DB_NAME = "branchiq"

LANGUAGES = ["en", "hi", "gu", "ta", "te", "mr"]
REQ_TYPES = ["atm", "complaint", "loan", "cheque", "card"]
TX_TYPES = ["credit", "debit"]
REQ_DESCRIPTIONS = {
    "atm": "My ATM card is not working at the ATM machine.",
    "complaint": "Deducted extra charges from my account without notice.",
    "loan": "Requesting a home loan of 50 lakhs for 20 years tenure.",
    "cheque": "Please issue a new cheque book for my account.",
    "card": "Please issue a new debit card for my account.",
}


def generate_account_number():
    return "IQ" + ''.join([str(random.randint(0, 9)) for _ in range(10)])


async def seed_database():
    print("Initiating Production-Grade BranchIQ Seeding...")
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[DB_NAME]

    # ─── Clear everything ───────────────────────────────────────────────────────
    for col in ["queries", "escalations", "users", "requests", "transactions", "accounts", "otps"]:
        await db[col].delete_many({})
    print("Cleared all collections.")

    # ─── Admin User ─────────────────────────────────────────────────────────────
    admin_email = settings.admin_email_list[0]
    admin_pw = get_password_hash(settings.ADMIN_DEFAULT_PASSWORD)
    admin_result = await db.users.insert_one({
        "name": "Nikhil Shukla",
        "email": admin_email,
        "hashed_password": admin_pw,
        "role": "admin",
        "phone": "+91-9999999999",
        "address": "Lucknow, Uttar Pradesh",
        "profile_photo": None,
        "email_verified": True,
        "phone_verified": True,
        "created_at": datetime.now(timezone.utc),
    })
    admin_id = str(admin_result.inserted_id)

    # Admin also gets an account (for testing)
    await db.accounts.insert_one({
        "user_id": admin_id,
        "account_number": "IQADMIN00001",
        "account_type": "current",
        "balance": 999999.00,
        "atm_pin_hash": None,
        "card_applied": True,
        "card_status": "approved",
        "status": "active",
        "created_at": datetime.now(timezone.utc),
    })
    print(f"Admin user created: {admin_email} / {settings.ADMIN_DEFAULT_PASSWORD}")

    # ─── Test Customers ──────────────────────────────────────────────────────────
    customer_pw = get_password_hash("password123")
    customers = [
        {"name": "Priya Sharma", "email": "priya@example.com", "phone": "+91-9876543210", "address": "Mumbai, Maharashtra"},
        {"name": "Rahul Verma", "email": "rahul@example.com", "phone": "+91-9865432100", "address": "Delhi"},
        {"name": "Anita Patel", "email": "anita@example.com", "phone": "+91-9754321001", "address": "Ahmedabad, Gujarat"},
        {"name": "Suresh Kumar", "email": "suresh@example.com", "phone": "+91-9643210011", "address": "Chennai, Tamil Nadu"},
        {"name": "Meena Iyer", "email": "meena@example.com", "phone": "+91-9532100112", "address": "Bangalore, Karnataka"},
    ]

    user_ids = []
    for c in customers:
        result = await db.users.insert_one({
            "name": c["name"],
            "email": c["email"],
            "hashed_password": customer_pw,
            "role": "customer",
            "phone": c["phone"],
            "address": c["address"],
            "profile_photo": None,
            "email_verified": True,
            "phone_verified": True,
            "created_at": datetime.now(timezone.utc),
        })
        uid = str(result.inserted_id)
        user_ids.append(uid)

        # Create bank account
        acc_num = generate_account_number()
        while await db.accounts.find_one({"account_number": acc_num}):
            acc_num = generate_account_number()

        await db.accounts.insert_one({
            "user_id": uid,
            "account_number": acc_num,
            "account_type": "savings",
            "balance": round(random.uniform(5000, 150000), 2),
            "atm_pin_hash": None,
            "card_applied": random.choice([True, False]),
            "status": "active",
            "created_at": datetime.now(timezone.utc),
        })

    print(f"Created {len(customers)} test customers (Password: password123)")

    # ─── Chat Queries ────────────────────────────────────────────────────────────
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    queries = []
    for _ in range(200):
        ts = today + timedelta(hours=random.randint(9, 16), minutes=random.randint(0, 59))
        escalated = random.random() < 0.1
        queries.append({
            "session_id": str(uuid.uuid4()),
            "user_id": random.choice(user_ids),
            "user_message": random.choice(["Balance inquiry", "Transfer help", "Loan details", "Card blocked"]),
            "ai_reply": "I'll connect you to a human agent right away." if escalated else "Here's the information you need.",
            "language": random.choice(LANGUAGES),
            "timestamp": ts,
            "escalated": escalated,
            "resolution_time_seconds": round(random.uniform(0.5, 3.0), 2),
            "channel": random.choice(["chat", "voice"]),
        })
    await db.queries.insert_many(queries)
    print(f"Created {len(queries)} chat queries.")

    # ─── Banking Requests ────────────────────────────────────────────────────────
    req_data = []
    statuses = ["pending", "pending", "pending", "resolved", "rejected"]
    for i in range(80):
        ts = today + timedelta(hours=random.randint(9, 16), minutes=random.randint(0, 59), days=-random.randint(0, 7))
        req_type = random.choice(REQ_TYPES)
        req_data.append({
            "user_id": random.choice(user_ids),
            "type": req_type,
            "description": REQ_DESCRIPTIONS[req_type],
            "priority": random.choice(["low", "medium", "high"]),
            "status": random.choice(statuses),
            "created_at": ts,
            "updated_at": ts,
        })
    await db.requests.insert_many(req_data)
    print(f"Created {len(req_data)} banking requests.")

    # ─── Transactions ────────────────────────────────────────────────────────────
    accounts = await db.accounts.find({"user_id": {"$in": user_ids}}).to_list(100)
    txs = []
    for _ in range(150):
        acc = random.choice(accounts)
        ts = today + timedelta(hours=random.randint(9, 16), minutes=random.randint(0, 59), days=-random.randint(0, 30))
        tx_type = random.choice(TX_TYPES)
        txs.append({
            "user_id": acc["user_id"],
            "account_id": acc["account_number"],
            "type": tx_type,
            "amount": round(random.uniform(100, 10000), 2),
            "description": random.choice(["Online purchase", "ATM withdrawal", "UPI transfer", "EMI deduction", "Salary credit"]),
            "reference_id": f"TXN{random.randint(1000000, 9999999)}",
            "timestamp": ts,
        })
    await db.transactions.insert_many(txs)
    print(f"Created {len(txs)} transactions.")

    print("\n--- SEED COMPLETE ---")
    print(f"Admin Login  : {admin_email} / {settings.ADMIN_DEFAULT_PASSWORD}")
    print(f"User Login   : priya@example.com / password123")
    print(f"DB           : {DB_NAME}")

    client.close()


if __name__ == "__main__":
    asyncio.run(seed_database())
