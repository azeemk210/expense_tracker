import random
import os
from datetime import date, timedelta
from sqlmodel import Session, SQLModel, create_engine
from .models import Expense

# Ensure the data directory exists
os.makedirs(os.path.join(os.path.dirname(__file__), "../data"), exist_ok=True)

DB_PATH = f"sqlite:///{os.path.abspath(os.path.join(os.path.dirname(__file__), '../data/expenses.db'))}"
engine = create_engine(DB_PATH, echo=True)

CATEGORIES = [
    "Bricks", "Cement", "Sand", "Aggregate", "Steel (Rebar)", "Tiles", "Paint/Putty", "Plumbing", "Electrical", "Labour (Mason/Helper)", "Miscellaneous"
]
NAMES = [
    "Cement Purchase", "Sand Delivery", "Steel Rods", "Paint Work", "Tile Laying", "Wiring", "Plumbing Repair", "Brickwork", "Labour Payment", "Misc Expense"
]
PAYMENT_METHODS = ["Cash", "Card", "UPI", "Bank Transfer"]
FLOORS = ["Ground Floor", "First Floor", "Second Floor", "Basement", "Roof"]

def random_date(start, end):
    delta = end - start
    return start + timedelta(days=random.randint(0, delta.days))

def main():
    SQLModel.metadata.create_all(engine)
    session = Session(engine)

    # Remove existing data
    session.query(Expense).delete()
    session.commit()

    today = date.today()
    start_date = today - timedelta(days=365)

    for i in range(100):
        cat = random.choice(CATEGORIES)
        name = random.choice(NAMES)
        amount = round(random.uniform(100, 5000), 2)
        pay = random.choice(PAYMENT_METHODS)
        dt = random_date(start_date, today)
        notes = random.choice(["", random.choice(FLOORS), f"{random.choice(FLOORS)} - extra work", f"{random.choice(FLOORS)} - urgent"])
        e = Expense(
            date=dt,
            name=name,
            category=cat,
            amount_cents=int(amount * 100),
            payment_method=pay,
            notes=notes,
            proof_url=None,
        )
        session.add(e)
    session.commit()
    count = session.query(Expense).count()
    print(f"Fake data generated. DB path: {os.path.abspath(os.path.join(os.path.dirname(__file__), '../data/expenses.db'))}")
    print(f"Expense count in DB: {count}")

if __name__ == "__main__":
    main()


