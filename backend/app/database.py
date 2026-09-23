"""Sambungan ke PostgreSQL."""
from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import pengaturan

engine = create_engine(pengaturan.database_url, pool_pre_ping=True)
SesiLokal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def ambil_db() -> Generator[Session, None, None]:
    """Membuka satu sesi database per request, lalu menutupnya."""
    db = SesiLokal()
    try:
        yield db
    finally:
        db.close()
