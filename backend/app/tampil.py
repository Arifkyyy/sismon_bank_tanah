"""Pengubah baris database → skema keluaran. Dipakai beberapa router."""
from collections import defaultdict
from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app import format as f
from app.foto_util import url_foto, url_foto_profil
from app.models import Kendala, Lembur, Logbook, User
from app.schemas import AkunKeluar, DrafKeluar, KendalaKeluar, LemburKeluar, LogbookKeluar, PetugasKeluar


def akun(u: User) -> AkunKeluar:
    return AkunKeluar(
        id=u.id,
        nama=u.nama,
        peran=f.LABEL_PERAN.get(u.peran, u.jabatan or "Petugas"),
        email=u.email,
        inisial=f.inisial(u.nama),
        nip=u.nip,
        unit=u.unit,
        telepon=u.telepon,
        bergabung=f.tanggal_teks(f.ke_wib(u.dibuat_pada).date()) if u.dibuat_pada else "",
        emas=u.peran == "superadmin",
        foto=url_foto_profil(u.foto_profil),
    )


def petugas(u: User) -> PetugasKeluar:
    return PetugasKeluar(
        id=u.id,
        nama=u.nama,
        jabatan=u.jabatan,
        foto_profil=url_foto_profil(u.foto_profil),
        email=u.email,
        telepon=u.telepon,
        status=u.status,
        nip=u.nip,
        unit=u.unit,
    )


def status_lembur(l: Lembur) -> str:
    """Penugasan yang diterima dan tanggalnya sudah lewat dianggap 'Selesai'."""
    if l.status == "Diterima" and l.tanggal < f.hari_ini():
        return "Selesai"
    return l.status


def menit_lembur_per_hari(db: Session, petugas_ids: set[int], tanggal: set[date]) -> dict[tuple[int, date], int]:
    """Total menit lembur yang diterima, per (petugas, tanggal)."""
    if not petugas_ids or not tanggal:
        return {}
    baris = db.scalars(
        select(Lembur).where(
            Lembur.status == "Diterima",
            Lembur.petugas_id.in_(petugas_ids),
            Lembur.tanggal.in_(tanggal),
        )
    )
    total: dict[tuple[int, date], int] = defaultdict(int)
    for l in baris:
        total[(l.petugas_id, l.tanggal)] += f.menit_lembur(l.jam_mulai, l.jam_selesai)
    return total


def daftar_logbook(db: Session, baris: list[Logbook]) -> list[LogbookKeluar]:
    lembur = menit_lembur_per_hari(
        db, {b.petugas_id for b in baris}, {f.ke_wib(b.waktu).date() for b in baris}
    )
    hasil = []
    for b in baris:
        w = f.ke_wib(b.waktu)
        hasil.append(
            LogbookKeluar(
                id=b.id,
                nama=b.petugas.nama,
                jabatan=b.petugas.jabatan,
                foto_profil=url_foto_profil(b.petugas.foto_profil),
                tanggal=f.tanggal_teks(w.date()),
                tanggal_iso=w.date().isoformat(),
                hari=f.nama_hari(w.date()),
                jam=f.jam_teks(w),
                keterangan=b.keterangan,
                foto=f.varian_foto(b.id),
                foto_url=[url_foto(x.lokasi_file) for x in b.foto],
                lembur=f.lama_singkat(lembur.get((b.petugas_id, w.date()), 0)),
            )
        )
    return hasil


def kendala(k: Kendala) -> KendalaKeluar:
    w = f.ke_wib(k.waktu)
    return KendalaKeluar(
        id=k.id,
        nama=k.petugas.nama,
        jabatan=k.petugas.jabatan,
        foto_profil=url_foto_profil(k.petugas.foto_profil),
        tanggal=f.tanggal_teks(w.date()),
        tanggal_iso=w.date().isoformat(),
        hari=f.nama_hari(w.date()),
        jam=f.jam_teks(w),
        keterangan=k.keterangan,
        status=k.status,
        foto=f.varian_foto(k.id),
        foto_url=[url_foto(x.lokasi_file) for x in k.foto],
        diperbarui_pada=f.cap_waktu(k.diperbarui_pada),
    )


def lembur(l: Lembur) -> LemburKeluar:
    return LemburKeluar(
        id=str(l.id),
        nama=l.petugas.nama if l.petugas else "",
        jabatan=l.jabatan,
        foto_profil=url_foto_profil(l.petugas.foto_profil) if l.petugas else None,
        tanggal=f.tanggal_teks(l.tanggal),
        tanggal_iso=l.tanggal.isoformat(),
        rentang=f"{f.jam_teks(l.jam_mulai)} – {f.jam_teks(l.jam_selesai)}",
        total=f.lama_teks(f.menit_lembur(l.jam_mulai, l.jam_selesai)),
        keterangan=l.keterangan,
        status=status_lembur(l),
        alasan=l.alasan_tolak,
        dijawab_pada=f.cap_waktu(l.dijawab_pada),
        dikirim_pada=f.cap_waktu(l.dikirim_pada),
        dibuat_oleh=l.pembuat.nama if l.pembuat else None,
        pembuat_peran=l.pembuat.peran if l.pembuat else None,
        pembuat_unit=l.pembuat.unit if l.pembuat else None,
        pembuat_foto=url_foto_profil(l.pembuat.foto_profil) if l.pembuat else None,
    )


def draf(l: Lembur) -> DrafKeluar:
    return DrafKeluar(
        id=str(l.id),
        nama=l.petugas.nama if l.petugas else "",
        jabatan=l.jabatan,
        foto_profil=url_foto_profil(l.petugas.foto_profil) if l.petugas else None,
        tanggal=l.tanggal.isoformat(),
        mulai=l.jam_mulai.strftime("%H:%M"),
        selesai=l.jam_selesai.strftime("%H:%M"),
        keterangan=l.keterangan,
    )
