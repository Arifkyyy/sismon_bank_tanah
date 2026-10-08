from datetime import datetime, timedelta
from math import ceil

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.format import sekarang
from app.models import LogAudit, User

BATAS_KUNCI = 6
BATAS_NONAKTIF = 10
LAMA_KUNCI = timedelta(minutes=3)

GAGAL = "gagal_masuk"
PULIH = "pulihkan_masuk"
NONAKTIF = "nonaktif_otomatis"


def _kegagalan(db: Session, u: User) -> list[datetime]:
    """Waktu kegagalan berturut-turut, terlama dulu."""
    pulih = db.scalar(select(func.max(LogAudit.waktu)).where(LogAudit.user_id == u.id, LogAudit.aksi == PULIH))
    sejak = max((t for t in (u.terakhir_masuk, pulih) if t is not None), default=None)
    q = select(LogAudit.waktu).where(LogAudit.user_id == u.id, LogAudit.aksi == GAGAL)
    if sejak is not None:
        q = q.where(LogAudit.waktu > sejak)
    return list(db.scalars(q.order_by(LogAudit.waktu)))


def menit_terkunci(db: Session, u: User) -> int:
    """Sisa menit akun terkunci; 0 bila boleh mencoba masuk."""
    gagal = _kegagalan(db, u)
    if len(gagal) < BATAS_KUNCI:
        return 0
    # Kunci dihitung dari kegagalan ke-5, ke-10, dst. yang terakhir terjadi.
    kunci_sampai = gagal[(len(gagal) // BATAS_KUNCI) * BATAS_KUNCI - 1] + LAMA_KUNCI
    sisa = (kunci_sampai - sekarang()).total_seconds()
    return ceil(sisa / 60) if sisa > 0 else 0


def catat_gagal(db: Session, u: User) -> str:
    """Mencatat satu kegagalan dan mengembalikan pesan untuk pengguna."""
    db.add(LogAudit(user_id=u.id, aksi=GAGAL, detail=u.email))
    db.flush()
    n = len(_kegagalan(db, u))

    if n >= BATAS_NONAKTIF and u.peran != "superadmin":
        u.status = "Nonaktif"
        db.add(LogAudit(user_id=u.id, aksi=NONAKTIF, detail=f"{u.email}: {n} kali kata sandi salah"))
        db.commit()
        return (
            f"Kata sandi salah {n} kali. Demi keamanan, akun Anda dinonaktifkan. "
            "Silakan temui Super Admin untuk mengaktifkannya kembali."
        )
    db.commit()

    if n % BATAS_KUNCI == 0:
        return f"Kata sandi salah {n} kali. Akun dikunci {int(LAMA_KUNCI.total_seconds() // 60)} menit."
    if n < BATAS_KUNCI:
        return f"Email atau kata sandi salah. Sisa {BATAS_KUNCI - n} kali percobaan sebelum akun dikunci sementara."
    if u.peran == "superadmin":
        return "Email atau kata sandi salah."
    return (
        f"Email atau kata sandi salah. Sisa {BATAS_NONAKTIF - n} kali percobaan "
        "sebelum akun dinonaktifkan."
    )


def dinonaktifkan_sistem(db: Session, u: User) -> bool:
    """True bila akun nonaktif karena salah sandi 10 kali dan belum dipulihkan Super Admin."""
    if u.status != "Nonaktif":
        return False
    terakhir = db.scalar(
        select(LogAudit.aksi)
        .where(LogAudit.user_id == u.id, LogAudit.aksi.in_((NONAKTIF, PULIH)))
        .order_by(LogAudit.waktu.desc(), LogAudit.id.desc())
        .limit(1)
    )
    return terakhir == NONAKTIF


def pulihkan(db: Session, u: User, pelaku: User) -> None:
    """Menghapus hitungan kegagalan, mis. saat admin mengaktifkan akun atau mengatur ulang sandi."""
    db.add(LogAudit(user_id=u.id, aksi=PULIH, detail=f"oleh {pelaku.nama}"))
