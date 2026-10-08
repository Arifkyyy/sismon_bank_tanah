"""
Struktur tabel database.

Tabel utama: users, logbook, kendala, lembur, foto, log_audit, checklist_*, langganan_push,
shift, shift_jabatan, jadwal_shift, tukar_shift.
Pilihan tetap (peran, jabatan, status) disimpan sebagai teks biasa lalu
dijaga dengan CHECK, supaya gampang ditambah nanti tanpa migrasi ENUM.
"""
from datetime import date, datetime, time

from sqlalchemy import (
    Boolean, CheckConstraint, Date, DateTime, Float, ForeignKey, Index, Integer, String, Text, Time,
    UniqueConstraint, func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

PERAN = ("superadmin", "admin", "user")
JABATAN = ("Security", "OB", "CS", "Messenger")
STATUS_AKUN = ("Aktif", "Cuti", "Nonaktif")
STATUS_KENDALA = ("Baru", "Diproses", "Selesai")
TAHAP_FOTO = ("sebelum", "sesudah")
# 'Selesai' pada lembur tidak disimpan: dihitung dari 'Diterima' + tanggal sudah lewat.
STATUS_LEMBUR = ("Draf", "Menunggu", "Diterima", "Ditolak")
# 'harian' = satu status per hari (OB/OG). 'sesi' = dicek Pagi, Siang, Sore (Cleaning Service).
MODE_CHECKLIST = ("harian", "sesi")
SESI = ("Harian", "Pagi", "Siang", "Sore")
STATUS_CHECKLIST = ("Draf", "Dikirim")
STATUS_JAWABAN = ("Ya", "Tidak")
# Nama warna, dipetakan ke kelas Tailwind di src/lib/shift.ts. Merah sengaja tidak ada:
# di aplikasi ini merah khusus untuk tindakan menghapus.
WARNA_SHIFT = ("hijau", "hijau-tua", "emas", "tanah", "ink", "abu")
STATUS_TUKAR = ("Menunggu Rekan", "Menunggu Admin", "Disetujui", "Ditolak", "Dibatalkan")
TUKAR_BERJALAN = ("Menunggu Rekan", "Menunggu Admin")


def _pilihan(kolom: str, nilai: tuple[str, ...]) -> str:
    daftar = ", ".join(f"'{n}'" for n in nilai)
    return f"{kolom} IN ({daftar})"


class User(Base):
    """Semua akun: super admin, admin, dan petugas."""

    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint(_pilihan("peran", PERAN), name="ck_users_peran"),
        CheckConstraint(f"jabatan IS NULL OR {_pilihan('jabatan', JABATAN)}", name="ck_users_jabatan"),
        CheckConstraint(_pilihan("status", STATUS_AKUN), name="ck_users_status"),
        # Petugas wajib punya jabatan; admin tidak.
        CheckConstraint("peran <> 'user' OR jabatan IS NOT NULL", name="ck_users_petugas_berjabatan"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    nama: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(160), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(200))
    peran: Mapped[str] = mapped_column(String(20))
    jabatan: Mapped[str | None] = mapped_column(String(20))
    nip: Mapped[str] = mapped_column(String(40), default="")
    unit: Mapped[str] = mapped_column(String(120), default="")
    telepon: Mapped[str] = mapped_column(String(30), default="")
    # Lokasi relatif di folder uploads/, atau None bila belum memasang foto profil.
    foto_profil: Mapped[str | None] = mapped_column(String(200))
    status: Mapped[str] = mapped_column(String(20), default="Aktif")
    terakhir_masuk: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    dibuat_pada: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Logbook(Base):
    __tablename__ = "logbook"
    __table_args__ = (Index("ix_logbook_petugas_waktu", "petugas_id", "waktu"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    # Menghapus akun petugas ikut menghapus logbook-nya (sesuai peringatan di Kelola akun).
    petugas_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    # Siapa yang menekan tombol kirim (bisa beda orang kalau HP pos dipakai bergantian).
    dibuat_oleh: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    waktu: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    keterangan: Mapped[str] = mapped_column(Text)
    dibuat_pada: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    petugas: Mapped[User] = relationship(foreign_keys=[petugas_id])
    foto: Mapped[list["Foto"]] = relationship(
        back_populates="logbook", cascade="all, delete-orphan", order_by="Foto.id"
    )


class Kendala(Base):
    __tablename__ = "kendala"
    __table_args__ = (
        CheckConstraint(_pilihan("status", STATUS_KENDALA), name="ck_kendala_status"),
        Index("ix_kendala_petugas_waktu", "petugas_id", "waktu"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    petugas_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    dibuat_oleh: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    waktu: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    keterangan: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="Baru", index=True)
    # Petugas yang bertugas memperbaiki; awalnya = pelapor, bisa dialihkan admin.
    # None bila akun penangannya sudah dihapus.
    penangan_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), index=True)
    ditugaskan_pada: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    mulai_pada: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    selesai_pada: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    diselesaikan_oleh: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    keterangan_selesai: Mapped[str | None] = mapped_column(Text)
    dibuka_lagi_pada: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    # Perubahan terakhir apa pun (status, penangan) — untuk notifikasi.
    diperbarui_pada: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    dibuat_pada: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    petugas: Mapped[User] = relationship(foreign_keys=[petugas_id])
    penangan: Mapped[User | None] = relationship(foreign_keys=[penangan_id])
    penyelesai: Mapped[User | None] = relationship(foreign_keys=[diselesaikan_oleh])
    foto: Mapped[list["Foto"]] = relationship(
        back_populates="kendala", cascade="all, delete-orphan", order_by="Foto.id"
    )

    @property
    def foto_sebelum(self) -> list["Foto"]:
        return [x for x in self.foto if x.tahap == "sebelum"]

    @property
    def foto_sesudah(self) -> list["Foto"]:
        return [x for x in self.foto if x.tahap == "sesudah"]


class Lembur(Base):
    """Penugasan lembur. Draf admin juga di sini, dengan status 'Draf'."""

    __tablename__ = "lembur"
    __table_args__ = (
        CheckConstraint(_pilihan("status", STATUS_LEMBUR), name="ck_lembur_status"),
        CheckConstraint(_pilihan("jabatan", JABATAN), name="ck_lembur_jabatan"),
        # Hanya draf yang boleh belum punya petugas.
        CheckConstraint("status = 'Draf' OR petugas_id IS NOT NULL", name="ck_lembur_petugas_wajib"),
        Index("ix_lembur_status_tanggal", "status", "tanggal"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    petugas_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    jabatan: Mapped[str] = mapped_column(String(20))
    dibuat_oleh: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    tanggal: Mapped[date] = mapped_column(Date)
    jam_mulai: Mapped[time] = mapped_column(Time)
    jam_selesai: Mapped[time] = mapped_column(Time)
    keterangan: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(20), default="Draf")
    alasan_tolak: Mapped[str | None] = mapped_column(Text)
    # Tarif per jam yang dikunci saat penugasan dikirim; draf masih None.
    tarif_per_jam: Mapped[int | None] = mapped_column(Integer)
    # Jam yang benar-benar dikerjakan, dikoreksi admin; None = sesuai rencana.
    jam_mulai_aktual: Mapped[time | None] = mapped_column(Time)
    jam_selesai_aktual: Mapped[time | None] = mapped_column(Time)
    # None = belum dibayar.
    dibayar_pada: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    dibayar_oleh: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    dikirim_pada: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    dijawab_pada: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    dibuat_pada: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    petugas: Mapped[User | None] = relationship(foreign_keys=[petugas_id])
    pembuat: Mapped[User | None] = relationship(foreign_keys=[dibuat_oleh])
    pembayar: Mapped[User | None] = relationship(foreign_keys=[dibayar_oleh])

    @property
    def mulai_dihitung(self) -> time:
        """Jam yang dipakai menghitung upah: aktual bila sudah dikoreksi."""
        return self.jam_mulai_aktual or self.jam_mulai

    @property
    def selesai_dihitung(self) -> time:
        return self.jam_selesai_aktual or self.jam_selesai


class Foto(Base):
    """Satu berkas foto bukti. Berkasnya di folder, di sini hanya alamatnya."""

    __tablename__ = "foto"
    __table_args__ = (
        # Satu foto milik tepat satu: logbook ATAU kendala.
        CheckConstraint(
            "(logbook_id IS NOT NULL AND kendala_id IS NULL) OR (logbook_id IS NULL AND kendala_id IS NOT NULL)",
            name="ck_foto_satu_pemilik",
        ),
        CheckConstraint(_pilihan("tahap", TAHAP_FOTO), name="ck_foto_tahap"),
        # Foto sesudah = bukti kendala selesai diperbaiki, jadi hanya ada di kendala.
        CheckConstraint("tahap = 'sebelum' OR kendala_id IS NOT NULL", name="ck_foto_sesudah_kendala"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    logbook_id: Mapped[int | None] = mapped_column(ForeignKey("logbook.id", ondelete="CASCADE"), index=True)
    kendala_id: Mapped[int | None] = mapped_column(ForeignKey("kendala.id", ondelete="CASCADE"), index=True)
    tahap: Mapped[str] = mapped_column(String(10), default="sebelum", server_default="sebelum")
    lokasi_file: Mapped[str] = mapped_column(String(300))
    ukuran_byte: Mapped[int] = mapped_column(Integer, default=0)
    diambil_pada: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    latitude: Mapped[float | None] = mapped_column(Float)
    longitude: Mapped[float | None] = mapped_column(Float)

    logbook: Mapped[Logbook | None] = relationship(back_populates="foto")
    kendala: Mapped[Kendala | None] = relationship(back_populates="foto")


class PengaturanAplikasi(Base):
    """Nilai yang bisa diubah admin dari aplikasi, mis. tarif_lembur_per_jam."""

    __tablename__ = "pengaturan"

    kunci: Mapped[str] = mapped_column(String(60), primary_key=True)
    nilai: Mapped[str] = mapped_column(String(200))
    diubah_oleh: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    diubah_pada: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    pengubah: Mapped[User | None] = relationship()


class LogAudit(Base):
    """Jejak tindakan penting: buat/hapus akun, hapus foto, ubah status."""

    __tablename__ = "log_audit"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    aksi: Mapped[str] = mapped_column(String(60))
    detail: Mapped[str] = mapped_column(Text, default="")
    waktu: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)


class ChecklistItem(Base):
    """
    Daftar pemeriksaan wajib per jabatan (data master).

    Isinya bisa diubah super admin lewat halaman Kelola Checklist, jadi kalau
    SOP direvisi tidak perlu mengubah kode. Item lama tidak dihapus tetapi
    di-nonaktifkan (aktif = False) supaya checklist bulan lalu tetap utuh.
    """

    __tablename__ = "checklist_item"
    __table_args__ = (
        CheckConstraint(_pilihan("jabatan", JABATAN), name="ck_item_jabatan"),
        CheckConstraint(_pilihan("mode", MODE_CHECKLIST), name="ck_item_mode"),
        Index("ix_item_jabatan_urutan", "jabatan", "urutan"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    jabatan: Mapped[str] = mapped_column(String(20))
    urutan: Mapped[int] = mapped_column(Integer, default=1)
    teks: Mapped[str] = mapped_column(Text)
    mode: Mapped[str] = mapped_column(String(10), default="harian")
    aktif: Mapped[bool] = mapped_column(Boolean, default=True)
    dibuat_pada: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ChecklistHarian(Base):
    """Satu lembar checklist milik satu petugas pada satu tanggal."""

    __tablename__ = "checklist_harian"
    __table_args__ = (
        CheckConstraint(_pilihan("status", STATUS_CHECKLIST), name="ck_checklist_status"),
        # Satu petugas hanya punya satu lembar per hari.
        UniqueConstraint("petugas_id", "tanggal", name="uq_checklist_petugas_tanggal"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    petugas_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    tanggal: Mapped[date] = mapped_column(Date, index=True)
    status: Mapped[str] = mapped_column(String(20), default="Draf")
    diisi_oleh: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    dikirim_pada: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    dibuat_pada: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    petugas: Mapped[User] = relationship(foreign_keys=[petugas_id])
    jawaban: Mapped[list["ChecklistJawaban"]] = relationship(
        back_populates="lembar", cascade="all, delete-orphan", order_by="ChecklistJawaban.id"
    )


class ChecklistJawaban(Base):
    """Jawaban satu item pada satu lembar. Item mode 'sesi' punya 3 baris: Pagi, Siang, Sore."""

    __tablename__ = "checklist_jawaban"
    __table_args__ = (
        CheckConstraint(_pilihan("sesi", SESI), name="ck_jawaban_sesi"),
        CheckConstraint(_pilihan("status", STATUS_JAWABAN), name="ck_jawaban_status"),
        UniqueConstraint("lembar_id", "item_id", "sesi", name="uq_jawaban_item_sesi"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    lembar_id: Mapped[int] = mapped_column(ForeignKey("checklist_harian.id", ondelete="CASCADE"), index=True)
    # RESTRICT: item yang sudah pernah dijawab tidak boleh terhapus, cukup dinonaktifkan.
    item_id: Mapped[int] = mapped_column(ForeignKey("checklist_item.id", ondelete="RESTRICT"))
    sesi: Mapped[str] = mapped_column(String(10), default="Harian")
    status: Mapped[str] = mapped_column(String(10))
    catatan: Mapped[str] = mapped_column(Text, default="")

    lembar: Mapped[ChecklistHarian] = relationship(back_populates="jawaban")
    item: Mapped[ChecklistItem] = relationship()


class LanggananPush(Base):
    """Satu browser/perangkat yang mengizinkan notifikasi push untuk seorang pengguna."""

    __tablename__ = "langganan_push"
    __table_args__ = (UniqueConstraint("endpoint", name="uq_langganan_push_endpoint"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    # Alamat dari layanan push browser (Google/Mozilla/Apple); unik per browser.
    endpoint: Mapped[str] = mapped_column(Text)
    p256dh: Mapped[str] = mapped_column(String(200))
    auth: Mapped[str] = mapped_column(String(100))
    perangkat: Mapped[str] = mapped_column(String(200), default="")
    dibuat_pada: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    terakhir_dipakai: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


def _tukar_berjalan() -> str:
    return _pilihan("status", TUKAR_BERJALAN)


class Shift(Base):
    """
    Jenis shift, mis. Pagi 07.00–15.00. Disusun admin per jabatan.

    jam_selesai < jam_mulai = lintas hari; jam_selesai = jam_mulai = 24 jam.
    'Libur' adalah shift sistem (sistem = True): tanpa jam, berlaku untuk semua
    jabatan, dan tidak bisa diubah. Shift yang sudah dipakai jadwal tidak bisa
    dihapus, hanya dinonaktifkan.
    """

    __tablename__ = "shift"
    __table_args__ = (
        CheckConstraint(_pilihan("warna", WARNA_SHIFT), name="ck_shift_warna"),
        CheckConstraint("sistem OR (jam_mulai IS NOT NULL AND jam_selesai IS NOT NULL)", name="ck_shift_jam"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    nama: Mapped[str] = mapped_column(String(40))
    # Tampil di kotak jadwal, 1–2 huruf.
    kode: Mapped[str] = mapped_column(String(2))
    jam_mulai: Mapped[time | None] = mapped_column(Time)
    jam_selesai: Mapped[time | None] = mapped_column(Time)
    warna: Mapped[str] = mapped_column(String(20))
    aktif: Mapped[bool] = mapped_column(Boolean, default=True)
    sistem: Mapped[bool] = mapped_column(Boolean, default=False)
    dibuat_oleh: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    dibuat_pada: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    daftar_jabatan: Mapped[list["ShiftJabatan"]] = relationship(
        cascade="all, delete-orphan", order_by="ShiftJabatan.jabatan"
    )

    @property
    def jabatan(self) -> list[str]:
        return [j.jabatan for j in self.daftar_jabatan]

    def cocok(self, jabatan: str | None) -> bool:
        """Libur cocok untuk semua jabatan."""
        return self.sistem or jabatan in self.jabatan


class ShiftJabatan(Base):
    """Jabatan yang boleh memakai sebuah shift. Libur tidak punya baris di sini."""

    __tablename__ = "shift_jabatan"
    __table_args__ = (CheckConstraint(_pilihan("jabatan", JABATAN), name="ck_shift_jabatan"),)

    shift_id: Mapped[int] = mapped_column(ForeignKey("shift.id", ondelete="CASCADE"), primary_key=True)
    jabatan: Mapped[str] = mapped_column(String(20), primary_key=True)


class TukarShift(Base):
    """
    Permintaan tukar shift antara dua petugas satu jabatan.

    Alur: Menunggu Rekan → Menunggu Admin → Disetujui / Ditolak, atau
    Dibatalkan (oleh pemohon, atau otomatis saat admin mengubah jadwal terkait).
    Saat disetujui, hanya dua kotak yang berubah: kotak pemohon di
    tanggal_pemohon diisi shift_rekan, dan kotak rekan di tanggal_rekan diisi
    shift_pemohon. Kotak lain tidak disentuh. shift_*_id adalah salinan saat
    diajukan, supaya riwayatnya tetap utuh walau jadwalnya berubah.
    """

    __tablename__ = "tukar_shift"
    __table_args__ = (
        CheckConstraint(_pilihan("status", STATUS_TUKAR), name="ck_tukar_status"),
        CheckConstraint("pemohon_id <> rekan_id", name="ck_tukar_beda_orang"),
        # Satu kotak hanya boleh ikut satu permintaan yang masih berjalan.
        # Persilangan lain (mis. kotak pemohon dipakai sebagai kotak rekan) dicek di router.
        Index(
            "uq_tukar_pemohon_berjalan", "pemohon_id", "tanggal_pemohon",
            unique=True, postgresql_where=_tukar_berjalan(),
        ),
        Index(
            "uq_tukar_rekan_berjalan", "rekan_id", "tanggal_rekan",
            unique=True, postgresql_where=_tukar_berjalan(),
        ),
        Index("ix_tukar_status", "status"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    pemohon_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    tanggal_pemohon: Mapped[date] = mapped_column(Date)
    shift_pemohon_id: Mapped[int] = mapped_column(ForeignKey("shift.id", ondelete="RESTRICT"))
    rekan_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    tanggal_rekan: Mapped[date] = mapped_column(Date)
    shift_rekan_id: Mapped[int] = mapped_column(ForeignKey("shift.id", ondelete="RESTRICT"))
    alasan: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="Menunggu Rekan")
    dijawab_rekan_pada: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    # Diisi saat admin menyetujui/menolak; kosong + Ditolak = ditolak rekan.
    diputus_oleh: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    diputus_pada: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    alasan_tolak: Mapped[str | None] = mapped_column(Text)
    # Mengapa dibatalkan, mis. 'Jadwal diubah admin'.
    catatan_batal: Mapped[str | None] = mapped_column(String(200))
    dibuat_pada: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    # Waktu perubahan status terakhir — untuk urutan dan notifikasi.
    diperbarui_pada: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    pemohon: Mapped[User] = relationship(foreign_keys=[pemohon_id])
    rekan: Mapped[User] = relationship(foreign_keys=[rekan_id])
    shift_pemohon: Mapped[Shift] = relationship(foreign_keys=[shift_pemohon_id])
    shift_rekan: Mapped[Shift] = relationship(foreign_keys=[shift_rekan_id])
    pemutus: Mapped[User | None] = relationship(foreign_keys=[diputus_oleh])

    @property
    def sel(self) -> set[tuple[int, date]]:
        """Semua kotak (petugas, tanggal) yang berubah bila permintaan ini disetujui."""
        return {(self.pemohon_id, self.tanggal_pemohon), (self.rekan_id, self.tanggal_rekan)}


class JadwalShift(Base):
    """Satu kotak jadwal: shift seorang petugas pada satu tanggal (= tanggal shift dimulai)."""

    __tablename__ = "jadwal_shift"
    __table_args__ = (
        UniqueConstraint("user_id", "tanggal", name="uq_jadwal_petugas_tanggal"),
        Index("ix_jadwal_tanggal", "tanggal"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    tanggal: Mapped[date] = mapped_column(Date)
    shift_id: Mapped[int] = mapped_column(ForeignKey("shift.id", ondelete="RESTRICT"), index=True)
    # Terisi bila kotak ini hasil tukar shift (tanda ⇄); dikosongkan lagi saat admin mengubahnya.
    dari_tukar_id: Mapped[int | None] = mapped_column(ForeignKey("tukar_shift.id", ondelete="SET NULL"))
    diatur_oleh: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    diubah_pada: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    shift: Mapped[Shift] = relationship()
    petugas: Mapped[User] = relationship(foreign_keys=[user_id])
    pengatur: Mapped[User | None] = relationship(foreign_keys=[diatur_oleh])
