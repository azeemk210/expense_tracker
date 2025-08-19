from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlmodel import Session, select
from typing import List, Optional
from datetime import date as date_cls
import os, uuid
from ..db import get_session
from ..models import Expense
from ..schemas import ExpenseCreate, ExpenseRead, Stats

router = APIRouter(prefix="/api/expenses", tags=["expenses"])

def to_read(e: Expense) -> ExpenseRead:
    return ExpenseRead(
        id=e.id,
        date=e.date,
        name=e.name,
        category=e.category,
        amount=e.amount_cents / 100.0,
        payment_method=e.payment_method,
        floor=getattr(e, 'floor', None),
        notes=e.notes,
        proof_url=e.proof_url,
    )

# ---------- STATIC/LIST ROUTES FIRST ----------

@router.get("/", response_model=List[ExpenseRead])
def list_expenses(q: Optional[str] = None, session: Session = Depends(get_session)):
    stmt = select(Expense).order_by(Expense.date.desc(), Expense.id.desc())
    items = session.exec(stmt).all()

    if not q:
        return [to_read(e) for e in items]

    lo = q.lower()
    out: List[ExpenseRead] = []
    for e in items:
        if lo in (e.name or "").lower() or lo in (e.category or "").lower():
            out.append(to_read(e))
    return out

@router.get("/stats", response_model=Stats)
def stats(session: Session = Depends(get_session)):
    items = session.exec(select(Expense)).all()
    total_cents = sum(int(i.amount_cents or 0) for i in items)
    count = len(items)

    # Collect valid dates only (guard in case of any nulls)
    dates_list = sorted(
        d for d in (getattr(i, "date", None) for i in items) if d is not None
    )

    if count and dates_list:
        start = dates_list[0].isoformat()
        end = dates_list[-1].isoformat()
    else:
        start = end = None

    avg = (total_cents / 100.0) / count if count else 0.0

    return Stats(
        total_expenses=total_cents / 100.0,
        total_entries=count,
        date_range=f"{start} — {end}" if start and end else "-",
        avg_expense=avg,
    )

@router.post("/upload", response_model=ExpenseRead)
async def create_with_file(
    date: str = Form(...),
    name: str = Form(...),
    category: str = Form(...),
    amount: float = Form(...),
    payment_method: str = Form(...),
    floor: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    session: Session = Depends(get_session),
):
    # Parse ISO date string (YYYY-MM-DD) to Python date
    try:
        parsed_date = date_cls.fromisoformat(date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date; expected YYYY-MM-DD")

    proof_url = None
    if file and file.filename:
        allowed = {
            "image/png",
            "image/jpeg",
            "image/jpg",
            "application/pdf",
            "image/webp",
            "image/pjpeg",
        }
        if file.content_type not in allowed:
            raise HTTPException(status_code=400, detail="Unsupported file type")
        from ..main import UPLOAD_DIR
        _, ext = os.path.splitext(file.filename)
        if not ext:
            ext = ".bin"
        fname = f"{uuid.uuid4().hex}{ext}"
        with open(os.path.join(UPLOAD_DIR, fname), "wb") as f:
            f.write(await file.read())
        proof_url = f"/uploads/{fname}"

    e = Expense(
        date=parsed_date,
        name=name,
        category=category,
        amount_cents=int(round(amount * 100)),
        payment_method=payment_method,
        floor=floor,
        notes=notes or None,
        proof_url=proof_url,
    )
    session.add(e)
    session.commit()
    session.refresh(e)
    return to_read(e)

@router.post("/", response_model=ExpenseRead)
def create_expense(payload: ExpenseCreate, session: Session = Depends(get_session)):
    e = Expense(
        date=payload.date,
        name=payload.name,
        category=payload.category,
        amount_cents=int(round(payload.amount * 100)),
        payment_method=payload.payment_method,
        floor=getattr(payload, 'floor', None),
        notes=payload.notes,
    )
    session.add(e)
    session.commit()
    session.refresh(e)
    return to_read(e)

# ---------- DYNAMIC ID ROUTES AFTER STATIC ROUTES ----------

@router.get("/{expense_id}", response_model=ExpenseRead)
def get_one(expense_id: int, session: Session = Depends(get_session)):
    e = session.get(Expense, expense_id)
    if not e:
        raise HTTPException(status_code=404, detail="Not found")
    return to_read(e)

@router.put("/{expense_id}", response_model=ExpenseRead)
async def update_expense(
    expense_id: int,
    date: Optional[str] = Form(None),
    name: Optional[str] = Form(None),
    category: Optional[str] = Form(None),
    amount: Optional[float] = Form(None),
    payment_method: Optional[str] = Form(None),
    floor: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    session: Session = Depends(get_session),
):
    e = session.get(Expense, expense_id)
    if not e:
        raise HTTPException(status_code=404, detail="Not found")

    if date is not None and date != "":
        try:
            e.date = date_cls.fromisoformat(date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date; expected YYYY-MM-DD")

    if name is not None:
        e.name = name
    if category is not None:
        e.category = category
    if amount is not None:
        e.amount_cents = int(round(amount * 100))
    if payment_method is not None:
        e.payment_method = payment_method
    if floor is not None:
        e.floor = floor
    if notes is not None:
        e.notes = notes or None

    if file and file.filename:
        allowed = {
            "image/png",
            "image/jpeg",
            "image/jpg",
            "application/pdf",
            "image/webp",
            "image/pjpeg",
        }
        if file.content_type not in allowed:
            raise HTTPException(status_code=400, detail="Unsupported file type")
        from ..main import UPLOAD_DIR
        _, ext = os.path.splitext(file.filename)
        if not ext:
            ext = ".bin"
        fname = f"{uuid.uuid4().hex}{ext}"
        fpath = os.path.join(UPLOAD_DIR, fname)
        with open(fpath, "wb") as f:
            f.write(await file.read())
        e.proof_url = f"/uploads/{fname}"

    session.add(e)
    session.commit()
    session.refresh(e)
    return to_read(e)

