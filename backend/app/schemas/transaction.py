from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


class TransactionCreate(BaseModel):
    account_id: str
    amount: float = Field(..., gt=0)
    type: Literal["credit", "debit"]
    description: str = Field(default="", max_length=500)
    reference_id: Optional[str] = None


class TransactionOut(BaseModel):
    id: str
    account_id: str
    user_id: str
    amount: float
    type: str
    description: str
    reference_id: Optional[str]
    timestamp: datetime
