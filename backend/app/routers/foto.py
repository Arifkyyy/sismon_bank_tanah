"""Arsip foto bukti dan penghapusannya (khusus super admin)."""
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app import format as f
from app.audit import catat
from app.database import ambil_db
from app.deps import butuh_peran
from app.foto_util import hapus_berkas, url_foto
from app.models import Foto, Kendala, Logbook, User
from app.schemas import FotoKeluar, HapusFoto, HapusFotoSebelum, HasilHapus, Jabatan, StatistikFoto

router = APIRouter(prefix="/api/foto", tags=["Arsip foto"])
hanya_super = butuh_peran("superadmin")


def _keluar(x: Foto) -> FotoKeluar:
    induk = x.logbook or x.kendala
    return FotoKeluar(
        id=x.id,
        nama=induk.petugas.nama,
        jabatan=induk.petugas.jabatan,
        waktu=f.cap_waktu(x.diambil_pada),
        waktu_iso=f.ke_wib(x.diambil_pada).date().isoformat(),
        sumber="Logbook" if x.logbook_id else "Kendala",
        url=url_foto(x.lokasi_file),
        ukuran_byte=x.ukuran_byte,
    )


def _hapus(db: Session, daftar: list[Foto]) -> int:
    for x in daftar:
        hapus_berkas(x.lokasi_file)
        db.delete(x)
    return len(daftar)


@router.get("", response_model=list[FotoKeluar])
def arsip(
    sumber: str | None = Query(None, pattern="^(Logbook|Kendala)$"),
    jabatan: Jabatan | None = None,
    batas: int = Query(200, ge=1, le=1000),
    db: Session = Depends(ambil_db),
    _: User = Depends(hanya_super),
):
    q = (
        select(Foto)
        .options(
            selectinload(Foto.logbook).selectinload(Logbook.petugas),
            selectinload(Foto.kendala).selectinload(Kendala.petugas),
        )
        .order_by(Foto.diambil_pada.desc())
    )
    if sumber == "Logbook":
        q = q.where(Foto.logbook_id.is_not(None))
    elif sumber == "Kendala":
        q = q.where(Foto.kendala_id.is_not(None))
    hasil = [_keluar(x) for x in db.scalars(q.limit(batas))]
    if jabatan:
        hasil = [h for h in hasil if h.jabatan == jabatan]
    return hasil


@router.get("/statistik", response_model=StatistikFoto)
def statistik(db: Session = Depends(ambil_db), _: User = Depends(hanya_super)):
    total, ukuran = db.execute(select(func.count(), func.coalesce(func.sum(Foto.ukuran_byte), 0))).one()
    enam_bulan_lalu = f.sekarang() - timedelta(days=182)
    lama = db.scalar(select(func.count()).where(Foto.diambil_pada < enam_bulan_lalu))
    return StatistikFoto(total=total, ukuran_byte=ukuran, lebih_enam_bulan=lama)


@router.post("/hapus", response_model=HasilHapus)
def hapus_terpilih(isi: HapusFoto, db: Session = Depends(ambil_db), admin: User = Depends(hanya_super)):
    daftar = list(db.scalars(select(Foto).where(Foto.id.in_(isi.ids))))
    n = _hapus(db, daftar)
    catat(db, admin, "hapus_foto", f"{n} foto dihapus manual")
    db.commit()
    return HasilHapus(terhapus=n)


@router.post("/hapus-sebelum", response_model=HasilHapus)
def hapus_sebelum(isi: HapusFotoSebelum, db: Session = Depends(ambil_db), admin: User = Depends(hanya_super)):
    if isi.konfirmasi != "HAPUS":
        raise HTTPException(422, 'Ketik "HAPUS" untuk mengonfirmasi.')
    if isi.tanggal > f.hari_ini() - timedelta(days=30):
        raise HTTPException(422, "Demi keamanan, hanya foto yang lebih dari 30 hari yang bisa dihapus massal.")
    daftar = list(db.scalars(select(Foto).where(Foto.diambil_pada < f.awal_hari(isi.tanggal))))
    n = _hapus(db, daftar)
    catat(db, admin, "hapus_foto_massal", f"{n} foto sebelum {isi.tanggal} dihapus")
    db.commit()
    return HasilHapus(terhapus=n)
