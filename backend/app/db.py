from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.settings import settings

DATABASE_URL = settings.database_url

if not DATABASE_URL:
    raise ValueError("DATABASE_URL must be set when APP_ENV=production.")

if settings.is_production and DATABASE_URL.startswith("sqlite"):
    raise ValueError("Production requires PostgreSQL or another server database; SQLite is blocked.")

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, future=True, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
