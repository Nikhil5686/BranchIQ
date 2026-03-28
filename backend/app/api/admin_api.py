from datetime import datetime, timedelta, timezone
from typing import Optional

import pymongo
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.api.auth import get_admin_user
from app.db.mongodb import get_db
from app.schemas.user import UserOut

router = APIRouter()


@router.get("/admin/dashboard")
async def admin_dashboard(admin: UserOut = Depends(get_admin_user)):
    db = await get_db()
    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)

    total_users = await db.users.count_documents({"role": {"$ne": "admin"}})
    pending_requests = await db.requests.count_documents({"status": "pending"})
    total_requests = await db.requests.count_documents({})
    resolved_requests = await db.requests.count_documents({"status": "resolved"})
    new_users_week = await db.users.count_documents(
        {"role": {"$ne": "admin"}, "created_at": {"$gte": week_ago}}
    )

    # Request type breakdown
    type_stats = await db.requests.aggregate(
        [{"$group": {"_id": "$type", "count": {"$sum": 1}}}]
    ).to_list(20)

    return {
        "total_users": total_users,
        "pending_requests": pending_requests,
        "total_requests": total_requests,
        "resolved_requests": resolved_requests,
        "approval_rate": (
            round(resolved_requests / total_requests * 100, 1)
            if total_requests > 0
            else 0
        ),
        "new_users_week": new_users_week,
        "request_type_breakdown": [
            {"type": r["_id"], "count": r["count"]} for r in type_stats
        ],
    }


@router.get("/admin/users")
async def list_users(admin: UserOut = Depends(get_admin_user)):
    db = await get_db()
    cursor = db.users.find({}).sort("created_at", pymongo.DESCENDING)
    users = await cursor.to_list(length=500)

    result = []
    for u in users:
        account = await db.accounts.find_one({"user_id": str(u["_id"])})
        result.append(
            {
                "id": str(u["_id"]),
                "name": u["name"],
                "email": u["email"],
                "role": u["role"],
                "phone": u.get("phone"),
                "address": u.get("address"),
                "email_verified": u.get("email_verified", False),
                "phone_verified": u.get("phone_verified", False),
                "created_at": u["created_at"].isoformat(),
                "account_number": account["account_number"] if account else None,
                "balance": account["balance"] if account else 0,
            }
        )
    return result


@router.get("/admin/requests")
async def list_all_requests(admin: UserOut = Depends(get_admin_user)):
    db = await get_db()
    cursor = db.requests.find({}).sort("created_at", pymongo.DESCENDING).limit(200)
    requests = await cursor.to_list(length=200)

    result = []
    for r in requests:
        user = None
        try:
            user = await db.users.find_one({"_id": ObjectId(r["user_id"])})
        except Exception:
            pass
        result.append(
            {
                "id": str(r["_id"]),
                "type": r["type"],
                "description": r.get("description", ""),
                "priority": r.get("priority", "medium"),
                "status": r["status"],
                "user_id": r["user_id"],
                "user_name": user["name"] if user else "Unknown",
                "user_email": user["email"] if user else "Unknown",
                "created_at": r["created_at"].isoformat(),
                "updated_at": r.get("updated_at", r["created_at"]).isoformat(),
                "admin_notes": r.get("admin_notes"),
            }
        )
    return result


class RequestAction(BaseModel):
    action: str  # "approve" | "reject"
    notes: Optional[str] = None


@router.patch("/admin/requests/{request_id}")
async def update_request_status(
    request_id: str, body: RequestAction, admin: UserOut = Depends(get_admin_user)
):
    db = await get_db()
    try:
        obj_id = ObjectId(request_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid request ID")

    req = await db.requests.find_one({"_id": obj_id})
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    new_status = "resolved" if body.action == "approve" else "rejected"

    await db.requests.update_one(
        {"_id": obj_id},
        {
            "$set": {
                "status": new_status,
                "updated_at": datetime.now(timezone.utc),
                "admin_notes": body.notes,
                "handled_by": admin.id,
            }
        },
    )

    # If approved ATM card application, update user account
    if body.action == "approve" and req.get("type") == "card":
        await db.accounts.update_one(
            {"user_id": req["user_id"]},
            {"$set": {"card_applied": True, "card_status": "approved"}},
        )

    return {"message": f"Request {new_status} successfully", "status": new_status}
