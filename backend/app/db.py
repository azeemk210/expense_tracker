from sqlmodel import SQLModel, create_engine, Session
import os

DB_PATH = os.getenv("DB_PATH", "./data/expenses.db")
os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

engine = create_engine(
    f"sqlite:///{DB_PATH}",
    connect_args={"check_same_thread": False}
)

def init_db():
    from .models import Expense
    with engine.connect() as conn:
        conn.exec_driver_sql("PRAGMA journal_mode=WAL;")
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
