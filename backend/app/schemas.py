"""
Bentuk data yang keluar-masuk API.

Nama field ditulis snake_case di Python, tapi otomatis jadi camelCase di JSON
(tanggal_iso → tanggalIso) supaya cocok dengan src/types/index.ts di frontend.
"""
from datetime import date, time
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field
from pydantic.alias_generators import to_camel

Jabatan = Literal["Security", "OB", "CS", "Messenger"]
Peran = Literal["superadmin", "admin", "user"]
StatusAkun = Literal["Aktif", "Cuti", "Nonaktif"]
StatusKendala = Literal["Baru", "Diproses", "Selesai"]


class Skema(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


# ---------------------------------------------------------------- Auth

class MasukMasuk(Skema):
    email: EmailStr
    sandi: str = Field(min_length=1)


class AkunKeluar(Skema):
    """= interface Akun di frontend."""
    id: int
    nama: str
    peran: str  # teks tampilan: 'Super Admin' / 'Admin' / 'Security' ...
    email: str
    inisial: str
    nip: str
    unit: str
    telepon: str = ""
    bergabung: str = ""
    emas: bool = False


class SesiKeluar(Skema):
    peran: Peran
    akun: AkunKeluar


class HasilMasuk(SesiKeluar):
    token: str


class GantiSandi(Skema):
    sandi_lama: str
    sandi_baru: str = Field(min_length=8)


# ---------------------------------------------------------------- Petugas & akun

class PetugasKeluar(Skema):
    """= interface Petugas."""
    id: int
    nama: str
    jabatan: Jabatan
    email: str
    telepon: str
    status: StatusAkun
    nip: str = ""
    unit: str = ""


class DetailPetugas(Skema):
    """Isi popup Lihat detail: yang tidak tampil di tabel Data user."""
    bergabung: str
    terakhir_masuk: str | None = None
    aktivitas_terakhir: str | None = None
    logbook_bulan_ini: int
    kendala_bulan_ini: int
    kendala_terbuka: int
    lembur_bulan_ini: str


class UbahPetugas(Skema):
    """Isi popup Ubah data di halaman Data user."""
    nama: str = Field(min_length=3, max_length=120)
    jabatan: Jabatan
    email: EmailStr
    telepon: str = Field(default="", max_length=30)
    nip: str = Field(default="", max_length=40)
    unit: str = Field(default="", max_length=120)
    status: StatusAkun


class AkunAdminKeluar(Skema):
    id: int
    nama: str
    email: str
    masuk: str
    status: StatusAkun


class AkunBaru(Skema):
    jenis: Literal["admin", "user"]
    nama: str = Field(min_length=3, max_length=120)
    jabatan: Jabatan | None = None
    nip: str = Field(default="", max_length=40)
    email: EmailStr
    unit: str = Field(default="", max_length=120)
    telepon: str = Field(default="", max_length=30)


class HasilAkunBaru(Skema):
    id: int
    email: str
    sandi_sementara: str


class UbahStatusAkun(Skema):
    status: StatusAkun


# ---------------------------------------------------------------- Logbook & kendala

class CatatanMasuk(Skema):
    """Isi form Logbook / Laporan kendala saat draf dikirim."""
    petugas_id: int
    tanggal: date
    jam: time
    keterangan: str = Field(min_length=20)
    foto: list[str] = Field(min_length=1, description="Data URL hasil kamera")
    latitude: float | None = None
    longitude: float | None = None


class LogbookKeluar(Skema):
    """= interface Logbook."""
    id: int
    nama: str
    jabatan: Jabatan
    tanggal: str
    tanggal_iso: str
    hari: str
    jam: str
    keterangan: str
    foto: Literal["a", "b", "c"]
    foto_url: list[str] = []
    lembur: str


class KendalaKeluar(Skema):
    """= interface Kendala."""
    id: int
    nama: str
    jabatan: Jabatan
    tanggal: str
    tanggal_iso: str
    hari: str
    jam: str
    keterangan: str
    status: StatusKendala
    foto: Literal["a", "b", "c"]
    foto_url: list[str] = []


class UbahStatusKendala(Skema):
    status: StatusKendala


# ---------------------------------------------------------------- Lembur

class LemburKeluar(Skema):
    """= interface Lembur."""
    id: str
    nama: str
    jabatan: Jabatan
    tanggal: str
    tanggal_iso: str
    rentang: str
    total: str
    keterangan: str
    status: Literal["Menunggu", "Diterima", "Ditolak", "Selesai"]
    alasan: str | None = None
    dijawab_pada: str | None = None
    dibuat_oleh: str | None = None
    pembuat_peran: Literal["admin", "superadmin"] | None = None
    pembuat_unit: str | None = None


class DrafKeluar(Skema):
    """= interface DrafLembur."""
    id: str
    nama: str
    jabatan: Jabatan
    tanggal: str
    mulai: str
    selesai: str
    keterangan: str


class DrafMasuk(Skema):
    petugas_id: int | None = None
    jabatan: Jabatan
    tanggal: date
    mulai: time
    selesai: time
    keterangan: str = ""


class TolakLembur(Skema):
    alasan: str = Field(min_length=5)


# ---------------------------------------------------------------- Statistik

class RekapKeluar(Skema):
    petugas_id: int
    nama: str
    jabatan: Jabatan
    hari: int
    logbook: int
    kendala: int
    lembur: str
    patuh: str
    # Lembar checklist yang sudah dikirim, mis. '12/14 hari'
    checklist: str


class HariKeluar(Skema):
    hari: str
    logbook: int
    lembur: float


class SebaranKeluar(Skema):
    label: str
    nilai: int


# ---------------------------------------------------------------- Foto

class FotoKeluar(Skema):
    id: int
    nama: str
    jabatan: Jabatan
    waktu: str
    waktu_iso: str
    sumber: Literal["Logbook", "Kendala"]
    url: str
    ukuran_byte: int


class StatistikFoto(Skema):
    total: int
    ukuran_byte: int
    lebih_enam_bulan: int


class HapusFoto(Skema):
    ids: list[int] = Field(min_length=1)


class HapusFotoSebelum(Skema):
    tanggal: date
    konfirmasi: str


class HasilHapus(Skema):
    terhapus: int


# ---------------------------------------------------------------- Checklist

Sesi = Literal["Harian", "Pagi", "Siang", "Sore"]
ModeChecklist = Literal["harian", "sesi"]


class ItemKeluar(Skema):
    id: int
    jabatan: Jabatan
    urutan: int
    teks: str
    mode: ModeChecklist
    aktif: bool


class ItemMasuk(Skema):
    jabatan: Jabatan
    teks: str = Field(min_length=3, max_length=300)
    mode: ModeChecklist = "harian"
    urutan: int | None = None
    aktif: bool = True


class UrutanMasuk(Skema):
    """Urutan baru item, dikirim sebagai daftar id dari atas ke bawah."""
    ids: list[int] = Field(min_length=1)


class JawabanKeluar(Skema):
    item_id: int
    sesi: Sesi
    status: Literal["Ya", "Tidak"]
    catatan: str = ""


class JawabanMasuk(Skema):
    item_id: int
    sesi: Sesi = "Harian"
    status: Literal["Ya", "Tidak"]
    catatan: str = Field(default="", max_length=500)


class LembarKeluar(Skema):
    """Satu lembar checklist lengkap dengan daftar item dan jawabannya."""
    id: int | None = None
    petugas_id: int
    nama: str
    jabatan: Jabatan
    tanggal: str
    tanggal_iso: str
    hari: str
    status: Literal["Draf", "Dikirim"]
    dikirim_pada: str | None = None
    bisa_diisi: bool
    item: list[ItemKeluar]
    jawaban: list[JawabanKeluar]
    total_kotak: int
    terisi: int
    tidak: int
    persen: int


class LembarMasuk(Skema):
    petugas_id: int
    tanggal: date
    jawaban: list[JawabanMasuk] = []
    # true = sekaligus dikunci (dikirim ke admin); false = simpan sebagai draf.
    kirim: bool = False


class RingkasKeluar(Skema):
    """Satu baris tabel checklist di halaman admin."""
    id: int | None = None
    petugas_id: int
    nama: str
    jabatan: Jabatan
    tanggal: str
    tanggal_iso: str
    status: Literal["Draf", "Dikirim", "Belum diisi"]
    total_kotak: int
    terisi: int
    tidak: int
    persen: int
    dikirim_pada: str | None = None
