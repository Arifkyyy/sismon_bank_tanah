"""Arsip foto bukti: lihat, unduh, dan hapus (khusus super admin)."""
import io
import re
import zipfile
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app import format as f
from app.audit import catat
from app.database import ambil_db
from app.deps import butuh_peran
from app import foto_util
from app.config import pengaturan
from app.foto_util import hapus_berkas, url_foto
from app.models import Foto, Kendala, Logbook, User
from app.schemas import FotoKeluar, HapusFoto, HapusFotoSebelum, HasilHapus, Jabatan, StatistikFoto, UnduhFoto

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
        tahap=x.tahap,
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


def _baca_berkas(lokasi: str) -> bytes | None:
    """Isi berkas foto dari R2 atau folder lokal; None bila berkasnya sudah tidak ada."""
    if klien := foto_util._r2():
        try:
            return klien.get_object(Bucket=pengaturan.r2_bucket, Key=lokasi)["Body"].read()
        except Exception:
            return None
    berkas = foto_util.FOLDER / lokasi
    return berkas.read_bytes() if berkas.is_file() else None


@router.post("/unduh")
def unduh_terpilih(isi: UnduhFoto, db: Session = Depends(ambil_db), admin: User = Depends(hanya_super)):
    """
    Foto terpilih dikemas menjadi satu berkas ZIP, dipisah per sumber
    (Logbook/Kendala). Dibuat di server karena tautan R2 berbeda domain,
    sehingga browser tidak bisa menggabungkannya sendiri.
    """
    q = (
        select(Foto)
        .options(
            selectinload(Foto.logbook).selectinload(Logbook.petugas),
            selectinload(Foto.kendala).selectinload(Kendala.petugas),
        )
        .where(Foto.id.in_(isi.ids))
        .order_by(Foto.diambil_pada)
    )
    daftar = list(db.scalars(q))
    if not daftar:
        raise HTTPException(404, "Foto yang dipilih tidak ditemukan.")

    wadah = io.BytesIO()
    hilang: list[str] = []
    # Foto sudah terkompresi (JPEG/PNG/WebP), jadi disimpan apa adanya tanpa kompresi ulang.
    with zipfile.ZipFile(wadah, "w", zipfile.ZIP_STORED) as z:
        for x in daftar:
            induk = x.logbook or x.kendala
            sumber = "Logbook" if x.logbook_id else "Kendala"
            nama = re.sub(r"[^\w]+", "-", induk.petugas.nama).strip("-") or "petugas"
            waktu = f.ke_wib(x.diambil_pada).strftime("%Y-%m-%d_%H%M")
            ekstensi = x.lokasi_file.rsplit(".", 1)[-1]
            judul = f"{sumber}/{waktu}_{nama}_{x.tahap}_{x.id}.{ekstensi}"
            isi_berkas = _baca_berkas(x.lokasi_file)
            if isi_berkas is None:
                hilang.append(judul)
                continue
            z.writestr(judul, isi_berkas)
        if hilang:
            z.writestr("FOTO-TIDAK-DITEMUKAN.txt", "Berkas berikut sudah tidak ada di penyimpanan:\n" + "\n".join(hilang))

    catat(db, admin, "unduh_foto", f"{len(daftar) - len(hilang)} foto diunduh")
    db.commit()
    nama_zip = f"arsip-foto-{f.hari_ini().isoformat()}.zip"
    return Response(
        wadah.getvalue(),
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{nama_zip}"'},
    )


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
