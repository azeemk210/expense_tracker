from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import date

class Expense(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    date: date
    name: str
    category: str
    amount_cents: int
    payment_method: str
    floor: Optional[str] = None  # NEW: Floor field
    notes: Optional[str] = None
    proof_url: Optional[str] = None  # NEW
