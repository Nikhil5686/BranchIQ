from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


class BankRequestCreate(BaseModel):
    type: Literal["atm", "complaint", "loan", "cheque", "card", "account", "other"]
    description: str = Field(..., min_length=5, max_length=1000)
    priority: Literal["low", "medium", "high"] = "medium"


class BankRequestOut(BaseModel):
    id: str
    user_id: str
    type: str
    description: str
    priority: str
    status: str  # pending | in_progress | resolved | rejected
    created_at: datetime
    updated_at: datetime
