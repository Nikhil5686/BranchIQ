from datetime import datetime, timedelta, timezone

import pymongo
from fastapi import APIRouter, Depends

from app.db.mongodb import get_db

router = APIRouter()


@router.get("/analytics/stats")
async def get_analytics_stats(db=Depends(get_db)):
    now = datetime.now(timezone.utc)
    midnight = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_query = {"timestamp": {"$gte": midnight}}

    # 1. Chat Query Stats
    total_queries = await db.queries.count_documents(today_query)
    resolved = await db.queries.count_documents(
        {"timestamp": {"$gte": midnight}, "escalated": False}
    )
    escalated = await db.queries.count_documents(
        {"timestamp": {"$gte": midnight}, "escalated": True}
    )

    resolution_rate = (
        round((resolved / total_queries * 100), 1) if total_queries > 0 else 0.0
    )

    # Average Resolution Time (Chat)
    avg_time_pipeline = [
        {"$match": today_query},
        {"$group": {"_id": None, "avg_time": {"$avg": "$resolution_time_seconds"}}},
    ]
    avg_res = await db.queries.aggregate(avg_time_pipeline).to_list(1)
    avg_resolution_time = (
        round(avg_res[0]["avg_time"], 1) if avg_res and avg_res[0]["avg_time"] else 0.0
    )

    # 2. Banking Request Stats Integration
    # Combine formal requests into the category breakdown
    req_pipeline = [
        {"$match": {"created_at": {"$gte": midnight}}},
        {"$group": {"_id": "$type", "count": {"$sum": 1}}},
    ]
    req_stats = await db.requests.aggregate(req_pipeline).to_list(20)

    by_category = []
    category_map = {}
    for r in req_stats:
        cat_name = str(r["_id"]).capitalize()
        category_map[cat_name] = r["count"]

    # Also check chat message content for basic categories (fallback/supplement)
    chat_cats = ["balance", "transfer", "account"]
    for cat in chat_cats:
        count = await db.queries.count_documents(
            {
                "timestamp": {"$gte": midnight},
                "user_message": {"$regex": cat, "$options": "i"},
            }
        )
        if count > 0:
            display_name = cat.capitalize()
            category_map[display_name] = category_map.get(display_name, 0) + count

    by_category = [{"name": k, "value": v} for k, v in category_map.items()]
    if not by_category:
        by_category = [{"name": "General", "value": total_queries}]

    # 3. Language breakdown
    lang_pipeline = [
        {"$match": today_query},
        {"$group": {"_id": "$language", "count": {"$sum": 1}}},
    ]
    langs = await db.queries.aggregate(lang_pipeline).to_list(10)
    by_language = [
        {"name": str(l["_id"]).upper(), "value": l["count"]} for l in langs if l["_id"]
    ]

    # 4. Recent activity
    recent = (
        await db.queries.find(today_query)
        .sort("timestamp", pymongo.DESCENDING)
        .limit(10)
        .to_list(10)
    )
    recent_queries = [
        {
            "id": str(r["_id"]),
            "text": r["user_message"],
            "language": r["language"],
            "status": "Escalated" if r.get("escalated") else "Resolved",
            "time_taken": round(r.get("resolution_time_seconds", 0), 1),
        }
        for r in recent
    ]

    # 5. Escalation Queue
    escs = (
        await db.escalations.find(today_query)
        .sort("timestamp", pymongo.DESCENDING)
        .limit(10)
        .to_list(10)
    )
    escalation_queue = [
        {
            "id": str(e["_id"]),
            "session_id": e.get("session_id", "N/A"),
            "text": e["user_message"],
            "timestamp": e["timestamp"].isoformat(),
        }
        for e in escs
    ]

    return {
        "total_queries": total_queries,
        "resolved": resolved,
        "escalated": escalated,
        "resolution_rate": resolution_rate,
        "avg_resolution_time": avg_resolution_time,
        "queries_per_hour": await db.queries.count_documents(
            {"timestamp": {"$gte": now.replace(minute=0, second=0, microsecond=0)}}
        ),
        "by_category": by_category,
        "by_language": by_language,
        "recent_queries": recent_queries,
        "escalation_queue": escalation_queue,
    }
