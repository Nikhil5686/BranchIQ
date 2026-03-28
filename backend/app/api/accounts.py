from datetime import datetime, timezone

import pymongo
from fastapi import APIRouter, Depends, HTTPException

from app.api.auth import get_current_user
from app.db.mongodb import get_db
from app.schemas.user import UserOut

router = APIRouter()


@router.get("/accounts/me")
async def get_my_account(current_user: UserOut = Depends(get_current_user)):
    db = await get_db()
    account = await db.accounts.find_one({"user_id": current_user.id})
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    # Recent 5 transactions
    cursor = (
        db.transactions.find({"user_id": current_user.id})
        .sort("timestamp", pymongo.DESCENDING)
        .limit(5)
    )
    recent = await cursor.to_list(length=5)

    return {
        "id": str(account["_id"]),
        "account_number": account["account_number"],
        "account_type": account["account_type"],
        "balance": account["balance"],
        "status": account["status"],
        "card_applied": account.get("card_applied", False),
        "has_atm_pin": account.get("atm_pin_hash") is not None,
        "created_at": account["created_at"].isoformat(),
        "recent_transactions": [
            {
                "id": str(tx["_id"]),
                "type": tx["type"],
                "amount": tx["amount"],
                "description": tx.get("description", ""),
                "reference_id": tx.get("reference_id", ""),
                "timestamp": tx["timestamp"].isoformat(),
            }
            for tx in recent
        ],
    }
