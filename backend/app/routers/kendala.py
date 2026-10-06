"""
Laporan kendala: dilaporkan petugas, ditangani petugas penangan, dipantau admin.

Alur status: Baru → Diproses → Selesai. Saat dibuat, penangan = pelapor; admin
bisa mengalihkannya ke petugas lain. Petugas hanya boleh mengubah kendala yang
penangannya dia sendiri. Riwayat setiap kendala disusun dari log_audit, dengan
detail berformat 'Laporan #<id>: <kejadian>' (+ baris kedua untuk catatan).
"""
from datetime import date
from typing import Literal

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from app import format as f
from app import kejanggalan, push, tampil
from app.audit import catat
from app.catatan import periksa_isi, periksa_jumlah_foto, periksa_petugas, saring, simpan_foto
from app.database import ambil_db
from app.deps import PENGAWAS, butuh_peran, user_saat_ini
from app.foto_util import hapus_berkas
from app.models import Kendala, LogAudit, User
from app.schemas import (
    BukaLagiKendala, CatatanMasuk, DetailKendala, Jabatan, KendalaKeluar, RiwayatKendala, SelesaiKendala,
    StatusKendala, TugaskanKendala, UbahStatusKendala,
)

router = APIRouter(prefix="/api/kendala", tags=["Laporan kendala"])

_MUAT = (
    selectinload(Kendala.petugas),
    selectinload(Kendala.penangan),
    selectinload(Kendala.penyelesai),
    selectinload(Kendala.foto),
)

# aksi log_audit → jenis kejadian di riwayat
_JENIS_RIWAYAT = {
    "kendala_dilaporkan": "dilaporkan",
    "kendala_ditugaskan": "ditugaskan",
    "kendala_mulai": "mulai",
    "kendala_selesai": "selesai",
    "kendala_dibuka_lagi": "dibuka_lagi",
    "ubah_status_kendala": "status",
}


def _catat(db: Session, user: User, aksi: str, k: Kendala, kejadian: str, catatan: str | None = None) -> None:
    detail = f"Laporan #{k.id}: {kejadian}"
    if catatan:
        detail += f"\n{catatan}"
    catat(db, user, aksi, detail)


def _ambil(db: Session, kendala_id: int, user: User) -> Kendala:
    """Kendala yang boleh dilihat user ini; petugas hanya miliknya atau yang ditugaskan kepadanya."""
    k = db.scalar(select(Kendala).options(*_MUAT).where(Kendala.id == kendala_id))
    if not k:
        raise HTTPException(404, "Laporan tidak ditemukan.")
    if user.peran == "user" and user.id not in (k.petugas_id, k.dibuat_oleh, k.penangan_id):
        raise HTTPException(403, "Anda tidak punya akses ke laporan ini.")
    return k


def _wajib_penangan(k: Kendala, user: User) -> None:
    """Admin boleh menindak kendala siapa pun; petugas hanya yang ditugaskan kepadanya."""
    if user.peran == "user" and k.penangan_id != user.id:
        raise HTTPException(403, "Kendala ini tidak ditugaskan kepada Anda.")


def _riwayat(db: Session, k: Kendala) -> list[RiwayatKendala]:
    baris = db.execute(
        select(LogAudit, User.nama)
        .outerjoin(User, LogAudit.user_id == User.id)
        .where(LogAudit.aksi.in_(_JENIS_RIWAYAT), LogAudit.detail.like(f"Laporan #{k.id}:%"))
        .order_by(LogAudit.waktu, LogAudit.id)
    ).all()
    hasil: list[RiwayatKendala] = []
    for log, nama in baris:
        isi = log.detail.split(":", 1)[1].strip()
        kejadian, _, catatan = isi.partition("\n")
        jenis = _JENIS_RIWAYAT[log.aksi]
        hasil.append(
            RiwayatKendala(
                waktu=f.cap_waktu(log.waktu),
                jenis=jenis,
                kejadian=f"Status diubah: {kejadian}" if jenis == "status" else kejadian,
                oleh=nama,
                catatan=catatan.strip() or None,
            )
        )
    # Kendala dari sebelum riwayat dicatat belum punya kejadian 'dilaporkan'.
    if not any(r.jenis == "dilaporkan" for r in hasil):
        pengirim = db.get(User, k.dibuat_oleh) if k.dibuat_oleh else None
        hasil.insert(
            0,
            RiwayatKendala(
                waktu=f.cap_waktu(k.dibuat_pada),
                jenis="dilaporkan",
                kejadian="Dilaporkan",
                oleh=(pengirim or k.petugas).nama,
            ),
        )
    return hasil


@router.get("", response_model=list[KendalaKeluar])
def daftar(
    status: StatusKendala | None = None,
    tanggal: date | None = None,
    dari: date | None = None,
    sampai: date | None = None,
    jabatan: Jabatan | None = None,
    petugas_id: int | None = None,
    penangan_id: int | None = None,
    terbuka: bool | None = Query(None, description="true = belum Selesai"),
    milik: Literal["dilaporkan", "ditangani"] | None = Query(
        None, description="relatif terhadap akun yang sedang masuk"
    ),
    cari: str | None = Query(None, max_length=120),
    berubah_sejak: date | None = Query(
        None, description="hanya yang diperbarui sejak tanggal ini (untuk notifikasi); urut dari perubahan terbaru"
    ),
    batas: int = Query(200, ge=1, le=1000),
    db: Session = Depends(ambil_db),
    user: User = Depends(user_saat_ini),
):
    q = select(Kendala).options(*_MUAT)
    if berubah_sejak:
        q = q.where(Kendala.diperbarui_pada >= f.awal_hari(berubah_sejak))
    q = saring(q, Kendala, user, tanggal, dari, sampai, jabatan, petugas_id, cari)
    if status:
        q = q.where(Kendala.status == status)
    if terbuka is not None:
        q = q.where((Kendala.status != "Selesai") if terbuka else (Kendala.status == "Selesai"))
    if penangan_id:
        q = q.where(Kendala.penangan_id == penangan_id)
    if milik == "dilaporkan":
        q = q.where(or_(Kendala.petugas_id == user.id, Kendala.dibuat_oleh == user.id))
    elif milik == "ditangani":
        q = q.where(Kendala.penangan_id == user.id)
    urut = Kendala.diperbarui_pada.desc() if berubah_sejak else Kendala.waktu.desc()
    baris = list(db.scalars(q.order_by(urut).limit(batas)))
    hasil = [tampil.kendala(k) for k in baris]
    if user.peran in PENGAWAS:
        tanda = kejanggalan.untuk_kendala(db, baris)
        for h in hasil:
            h.tanda = tanda.get(h.id, [])
    return hasil


@router.get("/{kendala_id}", response_model=DetailKendala)
def detail(kendala_id: int, db: Session = Depends(ambil_db), user: User = Depends(user_saat_ini)):
    k = _ambil(db, kendala_id, user)
    return DetailKendala(**tampil.kendala(k).model_dump(), riwayat=_riwayat(db, k))


@router.post("", response_model=KendalaKeluar, status_code=201)
def kirim(
    isi: CatatanMasuk, tugas: BackgroundTasks, db: Session = Depends(ambil_db), user: User = Depends(user_saat_ini)
):
    petugas = periksa_petugas(db, isi.petugas_id, user)
    periksa_isi(isi)
    laporan = Kendala(
        petugas_id=isi.petugas_id,
        dibuat_oleh=user.id,
        waktu=f.gabung_waktu(isi.tanggal, isi.jam),
        keterangan=isi.keterangan.strip(),
        status="Baru",
        penangan_id=isi.petugas_id,
    )
    berkas = simpan_foto(isi.foto, laporan, laporan.waktu, isi.latitude, isi.longitude)
    try:
        db.add(laporan)
        db.flush()
        _catat(db, user, "kendala_dilaporkan", laporan, "Dilaporkan")
        db.commit()
    except Exception:
        db.rollback()
        for lokasi in berkas:
            hapus_berkas(lokasi)
        raise
    tugas.add_task(push.kendala_baru, petugas.nama, laporan.id)
    return tampil.kendala(_ambil(db, laporan.id, user))


@router.post("/{kendala_id}/mulai", response_model=KendalaKeluar)
def mulai_tangani(
    kendala_id: int, tugas: BackgroundTasks, db: Session = Depends(ambil_db), user: User = Depends(user_saat_ini)
):
    """Baru → Diproses oleh penangan (atau admin)."""
    k = _ambil(db, kendala_id, user)
    _wajib_penangan(k, user)
    if k.status != "Baru":
        raise HTTPException(409, f"Kendala ini sudah berstatus {k.status}.")
    kini = f.sekarang()
    k.status = "Diproses"
    k.mulai_pada = kini
    k.diperbarui_pada = kini
    _catat(db, user, "kendala_mulai", k, "Mulai ditangani")
    db.commit()
    if k.petugas_id != user.id:
        tugas.add_task(push.status_kendala, k.petugas_id, "Diproses", k.id)
    return tampil.kendala(k)


@router.post("/{kendala_id}/selesai", response_model=KendalaKeluar)
def tandai_selesai(
    kendala_id: int,
    isi: SelesaiKendala,
    tugas: BackgroundTasks,
    db: Session = Depends(ambil_db),
    user: User = Depends(user_saat_ini),
):
    """
    Petugas penangan: Diproses → Selesai, wajib foto sesudah dan keterangan.
    Admin: dari Baru/Diproses (mis. dikerjakan vendor), foto sesudah tidak wajib.
    """
    k = _ambil(db, kendala_id, user)
    _wajib_penangan(k, user)
    petugas = user.peran == "user"
    if k.status == "Selesai":
        raise HTTPException(409, "Kendala ini sudah selesai.")
    if petugas and k.status != "Diproses":
        raise HTTPException(409, "Tekan Mulai tangani dulu sebelum menandai selesai.")
    if petugas and not isi.foto:
        raise HTTPException(422, "Ambil minimal 1 foto sesudah perbaikan.")
    periksa_jumlah_foto(isi.foto)
    keterangan = isi.keterangan.strip()
    if not keterangan:
        raise HTTPException(422, "Keterangan penyelesaian wajib diisi.")

    kini = f.sekarang()
    berkas = simpan_foto(isi.foto, k, kini, isi.latitude, isi.longitude, tahap="sesudah")
    try:
        k.status = "Selesai"
        k.mulai_pada = k.mulai_pada or kini
        k.selesai_pada = kini
        k.diselesaikan_oleh = user.id
        k.keterangan_selesai = keterangan
        k.diperbarui_pada = kini
        _catat(db, user, "kendala_selesai", k, "Ditandai selesai", keterangan)
        db.commit()
    except Exception:
        db.rollback()
        for lokasi in berkas:
            hapus_berkas(lokasi)
        raise
    if k.petugas_id != user.id:
        tugas.add_task(push.status_kendala, k.petugas_id, "Selesai", k.id)
    if petugas:
        tugas.add_task(push.kendala_selesai_petugas, user.nama, k.id)
    return tampil.kendala(_ambil(db, k.id, user))


@router.patch("/{kendala_id}/penangan", response_model=KendalaKeluar)
def tugaskan(
    kendala_id: int,
    isi: TugaskanKendala,
    tugas: BackgroundTasks,
    db: Session = Depends(ambil_db),
    admin: User = Depends(butuh_peran(*PENGAWAS)),
):
    k = _ambil(db, kendala_id, admin)
    if k.status == "Selesai":
        raise HTTPException(409, "Kendala yang sudah selesai tidak bisa ditugaskan ulang. Buka lagi dulu.")
    baru = db.get(User, isi.penangan_id)
    if not baru or baru.peran != "user":
        raise HTTPException(422, "Petugas tidak ditemukan.")
    if baru.status != "Aktif":
        raise HTTPException(422, f"{baru.nama} sedang {baru.status.lower()}, pilih petugas yang aktif.")
    if k.penangan_id == baru.id:
        raise HTTPException(422, f"Kendala ini sudah ditangani {baru.nama}.")
    kini = f.sekarang()
    k.penangan_id = baru.id
    k.penangan = baru
    k.ditugaskan_pada = kini
    k.diperbarui_pada = kini
    _catat(db, admin, "kendala_ditugaskan", k, f"Ditugaskan ke {baru.nama}")
    db.commit()
    tugas.add_task(push.kendala_ditugaskan, baru.id, k.petugas.nama, k.id)
    return tampil.kendala(k)


@router.post("/{kendala_id}/buka-lagi", response_model=KendalaKeluar)
def buka_lagi(
    kendala_id: int,
    isi: BukaLagiKendala,
    tugas: BackgroundTasks,
    db: Session = Depends(ambil_db),
    admin: User = Depends(butuh_peran(*PENGAWAS)),
):
    """Selesai → Diproses. Foto sesudah yang lama tetap disimpan sebagai jejak."""
    k = _ambil(db, kendala_id, admin)
    if k.status != "Selesai":
        raise HTTPException(409, "Hanya kendala yang sudah selesai yang bisa dibuka lagi.")
    alasan = isi.alasan.strip()
    if not alasan:
        raise HTTPException(422, "Alasan membuka lagi wajib diisi.")
    kini = f.sekarang()
    k.status = "Diproses"
    k.selesai_pada = None
    k.diselesaikan_oleh = None
    k.penyelesai = None
    k.keterangan_selesai = None
    k.dibuka_lagi_pada = kini
    k.diperbarui_pada = kini
    _catat(db, admin, "kendala_dibuka_lagi", k, "Dibuka lagi", alasan)
    db.commit()
    tugas.add_task(push.kendala_dibuka_lagi, {i for i in (k.penangan_id, k.petugas_id) if i}, k.id)
    return tampil.kendala(k)


@router.patch("/{kendala_id}/status", response_model=KendalaKeluar)
def ubah_status(
    kendala_id: int,
    isi: UbahStatusKendala,
    tugas: BackgroundTasks,
    db: Session = Depends(ambil_db),
    admin: User = Depends(butuh_peran(*PENGAWAS)),
):
    """Admin memproses sendiri (Baru → Diproses). Selesai dan buka lagi punya endpoint sendiri."""
    k = _ambil(db, kendala_id, admin)
    if isi.status == "Selesai":
        raise HTTPException(422, "Untuk menandai selesai, isi keterangan penyelesaian lewat Tandai selesai.")
    if k.status == "Selesai":
        raise HTTPException(422, "Kendala ini sudah selesai. Gunakan Buka lagi dan isi alasannya.")
    if isi.status != "Diproses" or k.status != "Baru":
        raise HTTPException(422, f"Kendala ini sudah berstatus {k.status}.")
    kini = f.sekarang()
    k.status = "Diproses"
    k.mulai_pada = kini
    k.diperbarui_pada = kini
    _catat(db, admin, "ubah_status_kendala", k, "Baru → Diproses")
    db.commit()
    tugas.add_task(push.status_kendala, k.petugas_id, "Diproses", k.id)
    return tampil.kendala(k)
