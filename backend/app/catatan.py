"""Logika bersama Logbook dan Laporan kendala (keduanya 'catatan + foto')."""
from datetime import date, datetime

from fastapi import HTTPException
from sqlalchemy import Select, or_
from sqlalchemy.orm import Session

from app import format as f
from app.config import pengaturan
from app.foto_util import hapus_berkas, simpan_data_url
from app.models import Foto, Kendala, Logbook, User
from app.schemas import CatatanMasuk


def periksa_petugas(db: Session, petugas_id: int, pengirim: User) -> User:
    # Petugas hanya boleh mencatat atas namanya sendiri; admin boleh mewakili.
    if pengirim.peran == "user" and petugas_id != pengirim.id:
        raise HTTPException(403, "Anda hanya bisa mengirim catatan atas nama sendiri.")
    p = db.get(User, petugas_id)
    if not p or p.peran != "user":
        raise HTTPException(422, "Petugas tidak ditemukan.")
    if p.status == "Nonaktif":
        raise HTTPException(422, f"Akun {p.nama} sudah nonaktif.")
    return p


def periksa_jumlah_foto(daftar: list[str]) -> None:
    if len(daftar) > pengaturan.maks_foto:
        raise HTTPException(422, f"Maksimal {pengaturan.maks_foto} foto.")


def periksa_isi(isi: CatatanMasuk) -> None:
    periksa_jumlah_foto(isi.foto)
    waktu = f.gabung_waktu(isi.tanggal, isi.jam)
    # Toleransi 5 menit untuk jam HP yang sedikit lebih cepat.
    if (waktu - f.sekarang()).total_seconds() > 300:
        raise HTTPException(422, "Tanggal dan jam tidak boleh di masa depan.")


def simpan_foto(
    daftar: list[str],
    pemilik: Logbook | Kendala,
    diambil_pada: datetime,
    latitude: float | None = None,
    longitude: float | None = None,
    tahap: str = "sebelum",
) -> list[str]:
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
                    diambil_pada=diambil_pada,
                    latitude=latitude,
                    longitude=longitude,
                    tahap=tahap,
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
    petugas_id: int | None = None,
    cari: str | None = None,
) -> Select:
    """
    Filter umum. Petugas hanya melihat catatan miliknya atau yang ia kirim,
    ditambah kendala yang ditugaskan kepadanya.
    """
    if user.peran == "user":
        milik = [model.petugas_id == user.id, model.dibuat_oleh == user.id]
        if model is Kendala:
            milik.append(Kendala.penangan_id == user.id)
        q = q.where(or_(*milik))
    if petugas_id:
        q = q.where(model.petugas_id == petugas_id)
    if tanggal:
        q = q.where(model.waktu >= f.awal_hari(tanggal), model.waktu < f.akhir_hari(tanggal))
    if dari:
        q = q.where(model.waktu >= f.awal_hari(dari))
    if sampai:
        q = q.where(model.waktu < f.akhir_hari(sampai))
    if jabatan or cari:
        q = q.join(User, model.petugas_id == User.id)
    if jabatan:
        q = q.where(User.jabatan == jabatan)
    if cari and cari.strip():
        q = q.where(User.nama.ilike(f"%{cari.strip()}%"))
    return q
