"""
Penanda laporan yang tidak wajar (masukan meeting: fraud detection, versi sederhana).

Sistem hanya memberi TANDA beserta alasannya; admin yang menilai apakah wajar,
lalai, atau curang. Tidak ada skor dan tidak ada yang disimpan ke database:
tanda dihitung ulang setiap daftar diminta, dari data yang sudah ada.

Aturan:
- Di luar jam shift / Di hari libur: waktu kejadian tidak masuk shift petugas
  hari itu (shift lintas hari dari kemarin ikut dihitung). Petugas yang belum
  punya jadwal pada tanggal itu tidak ditandai.
- Dikirim terlambat: dikirim sendiri oleh petugas lebih dari 2 jam setelah
  waktu kejadian yang ia tulis. Catatan yang diisi admin atas nama petugas tidak
  ditandai.
- Laporan beruntun (khusus logbook): 5 catatan atau lebih dari petugas yang
  sama terkirim dalam 5 menit.
"""
from collections import defaultdict
from datetime import date, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app import format as f
from app.models import JadwalShift, Kendala, Logbook, Shift

LUAR_SHIFT = "Di luar jam shift"
HARI_LIBUR = "Di hari libur"
TERLAMBAT = "Dikirim terlambat"
BERUNTUN = "Laporan beruntun"

BATAS_TERLAMBAT = timedelta(hours=2)
TOLERANSI_SHIFT = timedelta(minutes=30)
BERUNTUN_JUMLAH = 5
BERUNTUN_JENDELA = timedelta(minutes=5)


def _jadwal(db: Session, petugas_ids: set[int], tanggal: set[date]) -> dict[tuple[int, date], JadwalShift]:
    """Jadwal petugas pada tanggal kejadian dan sehari sebelumnya (untuk shift lintas hari)."""
    if not petugas_ids or not tanggal:
        return {}
    hari = tanggal | {t - timedelta(days=1) for t in tanggal}
    q = (
        select(JadwalShift)
        .options(selectinload(JadwalShift.shift))
        .where(JadwalShift.user_id.in_(petugas_ids), JadwalShift.tanggal.in_(hari))
    )
    return {(j.user_id, j.tanggal): j for j in db.scalars(q)}


def _rentang(tanggal: date, shift: Shift) -> tuple[datetime, datetime] | None:
    """Awal-akhir shift dalam WIB; None untuk shift tanpa jam (Libur)."""
    if shift.jam_mulai is None or shift.jam_selesai is None:
        return None
    mulai = f.gabung_waktu(tanggal, shift.jam_mulai)
    selesai = f.gabung_waktu(tanggal, shift.jam_selesai)
    if selesai <= mulai:  # lintas hari, atau 24 jam bila jamnya sama
        selesai += timedelta(days=1)
    return mulai, selesai


def _tanda_shift(jadwal: dict[tuple[int, date], JadwalShift], petugas_id: int, waktu: datetime) -> str | None:
    w = f.ke_wib(waktu)
    hari_itu = jadwal.get((petugas_id, w.date()))
    for tgl in (w.date(), w.date() - timedelta(days=1)):
        j = jadwal.get((petugas_id, tgl))
        r = _rentang(tgl, j.shift) if j else None
        if r and r[0] - TOLERANSI_SHIFT <= w <= r[1] + TOLERANSI_SHIFT:
            return None
    if hari_itu is None:
        return None
    return HARI_LIBUR if hari_itu.shift.jam_mulai is None else LUAR_SHIFT


def _terlambat(b: Logbook | Kendala) -> bool:
    return b.dibuat_oleh == b.petugas_id and b.dibuat_pada - b.waktu > BATAS_TERLAMBAT


def _beruntun(db: Session, baris: list[Logbook]) -> set[int]:
    """Id logbook yang termasuk rangkaian ≥5 catatan dalam 5 menit dari petugas yang sama."""
    if not baris:
        return set()
    awal = min(b.dibuat_pada for b in baris) - BERUNTUN_JENDELA
    akhir = max(b.dibuat_pada for b in baris) + BERUNTUN_JENDELA
    q = (
        select(Logbook.id, Logbook.petugas_id, Logbook.dibuat_pada)
        .where(Logbook.petugas_id.in_({b.petugas_id for b in baris}), Logbook.dibuat_pada.between(awal, akhir))
        .order_by(Logbook.petugas_id, Logbook.dibuat_pada)
    )
    per_petugas: dict[int, list[tuple[datetime, int]]] = defaultdict(list)
    for id_, petugas_id, dibuat in db.execute(q):
        per_petugas[petugas_id].append((dibuat, id_))

    hasil: set[int] = set()
    for daftar in per_petugas.values():
        kiri = 0
        for kanan in range(len(daftar)):
            while daftar[kanan][0] - daftar[kiri][0] > BERUNTUN_JENDELA:
                kiri += 1
            if kanan - kiri + 1 >= BERUNTUN_JUMLAH:
                hasil.update(id_ for _, id_ in daftar[kiri : kanan + 1])
    return hasil


def untuk_logbook(db: Session, baris: list[Logbook]) -> dict[int, list[str]]:
    jadwal = _jadwal(db, {b.petugas_id for b in baris}, {f.ke_wib(b.waktu).date() for b in baris})
    runtun = _beruntun(db, baris)
    hasil: dict[int, list[str]] = {}
    for b in baris:
        tanda = [t for t in (_tanda_shift(jadwal, b.petugas_id, b.waktu),) if t]
        if _terlambat(b):
            tanda.append(TERLAMBAT)
        if b.id in runtun:
            tanda.append(BERUNTUN)
        if tanda:
            hasil[b.id] = tanda
    return hasil


def untuk_kendala(db: Session, baris: list[Kendala]) -> dict[int, list[str]]:
    jadwal = _jadwal(db, {k.petugas_id for k in baris}, {f.ke_wib(k.waktu).date() for k in baris})
    hasil: dict[int, list[str]] = {}
    for k in baris:
        tanda = [t for t in (_tanda_shift(jadwal, k.petugas_id, k.waktu),) if t]
        if _terlambat(k):
            tanda.append(TERLAMBAT)
        if tanda:
            hasil[k.id] = tanda
    return hasil
