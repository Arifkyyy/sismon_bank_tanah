"""Angka-angka untuk dashboard dan halaman Rekapitulasi (semuanya dihitung, tidak disimpan)."""
from collections import defaultdict
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app import format as f
from app.database import ambil_db
from app.deps import PENGAWAS, butuh_peran, user_saat_ini
from app.foto_util import url_foto_profil
from app.models import ChecklistHarian, Kendala, Lembur, Logbook, User
from app.schemas import HariKeluar, Jabatan, RekapKeluar, SebaranKeluar

router = APIRouter(prefix="/api/statistik", tags=["Statistik"])

# Tanggal logbook dihitung dalam WIB, bukan UTC.
_TGL_LOG = func.date(func.timezone("Asia/Jakarta", Logbook.waktu))
_TGL_KENDALA = func.date(func.timezone("Asia/Jakarta", Kendala.waktu))


@router.get("/tujuh-hari", response_model=list[HariKeluar])
def tujuh_hari(db: Session = Depends(ambil_db), user: User = Depends(user_saat_ini)):
    """Jumlah logbook dan jam lembur per hari, tujuh hari terakhir (untuk bagan batang)."""
    akhir = f.hari_ini()
    awal = akhir - timedelta(days=6)

    q_log = (
        select(_TGL_LOG, func.count())
        .where(Logbook.waktu >= f.awal_hari(awal), Logbook.waktu < f.akhir_hari(akhir))
        .group_by(_TGL_LOG)
    )
    q_lembur = select(Lembur).where(Lembur.status == "Diterima", Lembur.tanggal.between(awal, akhir))
    if user.peran == "user":
        q_log = q_log.where(Logbook.petugas_id == user.id)
        q_lembur = q_lembur.where(Lembur.petugas_id == user.id)

    jumlah_log = {tgl: n for tgl, n in db.execute(q_log)}
    menit = defaultdict(int)
    for l in db.scalars(q_lembur):
        menit[l.tanggal] += f.menit_lembur(l.jam_mulai, l.jam_selesai)

    hasil = []
    for i in range(7):
        t = awal + timedelta(days=i)
        hasil.append(
            HariKeluar(hari=f.HARI_PENDEK[t.weekday()], logbook=jumlah_log.get(t, 0), lembur=round(menit[t] / 60, 1))
        )
    return hasil


@router.get("/sebaran-jabatan", response_model=list[SebaranKeluar])
def sebaran(db: Session = Depends(ambil_db), _: User = Depends(butuh_peran(*PENGAWAS))):
    """Jumlah petugas aktif/cuti per jabatan (untuk bagan donat)."""
    q = (
        select(User.jabatan, func.count())
        .where(User.peran == "user", User.status != "Nonaktif")
        .group_by(User.jabatan)
    )
    jumlah = dict(db.execute(q).all())
    label = {"Security": "Security", "CS": "Customer Service", "OB": "Office Boy", "Messenger": "Messenger"}
    return [SebaranKeluar(label=label[j], nilai=jumlah.get(j, 0)) for j in ("Security", "CS", "OB", "Messenger")]


@router.get("/rekap", response_model=list[RekapKeluar])
def rekap(
    dari: date | None = None,
    sampai: date | None = None,
    jabatan: Jabatan | None = None,
    db: Session = Depends(ambil_db),
    _: User = Depends(butuh_peran(*PENGAWAS)),
):
    """
    Rekap per petugas dalam satu periode.
    - hari   : jumlah hari yang punya minimal satu logbook
    - patuh  : hari / jumlah hari dalam periode (dibulatkan)
    Tanpa dari/sampai = seluruh periode (sejak logbook pertama).
    """
    sampai = sampai or f.hari_ini()
    if dari is None:
        pertama = db.scalar(select(func.min(_TGL_LOG)))
        dari = pertama or sampai
    if dari > sampai:
        raise HTTPException(422, "Tanggal awal harus sebelum tanggal akhir.")
    # Hari yang belum terjadi tidak ikut dihitung sebagai hari wajib isi.
    batas_hitung = min(sampai, f.hari_ini())
    jumlah_hari = max((batas_hitung - dari).days + 1, 1)

    q_petugas = select(User).where(User.peran == "user").order_by(User.jabatan, User.nama)
    if jabatan:
        q_petugas = q_petugas.where(User.jabatan == jabatan)
    petugas = list(db.scalars(q_petugas))
    ids = [p.id for p in petugas]
    if not ids:
        return []

    rentang_log = (Logbook.waktu >= f.awal_hari(dari), Logbook.waktu < f.akhir_hari(sampai))
    log = {
        pid: (n, hari)
        for pid, n, hari in db.execute(
            select(Logbook.petugas_id, func.count(), func.count(func.distinct(_TGL_LOG)))
            .where(Logbook.petugas_id.in_(ids), *rentang_log)
            .group_by(Logbook.petugas_id)
        )
    }
    kendala = dict(
        db.execute(
            select(Kendala.petugas_id, func.count())
            .where(
                Kendala.petugas_id.in_(ids),
                Kendala.waktu >= f.awal_hari(dari),
                Kendala.waktu < f.akhir_hari(sampai),
            )
            .group_by(Kendala.petugas_id)
        ).all()
    )
    menit = defaultdict(int)
    for l in db.scalars(
        select(Lembur).where(
            Lembur.status == "Diterima", Lembur.petugas_id.in_(ids), Lembur.tanggal.between(dari, sampai)
        )
    ):
        menit[l.petugas_id] += f.menit_lembur(l.jam_mulai, l.jam_selesai)

    checklist = dict(
        db.execute(
            select(ChecklistHarian.petugas_id, func.count())
            .where(
                ChecklistHarian.status == "Dikirim",
                ChecklistHarian.petugas_id.in_(ids),
                ChecklistHarian.tanggal.between(dari, sampai),
            )
            .group_by(ChecklistHarian.petugas_id)
        ).all()
    )

    hasil = []
    for p in petugas:
        n_log, n_hari = log.get(p.id, (0, 0))
        jam_lembur = menit[p.id] / 60
        hasil.append(
            RekapKeluar(
                petugas_id=p.id,
                nama=p.nama,
                jabatan=p.jabatan,
                foto_profil=url_foto_profil(p.foto_profil),
                hari=n_hari,
                logbook=n_log,
                kendala=kendala.get(p.id, 0),
                lembur=f"{jam_lembur:g} jam".replace(".", ","),
                patuh=f"{min(round(n_hari / jumlah_hari * 100), 100)}%",
                checklist=f"{checklist.get(p.id, 0)}/{jumlah_hari} hari",
            )
        )
    return hasil
