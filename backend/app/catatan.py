"""Logika bersama Logbook dan Laporan kendala (keduanya 'catatan + foto')."""
from datetime import date

from fastapi import HTTPException
from sqlalchemy import Select, or_
from sqlalchemy.orm import Session

from app import format as f
from app.config import pengaturan
from app.foto_util import hapus_berkas, simpan_data_url
from app.models import Foto, Kendala, Logbook, User
from app.schemas import CatatanMasuk


def periksa_petugas(db: Session, petugas_id: int) -> User:
    p = db.get(User, petugas_id)
    if not p or p.peran != "user":
        raise HTTPException(422, "Petugas tidak ditemukan.")
    if p.status == "Nonaktif":
        raise HTTPException(422, f"Akun {p.nama} sudah nonaktif.")
    return p


def periksa_isi(isi: CatatanMasuk) -> None:
    if len(isi.foto) > pengaturan.maks_foto:
        raise HTTPException(422, f"Maksimal {pengaturan.maks_foto} foto.")
    waktu = f.gabung_waktu(isi.tanggal, isi.jam)
    # Toleransi 5 menit untuk jam HP yang sedikit lebih cepat.
    if (waktu - f.sekarang()).total_seconds() > 300:
        raise HTTPException(422, "Tanggal dan jam tidak boleh di masa depan.")


def simpan_foto(daftar: list[str], isi: CatatanMasuk, pemilik: Logbook | Kendala) -> list[str]:
    """Menyimpan semua foto. Mengembalikan lokasi berkas supaya bisa dibersihkan kalau gagal."""
    tersimpan: list[str] = []
    try:
        for data_url in daftar:
            lokasi, ukuran = simpan_data_url(data_url)
            tersimpan.append(lokasi)
            pemilik.foto.append(
                Foto(
                    lokasi_file=lokasi,
                    ukuran_byte=ukuran,
                    diambil_pada=f.gabung_waktu(isi.tanggal, isi.jam),
                    latitude=isi.latitude,
                    longitude=isi.longitude,
                )
            )
    except Exception:
        for lokasi in tersimpan:
            hapus_berkas(lokasi)
        raise
    return tersimpan


def saring(
    q: Select,
    model: type[Logbook] | type[Kendala],
    user: User,
    tanggal: date | None,
    dari: date | None,
    sampai: date | None,
    jabatan: str | None,
) -> Select:
    """Filter umum. Petugas hanya melihat catatan miliknya atau yang ia kirim."""
    if user.peran == "user":
        q = q.where(or_(model.petugas_id == user.id, model.dibuat_oleh == user.id))
    if tanggal:
        q = q.where(model.waktu >= f.awal_hari(tanggal), model.waktu < f.akhir_hari(tanggal))
    if dari:
        q = q.where(model.waktu >= f.awal_hari(dari))
    if sampai:
        q = q.where(model.waktu < f.akhir_hari(sampai))
    if jabatan:
        q = q.join(User, model.petugas_id == User.id).where(User.jabatan == jabatan)
    return q
