from datetime import datetime, timezone
from typing import List

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from app.api.auth import get_current_user
from app.db.mongodb import get_db
from app.schemas.request import BankRequestCreate, BankRequestOut
from app.schemas.user import UserOut

router = APIRouter()


@router.post("/requests/", response_model=BankRequestOut)
async def create_request(
    request_in: BankRequestCreate, current_user: UserOut = Depends(get_current_user)
):
    db = await get_db()

    request_dict = {
        "user_id": current_user.id,
        "type": request_in.type,
        "description": request_in.description,
        "priority": request_in.priority,
        "status": "pending",
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }

    result = await db.requests.insert_one(request_dict)
    request_dict["id"] = str(result.inserted_id)

    # Also log an audit entry in the queries/events collection
    await db.queries.insert_one(
        {
            "session_id": f"REQ_{request_dict['id']}",
            "user_id": current_user.id,
            "user_message": f"Submitted {request_in.type} request: {request_in.description[:50]}...",
            "ai_reply": "Your request has been logged and is pending review.",
            "language": "en",
            "timestamp": datetime.now(timezone.utc),
            "escalated": request_in.priority == "high",
            "channel": "form",
        }
    )

    return BankRequestOut(**request_dict)


@router.get("/requests/", response_model=List[BankRequestOut])
async def list_requests(current_user: UserOut = Depends(get_current_user)):
    db = await get_db()
    cursor = db.requests.find({"user_id": current_user.id}).sort("created_at", -1)
    requests = await cursor.to_list(length=100)

    for req in requests:
        req["id"] = str(req["_id"])

    return [BankRequestOut(**req) for req in requests]


@router.get("/requests/{request_id}", response_model=BankRequestOut)
async def get_request(
    request_id: str, current_user: UserOut = Depends(get_current_user)
):
    db = await get_db()
    try:
        req = await db.requests.find_one(
            {"_id": ObjectId(request_id), "user_id": current_user.id}
        )
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid request ID")

    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    req["id"] = str(req["_id"])
    return BankRequestOut(**req)
