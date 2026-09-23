"""Laporan kendala dari petugas; admin mengubah statusnya."""
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app import format as f
from app import tampil
from app.audit import catat
from app.catatan import periksa_isi, periksa_petugas, saring, simpan_foto
from app.database import ambil_db
from app.deps import PENGAWAS, butuh_peran, user_saat_ini
from app.foto_util import hapus_berkas
from app.models import Kendala, User
from app.schemas import CatatanMasuk, Jabatan, KendalaKeluar, StatusKendala, UbahStatusKendala

router = APIRouter(prefix="/api/kendala", tags=["Laporan kendala"])


@router.get("", response_model=list[KendalaKeluar])
def daftar(
    status: StatusKendala | None = None,
    tanggal: date | None = None,
    dari: date | None = None,
    sampai: date | None = None,
    jabatan: Jabatan | None = None,
    batas: int = Query(200, ge=1, le=1000),
    db: Session = Depends(ambil_db),
    user: User = Depends(user_saat_ini),
):
    q = select(Kendala).options(selectinload(Kendala.petugas), selectinload(Kendala.foto))
    q = saring(q, Kendala, user, tanggal, dari, sampai, jabatan)
    if status:
        q = q.where(Kendala.status == status)
    return [tampil.kendala(k) for k in db.scalars(q.order_by(Kendala.waktu.desc()).limit(batas))]


@router.post("", response_model=KendalaKeluar, status_code=201)
def kirim(isi: CatatanMasuk, db: Session = Depends(ambil_db), user: User = Depends(user_saat_ini)):
    periksa_petugas(db, isi.petugas_id)
    periksa_isi(isi)
    laporan = Kendala(
        petugas_id=isi.petugas_id,
        dibuat_oleh=user.id,
        waktu=f.gabung_waktu(isi.tanggal, isi.jam),
        keterangan=isi.keterangan.strip(),
        status="Baru",
    )
    berkas = simpan_foto(isi.foto, isi, laporan)
    try:
        db.add(laporan)
        db.commit()
    except Exception:
        db.rollback()
        for lokasi in berkas:
            hapus_berkas(lokasi)
        raise
    db.refresh(laporan)
    return tampil.kendala(laporan)


@router.patch("/{kendala_id}/status", response_model=KendalaKeluar)
def ubah_status(
    kendala_id: int,
    isi: UbahStatusKendala,
    db: Session = Depends(ambil_db),
    admin: User = Depends(butuh_peran(*PENGAWAS)),
):
    laporan = db.get(Kendala, kendala_id)
    if not laporan:
        raise HTTPException(404, "Laporan tidak ditemukan.")
    lama = laporan.status
    laporan.status = isi.status
    laporan.ditangani_oleh = admin.id
    laporan.diperbarui_pada = f.sekarang()
    catat(db, admin, "ubah_status_kendala", f"Laporan #{laporan.id}: {lama} → {isi.status}")
    db.commit()
    return tampil.kendala(laporan)
