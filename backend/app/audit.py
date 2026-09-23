"""Pencatat jejak tindakan penting ke tabel log_audit."""
from sqlalchemy.orm import Session

from app.models import LogAudit, User


def catat(db: Session, user: User | None, aksi: str, detail: str = "") -> None:
    """Ditambahkan ke sesi; ikut tersimpan saat db.commit() dipanggil."""
    db.add(LogAudit(user_id=user.id if user else None, aksi=aksi, detail=detail))
