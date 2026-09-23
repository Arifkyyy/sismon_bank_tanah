"""
Struktur tabel database.

Enam tabel: users, logbook, kendala, lembur, foto, log_audit.
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
# 'Selesai' pada lembur tidak disimpan: dihitung dari 'Diterima' + tanggal sudah lewat.
STATUS_LEMBUR = ("Draf", "Menunggu", "Diterima", "Ditolak")
# 'harian' = satu status per hari (OB/OG). 'sesi' = dicek Pagi, Siang, Sore (Cleaning Service).
MODE_CHECKLIST = ("harian", "sesi")
SESI = ("Harian", "Pagi", "Siang", "Sore")
STATUS_CHECKLIST = ("Draf", "Dikirim")
STATUS_JAWABAN = ("Ya", "Tidak")


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
    ditangani_oleh: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    diperbarui_pada: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    dibuat_pada: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    petugas: Mapped[User] = relationship(foreign_keys=[petugas_id])
    foto: Mapped[list["Foto"]] = relationship(
        back_populates="kendala", cascade="all, delete-orphan", order_by="Foto.id"
    )


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
    dikirim_pada: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    dijawab_pada: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    dibuat_pada: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    petugas: Mapped[User | None] = relationship(foreign_keys=[petugas_id])
    pembuat: Mapped[User | None] = relationship(foreign_keys=[dibuat_oleh])


class Foto(Base):
    """Satu berkas foto bukti. Berkasnya di folder, di sini hanya alamatnya."""

    __tablename__ = "foto"
    __table_args__ = (
        # Satu foto milik tepat satu: logbook ATAU kendala.
        CheckConstraint(
            "(logbook_id IS NOT NULL AND kendala_id IS NULL) OR (logbook_id IS NULL AND kendala_id IS NOT NULL)",
            name="ck_foto_satu_pemilik",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    logbook_id: Mapped[int | None] = mapped_column(ForeignKey("logbook.id", ondelete="CASCADE"), index=True)
    kendala_id: Mapped[int | None] = mapped_column(ForeignKey("kendala.id", ondelete="CASCADE"), index=True)
    lokasi_file: Mapped[str] = mapped_column(String(300))
    ukuran_byte: Mapped[int] = mapped_column(Integer, default=0)
    diambil_pada: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    latitude: Mapped[float | None] = mapped_column(Float)
    longitude: Mapped[float | None] = mapped_column(Float)

    logbook: Mapped[Logbook | None] = relationship(back_populates="foto")
    kendala: Mapped[Kendala | None] = relationship(back_populates="foto")


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
