"""Login, data akun sendiri, dan ganti kata sandi."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app import tampil
from app.database import ambil_db
from app.deps import user_saat_ini
from app.format import sekarang
from app.models import User
from app.schemas import GantiSandi, HasilMasuk, MasukMasuk, SesiKeluar
from app.security import acak_sandi, buat_token, cocok_sandi

router = APIRouter(prefix="/api/auth", tags=["Auth"])


@router.post("/masuk", response_model=HasilMasuk)
def masuk(isi: MasukMasuk, db: Session = Depends(ambil_db)):
    user = db.scalar(select(User).where(func.lower(User.email) == isi.email.lower()))
    # Pesan sengaja disamakan supaya orang luar tidak bisa menebak email mana yang terdaftar.
    if not user or not cocok_sandi(isi.sandi, user.password_hash):
        raise HTTPException(401, "Email atau kata sandi salah.")
    if user.status == "Nonaktif":
        raise HTTPException(403, "Akun Anda sudah dinonaktifkan. Hubungi admin.")

    user.terakhir_masuk = sekarang()
    db.commit()
    return HasilMasuk(token=buat_token(user.id, user.peran), peran=user.peran, akun=tampil.akun(user))


@router.get("/saya", response_model=SesiKeluar)
def saya(user: User = Depends(user_saat_ini)):
    """Dipanggil frontend saat halaman dibuka ulang, untuk memulihkan sesi dari token."""
    return SesiKeluar(peran=user.peran, akun=tampil.akun(user))


@router.post("/ganti-sandi", status_code=204)
def ganti_sandi(isi: GantiSandi, user: User = Depends(user_saat_ini), db: Session = Depends(ambil_db)):
    if not cocok_sandi(isi.sandi_lama, user.password_hash):
        raise HTTPException(400, "Kata sandi lama salah.")
    user.password_hash = acak_sandi(isi.sandi_baru)
    db.commit()
