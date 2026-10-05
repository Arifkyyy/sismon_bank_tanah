"""Langganan notifikasi Web Push per perangkat."""
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app import push
from app.config import pengaturan
from app.database import ambil_db
from app.deps import user_saat_ini
from app.models import LanggananPush, User
from app.schemas import KunciPush, LanggananHapus, LanggananMasuk

router = APIRouter(prefix="/api/push", tags=["Notifikasi push"])


@router.get("/kunci", response_model=KunciPush)
def kunci(_: User = Depends(user_saat_ini)):
    """Kunci publik untuk pushManager.subscribe() di browser."""
    return KunciPush(kunci=pengaturan.vapid_public_key if push.aktif() else "")


@router.post("/langganan", status_code=204)
def langganan(isi: LanggananMasuk, db: Session = Depends(ambil_db), user: User = Depends(user_saat_ini)):
    """
    Menyimpan langganan perangkat ini. Endpoint yang sama dipakai ulang oleh
    browser yang sama, jadi bila orang lain pernah masuk di perangkat ini,
    pemiliknya dipindah ke pengguna yang sedang masuk.
    """
    if not push.aktif():
        raise HTTPException(503, "Notifikasi push belum disiapkan di server.")
    lama = db.scalar(select(LanggananPush).where(LanggananPush.endpoint == isi.endpoint))
    if lama is None:
        lama = LanggananPush(endpoint=isi.endpoint)
        db.add(lama)
    lama.user_id = user.id
    lama.p256dh = isi.keys.p256dh
    lama.auth = isi.keys.auth
    lama.perangkat = isi.perangkat.strip()
    db.commit()


@router.delete("/langganan", status_code=204)
def berhenti(isi: LanggananHapus, db: Session = Depends(ambil_db), user: User = Depends(user_saat_ini)):
    """Dipanggil saat notifikasi dimatikan atau saat keluar dari perangkat ini."""
    db.execute(
        delete(LanggananPush).where(LanggananPush.endpoint == isi.endpoint, LanggananPush.user_id == user.id)
    )
    db.commit()


@router.post("/uji", status_code=202)
def uji(tugas: BackgroundTasks, db: Session = Depends(ambil_db), user: User = Depends(user_saat_ini)):
    """Mengirim notifikasi uji ke semua perangkat milik pengguna ini."""
    ada = db.scalar(select(LanggananPush.id).where(LanggananPush.user_id == user.id).limit(1))
    if ada is None:
        raise HTTPException(409, "Perangkat ini belum mengaktifkan notifikasi.")
    tugas.add_task(push.uji, user.id, user.nama)
