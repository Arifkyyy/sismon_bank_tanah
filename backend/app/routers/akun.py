"""Kelola akun admin dan petugas (khusus super admin)."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app import format as f
from app.audit import catat
from app.database import ambil_db
from app.deps import butuh_peran
from app.foto_util import hapus_berkas, url_foto_profil
from app.models import Foto, Kendala, Logbook, User
from app.schemas import AkunAdminKeluar, AkunBaru, HasilAkunBaru, UbahStatusAkun
from app.security import acak_sandi, sandi_sementara

router = APIRouter(prefix="/api/akun", tags=["Kelola akun"])
hanya_super = butuh_peran("superadmin")


def _ambil(db: Session, akun_id: int, pelaku: User) -> User:
    u = db.get(User, akun_id)
    if not u or u.peran == "superadmin":
        raise HTTPException(404, "Akun tidak ditemukan.")
    if u.id == pelaku.id:
        raise HTTPException(400, "Tidak bisa mengubah akun sendiri dari sini.")
    return u


@router.get("/admin", response_model=list[AkunAdminKeluar])
def daftar_admin(db: Session = Depends(ambil_db), _: User = Depends(hanya_super)):
    q = select(User).where(User.peran == "admin").order_by(User.nama)
    return [
        AkunAdminKeluar(
            id=u.id,
            nama=u.nama,
            email=u.email,
            masuk=f.cap_waktu(u.terakhir_masuk) or "Belum pernah",
            status=u.status,
            foto_profil=url_foto_profil(u.foto_profil),
        )
        for u in db.scalars(q)
    ]


@router.post("", response_model=HasilAkunBaru, status_code=201)
def buat(isi: AkunBaru, db: Session = Depends(ambil_db), pelaku: User = Depends(hanya_super)):
    if isi.jenis == "user" and not isi.jabatan:
        raise HTTPException(422, "Akun petugas wajib punya jabatan.")
    if db.scalar(select(User).where(func.lower(User.email) == isi.email.lower())):
        raise HTTPException(409, "Email ini sudah terdaftar.")
    sandi = sandi_sementara()
    u = User(
        nama=isi.nama.strip(),
        email=isi.email.lower(),
        password_hash=acak_sandi(sandi),
        peran=isi.jenis,
        jabatan=isi.jabatan if isi.jenis == "user" else None,
        nip=isi.nip,
        unit=isi.unit,
        telepon=isi.telepon,
        status="Aktif",
    )
    db.add(u)
    db.flush()
    catat(db, pelaku, "buat_akun", f"{u.peran} {u.email}")
    db.commit()
    # Belum ada server email: sandi sementara ditampilkan sekali ke super admin.
    return HasilAkunBaru(id=u.id, email=u.email, sandi_sementara=sandi)


@router.patch("/{akun_id}/status", status_code=204)
def ubah_status(
    akun_id: int, isi: UbahStatusAkun, db: Session = Depends(ambil_db), pelaku: User = Depends(hanya_super)
):
    u = _ambil(db, akun_id, pelaku)
    u.status = isi.status
    catat(db, pelaku, "ubah_status_akun", f"{u.email} → {isi.status}")
    db.commit()


@router.post("/{akun_id}/reset-sandi", response_model=HasilAkunBaru)
def reset_sandi(akun_id: int, db: Session = Depends(ambil_db), pelaku: User = Depends(hanya_super)):
    u = _ambil(db, akun_id, pelaku)
    sandi = sandi_sementara()
    u.password_hash = acak_sandi(sandi)
    catat(db, pelaku, "reset_sandi", u.email)
    db.commit()
    return HasilAkunBaru(id=u.id, email=u.email, sandi_sementara=sandi)


@router.delete("/{akun_id}", status_code=204)
def hapus(akun_id: int, db: Session = Depends(ambil_db), pelaku: User = Depends(hanya_super)):
    """Permanen: logbook, kendala, lembur, dan foto milik akun ini ikut terhapus."""
    u = _ambil(db, akun_id, pelaku)
    # Berkas foto di folder tidak ikut terhapus oleh database, jadi dihapus manual dulu.
    lokasi = db.scalars(
        select(Foto.lokasi_file)
        .outerjoin(Logbook, Foto.logbook_id == Logbook.id)
        .outerjoin(Kendala, Foto.kendala_id == Kendala.id)
        .where((Logbook.petugas_id == u.id) | (Kendala.petugas_id == u.id))
    ).all()
    catat(db, pelaku, "hapus_akun", f"{u.peran} {u.email}")
    db.delete(u)
    db.commit()
    for x in lokasi:
        hapus_berkas(x)
