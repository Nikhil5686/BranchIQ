import json
import time
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.db.mongodb import get_session_history, save_query
from app.db.redis_cache import get_session, set_session
from app.services.ai_service import generate_chat_reply

router = APIRouter()


class ChatRequest(BaseModel):
    session_id: str
    message: str
    language: str = "en"
    channel: str = "chat"


class ChatResponse(BaseModel):
    reply: str
    escalated: bool


@router.post("/chat/message", response_model=ChatResponse)
async def chat_message(request: ChatRequest):
    try:
        start_time = time.time()

        # 1. Manage Session in Redis
        session_data = await get_session(request.session_id)
        if not session_data:
            # New session
            await set_session(
                request.session_id,
                json.dumps({"started_at": datetime.now(timezone.utc).isoformat()}),
            )
        else:
            # Refresh TTL
            await set_session(
                (
                    request.request_id
                    if hasattr(request, "request_id")
                    else request.session_id
                ),
                session_data,
            )

        # 2. Get history from MongoDB (Last 10 messages)
        history = await get_session_history(request.session_id)

        # 3. Get AI Response
        ai_reply = await generate_chat_reply(request.message, history, request.language)

        # 4. Check for escalation
        escalated = "human agent" in ai_reply.lower()

        # 5. Calculate resolution time
        resolution_time = time.time() - start_time

        # 6. Save exactly to user's MongoDB QUERY SCHEMA
        query_data = {
            "session_id": request.session_id,
            "user_message": request.message,
            "ai_reply": ai_reply,
            "language": request.language,
            "timestamp": datetime.now(timezone.utc),
            "escalated": escalated,
            "resolution_time_seconds": round(resolution_time, 2),
            "channel": request.channel,
        }

        await save_query(query_data)

        return ChatResponse(reply=ai_reply, escalated=escalated)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
