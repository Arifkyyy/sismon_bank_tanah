"""Daftar petugas (Security, OB, CS) dan pengubahan datanya oleh admin."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app import format as f
from app import tampil
from app.audit import catat
from app.database import ambil_db
from app.deps import PENGAWAS, butuh_peran, user_saat_ini
from app.models import Kendala, Lembur, Logbook, User
from app.schemas import DetailPetugas, Jabatan, PetugasKeluar, UbahPetugas

router = APIRouter(prefix="/api/petugas", tags=["Petugas"])


@router.get("", response_model=list[PetugasKeluar])
def daftar(jabatan: Jabatan | None = None, db: Session = Depends(ambil_db), _: User = Depends(user_saat_ini)):
    # Semua peran boleh membaca: halaman Logbook petugas butuh daftar nama.
    q = select(User).where(User.peran == "user").order_by(User.jabatan, User.nama)
    if jabatan:
        q = q.where(User.jabatan == jabatan)
    return [tampil.petugas(u) for u in db.scalars(q)]


def _ambil_petugas(db: Session, petugas_id: int) -> User:
    u = db.get(User, petugas_id)
    if not u or u.peran != "user":
        raise HTTPException(404, "Petugas tidak ditemukan.")
    return u


@router.get("/{petugas_id}/detail", response_model=DetailPetugas)
def detail(petugas_id: int, db: Session = Depends(ambil_db), _: User = Depends(butuh_peran(*PENGAWAS))):
    u = _ambil_petugas(db, petugas_id)
    awal_bulan = f.hari_ini().replace(day=1)
    sejak = f.awal_hari(awal_bulan)

    def hitung(q) -> int:
        return db.scalar(select(func.count()).select_from(q.subquery())) or 0

    logbook = hitung(select(Logbook.id).where(Logbook.petugas_id == u.id, Logbook.waktu >= sejak))
    kendala = hitung(select(Kendala.id).where(Kendala.petugas_id == u.id, Kendala.waktu >= sejak))
    terbuka = hitung(select(Kendala.id).where(Kendala.petugas_id == u.id, Kendala.status != "Selesai"))
    terakhir = db.scalar(select(func.max(Logbook.waktu)).where(Logbook.petugas_id == u.id))
    # Hanya lembur yang diterima petugas; yang masih menunggu atau ditolak tidak dihitung.
    lembur = db.execute(
        select(Lembur.jam_mulai, Lembur.jam_selesai).where(
            Lembur.petugas_id == u.id, Lembur.status == "Diterima", Lembur.tanggal >= awal_bulan
        )
    ).all()
    menit = sum(f.menit_lembur(m, s) for m, s in lembur)

    return DetailPetugas(
        bergabung=f.tanggal_teks(f.ke_wib(u.dibuat_pada).date()) if u.dibuat_pada else "—",
        terakhir_masuk=f.cap_waktu(u.terakhir_masuk),
        aktivitas_terakhir=f.cap_waktu(terakhir),
        logbook_bulan_ini=logbook,
        kendala_bulan_ini=kendala,
        kendala_terbuka=terbuka,
        lembur_bulan_ini=f.lama_teks(menit) if menit else "—",
    )


@router.patch("/{petugas_id}", response_model=PetugasKeluar)
def ubah(
    petugas_id: int, isi: UbahPetugas, db: Session = Depends(ambil_db), pelaku: User = Depends(butuh_peran(*PENGAWAS))
):
    # Hanya akun petugas; akun admin tetap diurus lewat Kelola akun.
    u = _ambil_petugas(db, petugas_id)
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
