"""Login, data akun sendiri, dan ganti kata sandi."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app import batas_masuk, tampil
from app.database import ambil_db
from app.deps import user_saat_ini
from app.foto_util import hapus_berkas, simpan_data_url
from app.format import sekarang
from app.models import User
from app.schemas import AkunKeluar, GantiSandi, HasilMasuk, MasukMasuk, SesiKeluar, UbahProfil
from app.security import acak_sandi, buat_token, cocok_sandi

router = APIRouter(prefix="/api/auth", tags=["Auth"])


@router.post("/masuk", response_model=HasilMasuk)
def masuk(isi: MasukMasuk, db: Session = Depends(ambil_db)):
    user = db.scalar(select(User).where(func.lower(User.email) == isi.email.lower()))
    if not user:
        raise HTTPException(401, "Email atau kata sandi salah.")
    # Akun yang sedang dikunci tidak diperiksa sandinya sama sekali.
    if user.status != "Nonaktif" and (menit := batas_masuk.menit_terkunci(db, user)):
        raise HTTPException(
            429, f"Terlalu banyak percobaan masuk. Coba lagi dalam {menit} menit, atau hubungi Tim IT."
        )
    if not cocok_sandi(isi.sandi, user.password_hash):
        # Akun nonaktif tidak dihitung lagi; pesannya disamakan dengan email yang tidak terdaftar.
        if user.status == "Nonaktif":
            raise HTTPException(401, "Email atau kata sandi salah.")
        raise HTTPException(401, batas_masuk.catat_gagal(db, user))
    if user.status == "Nonaktif":
        raise HTTPException(403, "Akun Anda dinonaktifkan. Silakan temui Tim IT untuk mengaktifkannya kembali.")

    user.terakhir_masuk = sekarang()
    db.commit()
    return HasilMasuk(token=buat_token(user.id, user.peran), peran=user.peran, akun=tampil.akun(user))


@router.get("/saya", response_model=SesiKeluar)
def saya(user: User = Depends(user_saat_ini)):
    """Dipanggil frontend saat halaman dibuka ulang, untuk memulihkan sesi dari token."""
    return SesiKeluar(peran=user.peran, akun=tampil.akun(user))


@router.patch("/profil", response_model=AkunKeluar)
def ubah_profil(isi: UbahProfil, user: User = Depends(user_saat_ini), db: Session = Depends(ambil_db)):
    """Pemilik akun hanya boleh mengganti nama dan foto profilnya sendiri."""
    nama = " ".join(isi.nama.split())
    if not nama:
        raise HTTPException(422, "Nama tidak boleh kosong.")
    user.nama = nama

    lama = user.foto_profil
    if isi.foto:
        user.foto_profil, _ = simpan_data_url(isi.foto)
    elif isi.hapus_foto:
        user.foto_profil = None
    db.commit()
    # Berkas lama baru dibuang setelah database tersimpan.
    if lama and lama != user.foto_profil:
        hapus_berkas(lama)
    return tampil.akun(user)


@router.post("/ganti-sandi", status_code=204)
def ganti_sandi(isi: GantiSandi, user: User = Depends(user_saat_ini), db: Session = Depends(ambil_db)):
    if not cocok_sandi(isi.sandi_lama, user.password_hash):
        raise HTTPException(400, "Kata sandi lama salah.")
    user.password_hash = acak_sandi(isi.sandi_baru)
    db.commit()
