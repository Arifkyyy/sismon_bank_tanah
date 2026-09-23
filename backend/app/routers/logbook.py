"""Logbook harian petugas."""
from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app import format as f
from app import tampil
from app.catatan import periksa_isi, periksa_petugas, saring, simpan_foto
from app.database import ambil_db
from app.deps import user_saat_ini
from app.foto_util import hapus_berkas
from app.models import Logbook, User
from app.schemas import CatatanMasuk, Jabatan, LogbookKeluar

router = APIRouter(prefix="/api/logbook", tags=["Logbook"])


@router.get("", response_model=list[LogbookKeluar])
def daftar(
    tanggal: date | None = None,
    dari: date | None = None,
    sampai: date | None = None,
    jabatan: Jabatan | None = None,
    batas: int = Query(200, ge=1, le=1000),
    db: Session = Depends(ambil_db),
    user: User = Depends(user_saat_ini),
):
    q = select(Logbook).options(selectinload(Logbook.petugas), selectinload(Logbook.foto))
    q = saring(q, Logbook, user, tanggal, dari, sampai, jabatan)
    baris = list(db.scalars(q.order_by(Logbook.waktu.desc()).limit(batas)))
    return tampil.daftar_logbook(db, baris)


@router.post("", response_model=LogbookKeluar, status_code=201)
def kirim(isi: CatatanMasuk, db: Session = Depends(ambil_db), user: User = Depends(user_saat_ini)):
    periksa_petugas(db, isi.petugas_id)
    periksa_isi(isi)
    catatan = Logbook(
        petugas_id=isi.petugas_id,
        dibuat_oleh=user.id,
        waktu=f.gabung_waktu(isi.tanggal, isi.jam),
        keterangan=isi.keterangan.strip(),
    )
    berkas = simpan_foto(isi.foto, isi, catatan)
    try:
        db.add(catatan)
        db.commit()
    except Exception:
        db.rollback()
        for lokasi in berkas:
            hapus_berkas(lokasi)
        raise
    db.refresh(catatan)
    return tampil.daftar_logbook(db, [catatan])[0]
