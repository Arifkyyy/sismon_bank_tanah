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
    foto: str | None = None  # URL foto profil


class SesiKeluar(Skema):
    peran: Peran
    akun: AkunKeluar


class HasilMasuk(SesiKeluar):
    token: str


class UbahProfil(Skema):
    """Jabatan, email, dan NIP sengaja tidak ada: hanya admin yang boleh mengubahnya."""
    nama: str = Field(min_length=1, max_length=120)
    foto: str | None = None  # data URL foto baru; None = tidak diganti
    hapus_foto: bool = False


class GantiSandi(Skema):
    sandi_lama: str
    sandi_baru: str = Field(min_length=8)


# ---------------------------------------------------------------- Petugas & akun

class PetugasKeluar(Skema):
    """= interface Petugas."""
    id: int
    nama: str
    jabatan: Jabatan
    foto_profil: str | None = None
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
    foto_profil: str | None = None


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
    keterangan: str = Field(min_length=1)
    foto: list[str] = Field(min_length=1, description="Data URL hasil kamera")
    latitude: float | None = None
    longitude: float | None = None


class LogbookKeluar(Skema):
    """= interface Logbook."""
    id: int
    nama: str
    jabatan: Jabatan
    foto_profil: str | None = None
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
    foto_profil: str | None = None
    tanggal: str
    tanggal_iso: str
    hari: str
    jam: str
    keterangan: str
    status: StatusKendala
    foto: Literal["a", "b", "c"]
    foto_url: list[str] = []
    # kapan admin terakhir mengubah statusnya, mis. '15 Sep 2026 · 10.24'
    diperbarui_pada: str | None = None


class UbahStatusKendala(Skema):
    status: StatusKendala


# ---------------------------------------------------------------- Lembur

class LemburKeluar(Skema):
    """= interface Lembur."""
    id: str
    nama: str
    jabatan: Jabatan
    foto_profil: str | None = None
    tanggal: str
    tanggal_iso: str
    rentang: str
    total: str
    # lama lembur dalam menit (aktual bila dikoreksi) — untuk dijumlahkan frontend
    menit: int
    keterangan: str
    status: Literal["Menunggu", "Diterima", "Ditolak", "Selesai"]
    alasan: str | None = None
    dijawab_pada: str | None = None
    # kapan admin mengirim penugasan ke petugas
    dikirim_pada: str | None = None
    dibuat_oleh: str | None = None
    pembuat_peran: Literal["admin", "superadmin"] | None = None
    pembuat_unit: str | None = None
    pembuat_foto: str | None = None
    # tarif yang dikunci saat dikirim, dan tarif × lama lembur (rupiah)
    tarif_per_jam: int | None = None
    upah: int | None = None
    # Jam yang benar-benar dikerjakan bila dikoreksi admin, mis. '18.00 – 21.30'.
    # Bila ada, `total` dan `upah` sudah dihitung dari jam ini.
    rentang_aktual: str | None = None
    mulai_aktual: str | None = None
    selesai_aktual: str | None = None
    dibayar_pada: str | None = None
    dibayar_oleh: str | None = None


class JamAktualMasuk(Skema):
    """Kosongkan keduanya (null) untuk kembali ke jam rencana."""
    mulai: time | None = None
    selesai: time | None = None


class TarifLemburKeluar(Skema):
    tarif_per_jam: int
    diubah_pada: str | None = None
    diubah_oleh: str | None = None


class TarifLemburMasuk(Skema):
    tarif_per_jam: int = Field(ge=1000, le=1_000_000)


class DrafKeluar(Skema):
    """= interface DrafLembur."""
    id: str
    nama: str
    jabatan: Jabatan
    foto_profil: str | None = None
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
    foto_profil: str | None = None
    hari: int
    logbook: int
    kendala: int
    lembur: str
    # Lembar checklist yang sudah dikirim, mis. '12/14 hari'
    checklist: str
    # Uang lembur (rupiah) dari penugasan yang diterima dalam periode
    upah: int = 0
    upah_dibayar: int = 0


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
    foto_profil: str | None = None
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
    foto_profil: str | None = None
    tanggal: str
    tanggal_iso: str
    status: Literal["Draf", "Dikirim", "Belum diisi"]
    total_kotak: int
    terisi: int
    tidak: int
    persen: int
    dikirim_pada: str | None = None


# ---------------------------------------------------------------- Web Push

class KunciPush(Skema):
    """Kunci publik VAPID; kosong berarti push belum disiapkan di server ini."""
    kunci: str


class KunciLangganan(Skema):
    p256dh: str = Field(min_length=1, max_length=200)
    auth: str = Field(min_length=1, max_length=100)


class LanggananMasuk(Skema):
    """Bentuk sama dengan PushSubscription.toJSON() di browser, ditambah keterangan perangkat."""
    endpoint: str = Field(min_length=1, max_length=2000)
    keys: KunciLangganan
    perangkat: str = Field(default="", max_length=200)


class LanggananHapus(Skema):
    endpoint: str = Field(min_length=1, max_length=2000)


# ---------------------------------------------------------------- Jadwal shift

WarnaShift = Literal["hijau", "hijau-tua", "emas", "tanah", "ink", "abu"]
StatusTukar = Literal["Menunggu Rekan", "Menunggu Admin", "Disetujui", "Ditolak", "Dibatalkan"]


class ShiftKeluar(Skema):
    """= interface Shift."""
    id: int
    nama: str
    kode: str
    # '07:00' untuk isian form; kosong untuk Libur.
    mulai: str | None = None
    selesai: str | None = None
    # '07.00 – 15.00' untuk tampilan; kosong untuk Libur.
    rentang: str | None = None
    lintas_hari: bool = False
    dua_puluh_empat_jam: bool = False
    jabatan: list[Jabatan]
    warna: WarnaShift
    aktif: bool
    sistem: bool
    # Sudah dipakai di jadwal/tukar = tidak bisa dihapus, hanya dinonaktifkan.
    dipakai: bool = False


class ShiftMasuk(Skema):
    nama: str = Field(min_length=1, max_length=40)
    kode: str = Field(min_length=1, max_length=2, pattern=r"^[A-Za-z0-9]{1,2}$")
    mulai: time
    selesai: time
    jabatan: list[Jabatan] = Field(min_length=1)
    warna: WarnaShift
    aktif: bool = True


class AktifShift(Skema):
    aktif: bool


class PetugasJadwal(Skema):
    id: int
    nama: str
    jabatan: Jabatan
    status: StatusAkun
    foto_profil: str | None = None


class KotakJadwal(Skema):
    petugas_id: int
    tanggal: str  # ISO
    shift_id: int
    # Kotak hasil tukar shift (tanda ⇄).
    tukar: bool = False
    # Ikut permintaan tukar yang masih berjalan.
    diajukan_tukar: bool = False


class JadwalPeriode(Skema):
    dari: str
    sampai: str
    petugas: list[PetugasJadwal]
    kotak: list[KotakJadwal]


class AturKotak(Skema):
    petugas_id: int
    tanggal: date
    # None = kosongkan.
    shift_id: int | None = None


class HasilAturKotak(Skema):
    kotak: KotakJadwal | None = None
    tukar_dibatalkan: int = 0


class IsiMassal(Skema):
    petugas_ids: list[int] = Field(min_length=1)
    dari: date
    sampai: date
    shift_id: int
    # false = tolak (409) bila ada kotak terisi dengan shift lain.
    timpa: bool = False


class SalinPeriode(Skema):
    """Salin isi periode sebelumnya ke periode dari–sampai."""
    mode: Literal["minggu", "bulan"]
    dari: date
    sampai: date
    jabatan: Jabatan | None = None
    timpa: bool = False


class HasilMassal(Skema):
    diisi: int
    # Kotak yang tidak disalin karena shift sumbernya nonaktif / tidak cocok jabatan.
    dilewati: int = 0
    tukar_dibatalkan: int = 0


class JadwalSaya(Skema):
    """Satu hari di halaman Jadwal Saya; shift kosong = belum dijadwalkan."""
    tanggal: str  # ISO
    tanggal_teks: str
    hari: str
    shift: ShiftKeluar | None = None
    tukar: bool = False
    diajukan_tukar: bool = False
    diubah_pada: str | None = None
    diatur_oleh: str | None = None


class RekanShift(Skema):
    id: int
    nama: str
    status: StatusAkun
    foto_profil: str | None = None
    shift: ShiftKeluar | None = None
    diajukan_tukar: bool = False


class HariRekan(Skema):
    tanggal: str
    tanggal_teks: str
    hari: str
    shift: ShiftKeluar | None = None
    diajukan_tukar: bool = False


class AjukanTukar(Skema):
    tanggal_saya: date
    rekan_id: int
    tanggal_rekan: date
    alasan: str = Field(min_length=1, max_length=500)


class JawabTukar(Skema):
    setuju: bool
    alasan: str = Field(default="", max_length=500)


class PihakTukar(Skema):
    id: int
    nama: str
    foto_profil: str | None = None
    tanggal: str  # ISO
    tanggal_teks: str
    hari: str
    shift: ShiftKeluar


class TukarKeluar(Skema):
    """= interface TukarShift."""
    id: int
    status: StatusTukar
    jabatan: Jabatan
    pemohon: PihakTukar
    rekan: PihakTukar
    alasan: str
    alasan_tolak: str | None = None
    # 'rekan' / 'admin' bila Ditolak.
    ditolak_oleh: Literal["rekan", "admin"] | None = None
    catatan_batal: str | None = None
    dibuat_pada: str
    dijawab_rekan_pada: str | None = None
    diputus_pada: str | None = None
    diputus_oleh: str | None = None
    diperbarui_pada: str
    # Hanya di /tukar/saya: posisi pengguna yang sedang masuk.
    peran_saya: Literal["pemohon", "rekan"] | None = None
