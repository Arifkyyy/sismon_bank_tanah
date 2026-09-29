"""
Pengaturan yang bisa diubah dari aplikasi.

Saat ini hanya tarif lembur per jam: semua akun boleh membaca, admin dan
super admin boleh mengubah. Penugasan yang sudah terkirim tetap memakai
tarif yang dikunci saat dikirim (kolom lembur.tarif_per_jam).
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import format as f
from app.audit import catat
from app.database import ambil_db
from app.deps import PENGAWAS, butuh_peran, user_saat_ini
from app.models import PengaturanAplikasi, User
from app.schemas import TarifLemburKeluar, TarifLemburMasuk

router = APIRouter(prefix="/api/pengaturan", tags=["Pengaturan"])

KUNCI_TARIF = "tarif_lembur_per_jam"
# Dipakai bila baris pengaturannya belum ada (migrasi 0003 mengisinya).
TARIF_BAWAAN = 20000


def tarif_lembur(db: Session) -> int:
    """Tarif per jam yang berlaku sekarang."""
    p = db.get(PengaturanAplikasi, KUNCI_TARIF)
    return int(p.nilai) if p else TARIF_BAWAAN


def _keluar(db: Session) -> TarifLemburKeluar:
    p = db.get(PengaturanAplikasi, KUNCI_TARIF)
    if not p:
        return TarifLemburKeluar(tarif_per_jam=TARIF_BAWAAN)
    return TarifLemburKeluar(
        tarif_per_jam=int(p.nilai),
        diubah_pada=f.cap_waktu(p.diubah_pada) if p.diubah_oleh else None,
        diubah_oleh=p.pengubah.nama if p.pengubah else None,
    )


@router.get("/tarif-lembur", response_model=TarifLemburKeluar)
def lihat_tarif(db: Session = Depends(ambil_db), _: User = Depends(user_saat_ini)):
    return _keluar(db)


@router.put("/tarif-lembur", response_model=TarifLemburKeluar)
def ubah_tarif(
    isi: TarifLemburMasuk, db: Session = Depends(ambil_db), admin: User = Depends(butuh_peran(*PENGAWAS))
):
    p = db.get(PengaturanAplikasi, KUNCI_TARIF)
    lama = int(p.nilai) if p else TARIF_BAWAAN
    if not p:
        p = PengaturanAplikasi(kunci=KUNCI_TARIF)
        db.add(p)
    p.nilai = str(isi.tarif_per_jam)
    p.diubah_oleh = admin.id
    p.diubah_pada = f.sekarang()
    catat(db, admin, "ubah_tarif_lembur", f"Rp{lama:,} → Rp{isi.tarif_per_jam:,} per jam".replace(",", "."))
    db.commit()
    db.refresh(p)
    return _keluar(db)
