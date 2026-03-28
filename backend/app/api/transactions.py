from datetime import datetime, timezone
from typing import List

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from app.api.auth import get_current_user
from app.db.mongodb import get_db
from app.schemas.transaction import TransactionCreate, TransactionOut
from app.schemas.user import UserOut

router = APIRouter()


@router.post("/transactions/", response_model=TransactionOut)
async def create_transaction(
    transaction_in: TransactionCreate, current_user: UserOut = Depends(get_current_user)
):
    db = await get_db()

    transaction_dict = {
        "user_id": current_user.id,
        "account_id": transaction_in.account_id,
        "amount": transaction_in.amount,
        "type": transaction_in.type,
        "description": transaction_in.description,
        "reference_id": transaction_in.reference_id,
        "timestamp": datetime.now(timezone.utc),
    }

    result = await db.transactions.insert_one(transaction_dict)
    transaction_dict["id"] = str(result.inserted_id)

    # Audit log
    await db.queries.insert_one(
        {
            "session_id": f"TX_{transaction_dict['id']}",
            "user_id": current_user.id,
            "user_message": f"Performed {transaction_in.type} of {transaction_in.amount} for {transaction_in.account_id}",
            "ai_reply": "Transaction processed successfully.",
            "language": "en",
            "timestamp": datetime.now(timezone.utc),
            "escalated": transaction_in.amount
            > 50000,  # Auto-escalate large transactions
            "channel": "system",
        }
    )

    return TransactionOut(**transaction_dict)


@router.get("/transactions/", response_model=List[TransactionOut])
async def list_transactions(current_user: UserOut = Depends(get_current_user)):
    db = await get_db()
    cursor = (
        db.transactions.find({"user_id": current_user.id})
        .sort("timestamp", -1)
        .limit(20)
    )
    txs = await cursor.to_list(length=20)

    for tx in txs:
        tx["id"] = str(tx["_id"])

    return [TransactionOut(**tx) for tx in txs]
