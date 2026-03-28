from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6)
    role: str = Field(default="customer")  # customer | admin
    phone: Optional[str] = None
    address: Optional[str] = None
    admin_invite_token: Optional[str] = None  # required for admin self-registration


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    name: str
    email: str
    role: str
    phone: Optional[str] = None
    address: Optional[str] = None
    profile_photo: Optional[str] = None
    email_verified: bool = False
    phone_verified: bool = False
    created_at: datetime

    class Config:
        from_attributes = True


class UserInDB(UserOut):
    hashed_password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class OTPVerify(BaseModel):
    email: EmailStr
    otp_type: str  # "email" | "sms"
    code: str


class PhotoUpload(BaseModel):
    email: EmailStr
    photo_base64: str = Field(
        ..., max_length=5000000
    )  # max ~5MB base64 encoded image from webcam


class ATMPinSet(BaseModel):
    otp_code: str
    new_pin: str = Field(..., min_length=4, max_length=4, pattern=r"^\d{4}$")
