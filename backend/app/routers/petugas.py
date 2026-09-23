"""Daftar petugas (Security, OB, CS)."""
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import tampil
from app.database import ambil_db
from app.deps import user_saat_ini
from app.models import User
from app.schemas import Jabatan, PetugasKeluar

router = APIRouter(prefix="/api/petugas", tags=["Petugas"])


@router.get("", response_model=list[PetugasKeluar])
def daftar(jabatan: Jabatan | None = None, db: Session = Depends(ambil_db), _: User = Depends(user_saat_ini)):
    # Semua peran boleh membaca: halaman Logbook petugas butuh daftar nama.
    q = select(User).where(User.peran == "user").order_by(User.jabatan, User.nama)
    if jabatan:
        q = q.where(User.jabatan == jabatan)
    return [tampil.petugas(u) for u in db.scalars(q)]
