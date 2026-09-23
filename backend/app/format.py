"""
Mengubah data database menjadi bentuk yang dipakai frontend
(lihat src/types/index.ts). Semua tampilan tanggal/jam memakai WIB.
"""
from datetime import date, datetime, time, timedelta

from app.config import ZONA

BULAN_PENDEK = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]
NAMA_HARI = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"]  # urutan weekday() Python
HARI_PENDEK = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"]
LABEL_PERAN = {"superadmin": "Super Admin", "admin": "Admin"}


def sekarang() -> datetime:
    return datetime.now(ZONA)


def hari_ini() -> date:
    return sekarang().date()


def ke_wib(t: datetime) -> datetime:
    return t.astimezone(ZONA)


def tanggal_teks(t: date) -> str:
    """date → '15 Sep 2026'"""
    return f"{t.day:02d} {BULAN_PENDEK[t.month - 1]} {t.year}"


def nama_hari(t: date) -> str:
    return NAMA_HARI[t.weekday()]


def jam_teks(t: time | datetime) -> str:
    """→ '07.02'"""
    return f"{t.hour:02d}.{t.minute:02d}"


def cap_waktu(t: datetime | None) -> str | None:
    """→ '15 Sep 2026 · 10.24'"""
    if t is None:
        return None
    w = ke_wib(t)
    return f"{tanggal_teks(w.date())} · {jam_teks(w)}"


def menit_lembur(mulai: time, selesai: time) -> int:
    """Lama lembur dalam menit. Lewat tengah malam dihitung ke hari berikutnya."""
    menit = (selesai.hour * 60 + selesai.minute) - (mulai.hour * 60 + mulai.minute)
    return menit + 24 * 60 if menit <= 0 else menit


def lama_teks(menit: int) -> str:
    """→ '4 jam' / '3 jam 30 menit' (sama dengan lamaLembur di frontend)."""
    jam, sisa = divmod(menit, 60)
    if jam == 0:
        return f"{sisa} menit"
    return f"{jam} jam" if sisa == 0 else f"{jam} jam {sisa} menit"


def lama_singkat(menit: int) -> str:
    """→ '1j 30m', atau '—' bila nol (kolom Lembur di logbook)."""
    if menit <= 0:
        return "—"
    jam, sisa = divmod(menit, 60)
    return f"{jam}j {sisa:02d}m"


def inisial(nama: str) -> str:
    bagian = [b for b in nama.split() if b]
    return "".join(b[0] for b in bagian[:2]).upper() or "?"


def varian_foto(id_: int) -> str:
    """Warna placeholder 'a'/'b'/'c' untuk catatan tanpa foto."""
    return "abc"[id_ % 3]


def gabung_waktu(tanggal: date, jam: time) -> datetime:
    return datetime.combine(tanggal, jam, tzinfo=ZONA)


def awal_hari(t: date) -> datetime:
    return datetime.combine(t, time.min, tzinfo=ZONA)


def akhir_hari(t: date) -> datetime:
    """Awal hari berikutnya — dipakai dengan '<' supaya tidak ada yang terlewat."""
    return awal_hari(t + timedelta(days=1))
