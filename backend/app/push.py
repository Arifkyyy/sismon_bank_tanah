"""
Pengirim notifikasi Web Push.

Dipanggil lewat BackgroundTasks setelah data tersimpan, jadi memakai sesi
database sendiri. Kegagalan apa pun hanya dicatat ke log: aksi utamanya
(mis. kendala tersimpan) tidak boleh ikut gagal karena push.

Isi notifikasi sengaja hanya nama, tanpa keterangan, karena bisa tampil di
layar kunci HP.
"""
import json
import logging
from collections.abc import Iterable

from pywebpush import WebPushException, webpush
from sqlalchemy import select

from app.config import pengaturan
from app.database import SesiLokal
from app.format import sekarang
from app.models import LanggananPush, User

log = logging.getLogger(__name__)

# Sama dengan AKAR di src/config/menu.ts.
AKAR = {"superadmin": "/super-admin", "admin": "/admin", "user": "/petugas"}


def aktif() -> bool:
    return bool(pengaturan.vapid_public_key and pengaturan.vapid_private_key)


def _kirim(user_ids: Iterable[int], judul: str, halaman: str, tag: str) -> None:
    """`halaman` adalah bagian setelah akar peran, mis. 'laporan-kendala'."""
    ids = set(user_ids)
    if not aktif() or not ids:
        return
    try:
        with SesiLokal() as db:
            daftar = db.execute(
                select(LanggananPush, User.peran)
                .join(User, LanggananPush.user_id == User.id)
                .where(LanggananPush.user_id.in_(ids), User.status != "Nonaktif")
            ).all()
            for langganan, peran in daftar:
                isi = {"judul": judul, "tautan": f"{AKAR[peran]}/{halaman}", "tag": tag}
                try:
                    webpush(
                        subscription_info={
                            "endpoint": langganan.endpoint,
                            "keys": {"p256dh": langganan.p256dh, "auth": langganan.auth},
                        },
                        data=json.dumps(isi),
                        vapid_private_key=pengaturan.vapid_private_key,
                        vapid_claims={"sub": pengaturan.vapid_subject},
                        ttl=24 * 60 * 60,
                        timeout=10,
                    )
                    langganan.terakhir_dipakai = sekarang()
                except WebPushException as e:
                    kode = e.response.status_code if e.response is not None else None
                    if kode in (404, 410):
                        # Browser sudah mencabut langganannya: tidak perlu dicoba lagi.
                        db.delete(langganan)
                    else:
                        log.warning("Push ke langganan #%s gagal (%s): %s", langganan.id, kode, e)
            db.commit()
    except Exception:
        log.exception("Pengiriman notifikasi push gagal")


def _pengawas() -> list[int]:
    with SesiLokal() as db:
        return list(db.scalars(select(User.id).where(User.peran.in_(("admin", "superadmin")))))


# ------------------------------------------------------------- per kejadian

def kendala_baru(nama_petugas: str, kendala_id: int) -> None:
    _kirim(_pengawas(), f"Laporan kendala baru dari {nama_petugas}", "laporan-kendala", f"kendala-{kendala_id}")


def status_kendala(petugas_id: int, status: str, kendala_id: int) -> None:
    judul = "Laporan kendala Anda sudah selesai" if status == "Selesai" else "Laporan kendala Anda sedang diproses"
    _kirim([petugas_id], judul, "laporan-kendala", f"kendala-{kendala_id}")


def lembur_dikirim(petugas_id: int, nama_admin: str, lembur_id: int) -> None:
    _kirim([petugas_id], f"Penugasan lembur baru dari {nama_admin}", "lembur", f"lembur-{lembur_id}")


def lembur_dijawab(nama_petugas: str, diterima: bool, lembur_id: int) -> None:
    kata = "menerima" if diterima else "menolak"
    _kirim(_pengawas(), f"{nama_petugas} {kata} penugasan lembur", "pengajuan-lembur", f"lembur-{lembur_id}")


def uji(user_id: int, nama: str) -> None:
    _kirim([user_id], f"Notifikasi uji untuk {nama}", "profil", "uji")
