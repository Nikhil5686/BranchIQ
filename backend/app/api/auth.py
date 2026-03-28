import random
import string
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm

from app.core.config import settings
from app.core.otp import send_otp_to_user, verify_otp
from app.core.security import (
    create_access_token,
    decode_token,
    get_password_hash,
    verify_password,
)
from app.db.mongodb import get_db
from app.schemas.user import (
    ATMPinSet,
    OTPVerify,
    PhotoUpload,
    TokenResponse,
    UserCreate,
    UserOut,
)

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login", auto_error=False)


def generate_account_number() -> str:
    return "IQ" + "".join(random.choices(string.digits, k=10))


async def get_current_user(token: str = Depends(oauth2_scheme)) -> UserOut:
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated"
        )
    payload = decode_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token"
        )
    email = payload.get("sub")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload"
        )

    db = await get_db()
    user_data = await db.users.find_one({"email": email})
    if not user_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found"
        )

    user_data["id"] = str(user_data["_id"])
    return UserOut(**user_data)


async def get_admin_user(current_user: UserOut = Depends(get_current_user)) -> UserOut:
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required"
        )
    return current_user


@router.post("/auth/register")
async def register(user_in: UserCreate):
    db = await get_db()

    # Check if email already exists
    if await db.users.find_one({"email": user_in.email}):
        raise HTTPException(status_code=400, detail="Email already registered")

    # Determine role — admin requires whitelist or invite token
    role = "customer"
    if user_in.role in ("admin", "Admin"):
        if user_in.email in settings.admin_email_list:
            role = "admin"
        elif user_in.admin_invite_token == settings.ADMIN_INVITE_TOKEN:
            role = "admin"
        else:
            raise HTTPException(
                status_code=403,
                detail="Admin registration requires a whitelisted email or valid invite token",
            )

    user_dict = {
        "name": user_in.name,
        "email": user_in.email,
        "hashed_password": get_password_hash(user_in.password),
        "role": role,
        "phone": user_in.phone,
        "address": user_in.address,
        "profile_photo": None,
        "email_verified": False,
        "phone_verified": False,
        "created_at": datetime.now(timezone.utc),
    }

    result = await db.users.insert_one(user_dict)
    user_id = str(result.inserted_id)

    # Auto-create bank account (customers only)
    account_number = generate_account_number()
    while await db.accounts.find_one({"account_number": account_number}):
        account_number = generate_account_number()

    await db.accounts.insert_one(
        {
            "user_id": user_id,
            "account_number": account_number,
            "account_type": "savings",
            "balance": 50000.00,
            "atm_pin_hash": None,
            "card_applied": False,
            "status": "active",
            "created_at": datetime.now(timezone.utc),
        }
    )

    # Generate OTPs (fully simulated — displayed in response for demo)
    email_otp = await send_otp_to_user(user_id, "email")
    sms_otp = await send_otp_to_user(user_id, "sms")

    return {
        "message": "Registration successful. Verify your email and phone to continue.",
        "user_id": user_id,
        "email": user_in.email,
        "role": role,
        "account_number": account_number,
        # Dev mode — OTPs displayed on screen (no provider needed)
        "dev_email_otp": email_otp,
        "dev_sms_otp": sms_otp,
    }


@router.post("/auth/verify-otp")
async def verify_otp_endpoint(data: OTPVerify):
    db = await get_db()
    user_data = await db.users.find_one({"email": data.email})
    if not user_data:
        raise HTTPException(status_code=404, detail="User not found")

    user_id = str(user_data["_id"])
    valid = await verify_otp(user_id, data.otp_type, data.code)
    if not valid:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")

    field = "email_verified" if data.otp_type == "email" else "phone_verified"
    await db.users.update_one({"_id": user_data["_id"]}, {"$set": {field: True}})

    return {"message": f"{data.otp_type.upper()} verified successfully"}


@router.post("/auth/upload-photo")
async def upload_photo(data: PhotoUpload):
    db = await get_db()
    user_data = await db.users.find_one({"email": data.email})
    if not user_data:
        raise HTTPException(status_code=404, detail="User not found")

    await db.users.update_one(
        {"_id": user_data["_id"]}, {"$set": {"profile_photo": data.photo_base64}}
    )
    return {"message": "Profile photo saved"}


@router.post("/auth/login", response_model=TokenResponse)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    db = await get_db()
    user_data = await db.users.find_one({"email": form_data.username})

    if not user_data or not verify_password(
        form_data.password, user_data["hashed_password"]
    ):
        raise HTTPException(status_code=400, detail="Incorrect email or password")

    user_data["id"] = str(user_data["_id"])
    access_token = create_access_token(data={"sub": user_data["email"]})

    return TokenResponse(access_token=access_token, user=UserOut(**user_data))


@router.get("/auth/me", response_model=UserOut)
async def get_me(current_user: UserOut = Depends(get_current_user)):
    return current_user


@router.post("/auth/send-otp")
async def send_otp(email: str, otp_type: str):
    """Re-send OTP to user (simulated). otp_type: 'email' | 'sms'"""
    db = await get_db()
    user_data = await db.users.find_one({"email": email})
    if not user_data:
        raise HTTPException(status_code=404, detail="User not found")

    user_id = str(user_data["_id"])
    otp = await send_otp_to_user(user_id, otp_type)
    return {"message": "OTP sent", "dev_otp": otp}


@router.post("/auth/request-atm-pin-otp")
async def request_atm_pin_otp(current_user: UserOut = Depends(get_current_user)):
    """Send OTP for ATM PIN change (simulated)."""
    otp = await send_otp_to_user(current_user.id, "atm_pin")
    return {"message": "ATM PIN OTP sent to registered contact", "dev_otp": otp}


@router.post("/auth/set-atm-pin")
async def set_atm_pin(
    data: ATMPinSet, current_user: UserOut = Depends(get_current_user)
):
    """Set ATM PIN after OTP verification."""
    from app.core.security import get_password_hash

    valid = await verify_otp(current_user.id, "atm_pin", data.otp_code)
    if not valid:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")

    db = await get_db()
    pin_hash = get_password_hash(data.new_pin)
    await db.accounts.update_one(
        {"user_id": current_user.id}, {"$set": {"atm_pin_hash": pin_hash}}
    )
    return {"message": "ATM PIN set successfully"}
