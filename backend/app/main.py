from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.accounts import router as accounts_router
from app.api.admin_api import router as admin_router
from app.api.analytics import router as analytics_router
from app.api.auth import router as auth_router
from app.api.requests import router as requests_router
from app.api.routes import router as api_router
from app.api.transactions import router as transactions_router
from app.api.transfers import router as transfers_router
from app.api.voice import router as voice_router
from app.core.config import settings
from app.db.mongodb import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title="BranchIQ API",
    description="AI-powered self-service banking assistant API",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://branchiq.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Public + Auth routes
app.include_router(auth_router, prefix="/api", tags=["Authentication"])

# Chat & Voice
app.include_router(api_router, prefix="/api", tags=["Chat"])
app.include_router(voice_router, prefix="/api", tags=["Voice"])

# Banking — user-facing
app.include_router(accounts_router, prefix="/api", tags=["Accounts"])
app.include_router(transfers_router, prefix="/api", tags=["Transfers"])
app.include_router(requests_router, prefix="/api", tags=["Banking Requests"])
app.include_router(transactions_router, prefix="/api", tags=["Transactions"])

# Analytics & Admin
app.include_router(analytics_router, prefix="/api", tags=["Analytics"])
app.include_router(admin_router, prefix="/api", tags=["Admin"])


@app.get("/health")
async def health_check():
    return {"status": "ok", "version": "2.0.0", "message": "BranchIQ API is running"}
