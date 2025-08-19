from pydantic import BaseModel, field_validator
from typing import Optional
import datetime


class ExpenseUpdate(BaseModel):
    date: Optional[datetime.date] = None
    name: Optional[str] = None
    category: Optional[str] = None
    amount: Optional[float] = None
    payment_method: Optional[str] = None
    floor: Optional[str] = None
    notes: Optional[str] = None

class ExpenseCreate(BaseModel):
    date: datetime.date
    name: str
    category: str
    amount: float
    payment_method: str
    floor: Optional[str] = None
    notes: Optional[str] = None

    @field_validator("amount", mode="before")
    @classmethod
    def nonneg(cls, v):
        if v < 0:
            raise ValueError("Amount must be >= 0")
        return v

class ExpenseRead(BaseModel):
    id: int
    date: datetime.date
    name: str
    category: str
    amount: float
    payment_method: str
    floor: Optional[str] = None
    notes: Optional[str] = None
    proof_url: Optional[str] = None  # NEW

class Stats(BaseModel):
    total_expenses: float
    total_entries: int
    date_range: str
    avg_expense: float
