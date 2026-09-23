"""
Penugasan lembur.

Alur: admin membuat Draf → mengirim (Menunggu) → petugas menerima atau
menolak dengan alasan (Diterima/Ditolak). Diterima + tanggal lewat = Selesai.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app import format as f
from app import tampil
from app.audit import catat
from app.database import ambil_db
from app.deps import PENGAWAS, butuh_peran, user_saat_ini
from app.models import Lembur, User
from app.schemas import DrafKeluar, DrafMasuk, LemburKeluar, TolakLembur

router = APIRouter(prefix="/api/lembur", tags=["Lembur"])

_MUAT = (selectinload(Lembur.petugas), selectinload(Lembur.pembuat))


def _ambil(db: Session, lembur_id: str) -> Lembur:
    if not lembur_id.isdigit():
        raise HTTPException(404, "Penugasan tidak ditemukan.")
    l = db.get(Lembur, int(lembur_id), options=_MUAT)
    if not l:
        raise HTTPException(404, "Penugasan tidak ditemukan.")
    return l


def _isi_draf(db: Session, l: Lembur, isi: DrafMasuk) -> None:
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
def daftar(db: Session = Depends(ambil_db), user: User = Depends(user_saat_ini)):
    """Admin melihat semua; petugas hanya penugasan miliknya."""
    q = select(Lembur).options(*_MUAT).where(Lembur.status != "Draf")
    if user.peran == "user":
        q = q.where(Lembur.petugas_id == user.id)
    # Yang baru dijawab / baru dikirim tampil paling depan.
    q = q.order_by(func.coalesce(Lembur.dijawab_pada, Lembur.dikirim_pada).desc().nulls_last())
    return [tampil.lembur(l) for l in db.scalars(q)]


@router.post("/{lembur_id}/terima", response_model=LemburKeluar)
def terima(lembur_id: str, db: Session = Depends(ambil_db), user: User = Depends(butuh_peran("user"))):
    l = _ambil(db, lembur_id)
    if l.petugas_id != user.id:
        raise HTTPException(403, "Penugasan ini bukan untuk Anda.")
    if l.status != "Menunggu":
        raise HTTPException(409, "Penugasan ini sudah dijawab.")
    l.status = "Diterima"
    l.dijawab_pada = f.sekarang()
    db.commit()
    return tampil.lembur(l)


@router.post("/{lembur_id}/tolak", response_model=LemburKeluar)
def tolak(
    lembur_id: str, isi: TolakLembur, db: Session = Depends(ambil_db), user: User = Depends(butuh_peran("user"))
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
def kirim_draf(lembur_id: str, db: Session = Depends(ambil_db), admin: User = Depends(butuh_peran(*PENGAWAS))):
    l = _ambil(db, lembur_id)
    if l.status != "Draf":
        raise HTTPException(409, "Draf ini sudah dikirim.")
    # Syarat sama dengan kekuranganDraf() di frontend.
    kurang = []
    if l.petugas_id is None:
        kurang.append("nama")
    if len(l.keterangan) < 20:
        kurang.append("keterangan minimal 20 karakter")
    if kurang:
        raise HTTPException(422, "Draf belum lengkap: " + ", ".join(kurang))
    l.status = "Menunggu"
    l.dikirim_pada = f.sekarang()
    catat(db, admin, "kirim_lembur", f"Lembur #{l.id} untuk {l.petugas.nama} tanggal {l.tanggal}")
    db.commit()
    return tampil.lembur(l)
