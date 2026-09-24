"""Daftar petugas (Security, OB, CS) dan pengubahan datanya oleh admin."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app import tampil
from app.audit import catat
from app.database import ambil_db
from app.deps import PENGAWAS, butuh_peran, user_saat_ini
from app.models import User
from app.schemas import Jabatan, PetugasKeluar, UbahPetugas

router = APIRouter(prefix="/api/petugas", tags=["Petugas"])


@router.get("", response_model=list[PetugasKeluar])
def daftar(jabatan: Jabatan | None = None, db: Session = Depends(ambil_db), _: User = Depends(user_saat_ini)):
    # Semua peran boleh membaca: halaman Logbook petugas butuh daftar nama.
    q = select(User).where(User.peran == "user").order_by(User.jabatan, User.nama)
    if jabatan:
        q = q.where(User.jabatan == jabatan)
    return [tampil.petugas(u) for u in db.scalars(q)]


@router.patch("/{petugas_id}", response_model=PetugasKeluar)
def ubah(
    petugas_id: int, isi: UbahPetugas, db: Session = Depends(ambil_db), pelaku: User = Depends(butuh_peran(*PENGAWAS))
):
    # Hanya akun petugas; akun admin tetap diurus lewat Kelola akun.
    u = db.get(User, petugas_id)
    if not u or u.peran != "user":
        raise HTTPException(404, "Petugas tidak ditemukan.")
    email = isi.email.lower()
    if email != u.email and db.scalar(select(User).where(func.lower(User.email) == email)):
        raise HTTPException(409, "Email ini sudah dipakai akun lain.")

    lama = (u.nama, u.jabatan, u.email, u.telepon, u.nip, u.unit, u.status)
    u.nama = isi.nama.strip()
    u.jabatan = isi.jabatan
    u.email = email
    u.telepon = isi.telepon.strip()
    u.nip = isi.nip.strip()
    u.unit = isi.unit.strip()
    u.status = isi.status
    baru = (u.nama, u.jabatan, u.email, u.telepon, u.nip, u.unit, u.status)
    label = ("nama", "jabatan", "email", "telepon", "nip", "unit", "status")
    beda = [f"{n}: {a} → {b}" for n, a, b in zip(label, lama, baru) if a != b]
    if beda:
        catat(db, pelaku, "ubah_petugas", f"{u.email} ({'; '.join(beda)})")
    db.commit()
    return tampil.petugas(u)
