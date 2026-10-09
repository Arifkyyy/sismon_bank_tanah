"""
Penugasan lembur.

Alur: admin membuat Draf → mengirim (Menunggu) → petugas menerima atau
menolak dengan alasan (Diterima/Ditolak). Diterima + tanggal lewat = Selesai.
"""
from datetime import date, time

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app import format as f
from app import push, tampil
from app.audit import catat
from app.config import pengaturan
from app.database import ambil_db
from app.deps import PENGAWAS, butuh_peran, user_saat_ini
from app.models import Lembur, User
from app.routers.pengaturan import tarif_lembur
from app.schemas import DrafKeluar, DrafMasuk, Jabatan, JamAktualMasuk, LemburKeluar, TolakLembur

router = APIRouter(prefix="/api/lembur", tags=["Lembur"])

_MUAT = (selectinload(Lembur.petugas), selectinload(Lembur.pembuat), selectinload(Lembur.pembayar))


def _ambil(db: Session, lembur_id: str) -> Lembur:
    if not lembur_id.isdigit():
        raise HTTPException(404, "Penugasan tidak ditemukan.")
    l = db.get(Lembur, int(lembur_id), options=_MUAT)
    if not l:
        raise HTTPException(404, "Penugasan tidak ditemukan.")
    return l


def _periksa_lama(mulai: time, selesai: time) -> None:
    """Jam selesai sebelum jam mulai dianggap lewat tengah malam, jadi dibatasi."""
    # Jam sama akan terbaca 24 jam; pesan "paling lama 12 jam" membingungkan, jadi disebut langsung.
    if mulai == selesai:
        raise HTTPException(422, "Jam selesai tidak boleh sama dengan jam mulai.")
    if f.menit_lembur(mulai, selesai) > pengaturan.maks_jam_lembur * 60:
        raise HTTPException(
            422, f"Lembur paling lama {pengaturan.maks_jam_lembur} jam. Periksa jam mulai dan jam selesai."
        )


def _periksa_tanggal(tanggal: date) -> None:
    """Penugasan harus untuk hari ini atau sesudahnya; yang sudah lewat tidak bisa diterima petugas."""
    if tanggal < f.hari_ini():
        raise HTTPException(422, "Tanggal lembur sudah lewat. Pilih hari ini atau tanggal sesudahnya.")


def _isi_draf(db: Session, l: Lembur, isi: DrafMasuk) -> None:
    _periksa_tanggal(isi.tanggal)
    _periksa_lama(isi.mulai, isi.selesai)
    if isi.petugas_id is not None:
        p = db.get(User, isi.petugas_id)
        if not p or p.peran != "user":
            raise HTTPException(422, "Petugas tidak ditemukan.")
        if p.jabatan != isi.jabatan:
            raise HTTPException(422, f"{p.nama} terdaftar sebagai {p.jabatan}, bukan {isi.jabatan}.")
    l.petugas_id = isi.petugas_id
    l.jabatan = isi.jabatan
    l.tanggal = isi.tanggal
    l.jam_mulai = isi.mulai
    l.jam_selesai = isi.selesai
    l.keterangan = isi.keterangan.strip()


# ---------------------------------------------------------------- Penugasan terkirim

@router.get("", response_model=list[LemburKeluar])
def daftar(
    dari: date | None = None,
    sampai: date | None = None,
    jabatan: Jabatan | None = None,
    db: Session = Depends(ambil_db),
    user: User = Depends(user_saat_ini),
):
    """Admin melihat semua; petugas hanya penugasan miliknya. `dari`/`sampai`/`jabatan` menyaring."""
    q = select(Lembur).options(*_MUAT).where(Lembur.status != "Draf")
    if user.peran == "user":
        q = q.where(Lembur.petugas_id == user.id)
    if dari:
        q = q.where(Lembur.tanggal >= dari)
    if sampai:
        q = q.where(Lembur.tanggal <= sampai)
    if jabatan:
        q = q.where(Lembur.jabatan == jabatan)
    # Yang baru dijawab / baru dikirim tampil paling depan.
    q = q.order_by(func.coalesce(Lembur.dijawab_pada, Lembur.dikirim_pada).desc().nulls_last())
    return [tampil.lembur(l) for l in db.scalars(q)]


@router.post("/{lembur_id}/terima", response_model=LemburKeluar)
def terima(
    lembur_id: str, tugas: BackgroundTasks, db: Session = Depends(ambil_db), user: User = Depends(butuh_peran("user"))
):
    l = _ambil(db, lembur_id)
    if l.petugas_id != user.id:
        raise HTTPException(403, "Penugasan ini bukan untuk Anda.")
    if l.status != "Menunggu":
        raise HTTPException(409, "Penugasan ini sudah dijawab.")
    if l.tanggal < f.hari_ini():
        raise HTTPException(409, "Tanggal lembur ini sudah lewat, jadi tidak bisa diterima lagi. Tolak penugasan ini.")
    l.status = "Diterima"
    l.dijawab_pada = f.sekarang()
    db.commit()
    tugas.add_task(push.lembur_dijawab, user.nama, True, l.id)
    return tampil.lembur(l)


@router.post("/{lembur_id}/tolak", response_model=LemburKeluar)
def tolak(
    lembur_id: str,
    isi: TolakLembur,
    tugas: BackgroundTasks,
    db: Session = Depends(ambil_db),
    user: User = Depends(butuh_peran("user")),
):
    l = _ambil(db, lembur_id)
    if l.petugas_id != user.id:
        raise HTTPException(403, "Penugasan ini bukan untuk Anda.")
    if l.status != "Menunggu":
        raise HTTPException(409, "Penugasan ini sudah dijawab.")
    l.status = "Ditolak"
    l.alasan_tolak = isi.alasan.strip()
    l.dijawab_pada = f.sekarang()
    db.commit()
    tugas.add_task(push.lembur_dijawab, user.nama, False, l.id)
    return tampil.lembur(l)


# ---------------------------------------------------------------- Draf (khusus admin)

@router.get("/draf", response_model=list[DrafKeluar])
def daftar_draf(db: Session = Depends(ambil_db), _: User = Depends(butuh_peran(*PENGAWAS))):
    q = select(Lembur).options(*_MUAT).where(Lembur.status == "Draf").order_by(Lembur.id)
    return [tampil.draf(l) for l in db.scalars(q)]


@router.post("/draf", response_model=DrafKeluar, status_code=201)
def buat_draf(isi: DrafMasuk, db: Session = Depends(ambil_db), admin: User = Depends(butuh_peran(*PENGAWAS))):
    l = Lembur(status="Draf", dibuat_oleh=admin.id)
    _isi_draf(db, l, isi)
    db.add(l)
    db.commit()
    return tampil.draf(_ambil(db, str(l.id)))


@router.put("/draf/{lembur_id}", response_model=DrafKeluar)
def ubah_draf(
    lembur_id: str, isi: DrafMasuk, db: Session = Depends(ambil_db), _: User = Depends(butuh_peran(*PENGAWAS))
):
    l = _ambil(db, lembur_id)
    if l.status != "Draf":
        raise HTTPException(409, "Penugasan yang sudah dikirim tidak bisa diubah.")
    _isi_draf(db, l, isi)
    db.commit()
    db.refresh(l)
    return tampil.draf(l)


@router.delete("/draf/{lembur_id}", status_code=204)
def hapus_draf(lembur_id: str, db: Session = Depends(ambil_db), _: User = Depends(butuh_peran(*PENGAWAS))):
    l = _ambil(db, lembur_id)
    if l.status != "Draf":
        raise HTTPException(409, "Hanya draf yang bisa dihapus.")
    db.delete(l)
    db.commit()


@router.post("/draf/{lembur_id}/kirim", response_model=LemburKeluar)
def kirim_draf(
    lembur_id: str,
    tugas: BackgroundTasks,
    db: Session = Depends(ambil_db),
    admin: User = Depends(butuh_peran(*PENGAWAS)),
):
    l = _ambil(db, lembur_id)
    if l.status != "Draf":
        raise HTTPException(409, "Draf ini sudah dikirim.")
    # Syarat sama dengan kekuranganDraf() di frontend.
    kurang = []
    if l.petugas_id is None:
        kurang.append("nama")
    if len(l.keterangan) < 1:
        kurang.append("keterangan")
    if kurang:
        raise HTTPException(422, "Draf belum lengkap: " + ", ".join(kurang))
    # Draf lama bisa dibuat sebelum batas lama lembur berlaku, atau tanggalnya sudah lewat.
    _periksa_lama(l.jam_mulai, l.jam_selesai)
    _periksa_tanggal(l.tanggal)
    l.status = "Menunggu"
    l.dikirim_pada = f.sekarang()
    # Dikunci di sini supaya perubahan tarif nanti tidak mengubah penugasan ini.
    l.tarif_per_jam = tarif_lembur(db)
    catat(db, admin, "kirim_lembur", f"Lembur #{l.id} untuk {l.petugas.nama} tanggal {l.tanggal}")
    db.commit()
    tugas.add_task(push.lembur_dikirim, l.petugas_id, admin.nama, l.id)
    return tampil.lembur(l)


# ---------------------------------------------------------------- Setelah lembur (khusus admin)

def _ambil_diterima(db: Session, lembur_id: str) -> Lembur:
    l = _ambil(db, lembur_id)
    if l.status != "Diterima":
        raise HTTPException(409, "Hanya penugasan yang diterima petugas yang bisa diproses.")
    return l


@router.put("/{lembur_id}/jam-aktual", response_model=LemburKeluar)
def ubah_jam_aktual(
    lembur_id: str, isi: JamAktualMasuk, db: Session = Depends(ambil_db), admin: User = Depends(butuh_peran(*PENGAWAS))
):
    """Koreksi jam yang benar-benar dikerjakan; upah ikut dihitung dari jam ini."""
    l = _ambil_diterima(db, lembur_id)
    if l.dibayar_pada:
        raise HTTPException(409, "Lembur ini sudah ditandai dibayar. Batalkan tanda bayar dulu.")
    if (isi.mulai is None) != (isi.selesai is None):
        raise HTTPException(422, "Isi jam mulai dan jam selesai, atau kosongkan keduanya.")
    if isi.mulai is not None and isi.selesai is not None:
        _periksa_lama(isi.mulai, isi.selesai)
        # Sama dengan rencana = tidak ada koreksi.
        if (isi.mulai, isi.selesai) == (l.jam_mulai, l.jam_selesai):
            isi = JamAktualMasuk()
    l.jam_mulai_aktual = isi.mulai
    l.jam_selesai_aktual = isi.selesai
    ket = f"{f.jam_teks(isi.mulai)} – {f.jam_teks(isi.selesai)}" if isi.mulai and isi.selesai else "kembali ke rencana"
    catat(db, admin, "jam_aktual_lembur", f"Lembur #{l.id} ({l.petugas.nama}, {l.tanggal}): {ket}")
    db.commit()
    return tampil.lembur(_ambil(db, lembur_id))


@router.post("/{lembur_id}/bayar", response_model=LemburKeluar)
def tandai_dibayar(lembur_id: str, db: Session = Depends(ambil_db), admin: User = Depends(butuh_peran(*PENGAWAS))):
    l = _ambil_diterima(db, lembur_id)
    if l.tanggal >= f.hari_ini():
        raise HTTPException(409, "Lembur baru bisa ditandai dibayar setelah tanggalnya lewat.")
    if l.dibayar_pada:
        raise HTTPException(409, "Lembur ini sudah ditandai dibayar.")
    l.dibayar_pada = f.sekarang()
    l.dibayar_oleh = admin.id
    catat(db, admin, "bayar_lembur", f"Lembur #{l.id} ({l.petugas.nama}, {l.tanggal}) ditandai dibayar")
    db.commit()
    return tampil.lembur(_ambil(db, lembur_id))


@router.delete("/{lembur_id}/bayar", response_model=LemburKeluar)
def batal_dibayar(lembur_id: str, db: Session = Depends(ambil_db), admin: User = Depends(butuh_peran(*PENGAWAS))):
    l = _ambil_diterima(db, lembur_id)
    if not l.dibayar_pada:
        raise HTTPException(409, "Lembur ini belum ditandai dibayar.")
    l.dibayar_pada = None
    l.dibayar_oleh = None
    catat(db, admin, "batal_bayar_lembur", f"Tanda bayar lembur #{l.id} ({l.petugas.nama}, {l.tanggal}) dibatalkan")
    db.commit()
    return tampil.lembur(_ambil(db, lembur_id))
