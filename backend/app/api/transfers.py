from datetime import datetime, timezone
from typing import Optional

import pymongo
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.api.auth import get_current_user
from app.db.mongodb import get_db
from app.schemas.user import UserOut

router = APIRouter()


class TransferRequest(BaseModel):
    to_account: str
    amount: float = Field(..., gt=0, le=1000000)
    description: Optional[str] = ""


@router.post("/transfers/")
async def make_transfer(
    transfer: TransferRequest, current_user: UserOut = Depends(get_current_user)
):
    db = await get_db()

    sender_account = await db.accounts.find_one({"user_id": current_user.id})
    if not sender_account:
        raise HTTPException(status_code=404, detail="Your account not found")
    if sender_account["status"] != "active":
        raise HTTPException(status_code=400, detail="Account is frozen")
    if sender_account["balance"] < transfer.amount:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient balance. Available: ₹{sender_account['balance']:.2f}",
        )
    if sender_account["account_number"] == transfer.to_account:
        raise HTTPException(status_code=400, detail="Cannot transfer to yourself")

    recipient_account = await db.accounts.find_one(
        {"account_number": transfer.to_account}
    )
    now = datetime.now(timezone.utc)
    ref_id = f"TXN{int(now.timestamp() * 1000)}"

    try:
        async with await db.client.start_session() as session:
            async with session.start_transaction():
                # Debit sender
                await db.accounts.update_one(
                    {"_id": sender_account["_id"]},
                    {"$inc": {"balance": -transfer.amount}},
                    session=session,
                )
                await db.transactions.insert_one(
                    {
                        "user_id": current_user.id,
                        "account_id": sender_account["account_number"],
                        "type": "debit",
                        "amount": transfer.amount,
                        "description": f"Transfer to {transfer.to_account}"
                        + (f": {transfer.description}" if transfer.description else ""),
                        "reference_id": ref_id,
                        "timestamp": now,
                    },
                    session=session,
                )

                # Credit recipient if they exist in system
                if recipient_account:
                    await db.accounts.update_one(
                        {"_id": recipient_account["_id"]},
                        {"$inc": {"balance": transfer.amount}},
                        session=session,
                    )
                    await db.transactions.insert_one(
                        {
                            "user_id": recipient_account["user_id"],
                            "account_id": transfer.to_account,
                            "type": "credit",
                            "amount": transfer.amount,
                            "description": f"Transfer from {sender_account['account_number']}"
                            + (
                                f": {transfer.description}"
                                if transfer.description
                                else ""
                            ),
                            "reference_id": ref_id + "C",
                            "timestamp": now,
                        },
                        session=session,
                    )
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Transfer failed during processing: {str(e)}"
        )

    updated = await db.accounts.find_one({"_id": sender_account["_id"]})
    return {
        "message": "Transfer successful",
        "amount": transfer.amount,
        "to_account": transfer.to_account,
        "new_balance": updated["balance"],
        "reference_id": ref_id,
    }


@router.get("/transfers/")
async def list_transfers(current_user: UserOut = Depends(get_current_user)):
    db = await get_db()
    cursor = (
        db.transactions.find({"user_id": current_user.id})
        .sort("timestamp", pymongo.DESCENDING)
        .limit(50)
    )
    txs = await cursor.to_list(length=50)
    return [
        {
            "id": str(tx["_id"]),
            "type": tx["type"],
            "amount": tx["amount"],
            "description": tx.get("description", ""),
            "reference_id": tx.get("reference_id", ""),
            "timestamp": tx["timestamp"].isoformat(),
        }
        for tx in txs
    ]
