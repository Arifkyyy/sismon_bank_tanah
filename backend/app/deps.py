"""Pemeriksaan login dan peran yang dipakai di banyak endpoint."""
from collections.abc import Callable

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.database import ambil_db
from app.models import User
from app.security import baca_token

_bearer = HTTPBearer(auto_error=False)


def user_saat_ini(
    kredensial: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(ambil_db),
) -> User:
    if kredensial is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Silakan masuk terlebih dahulu.")
    isi = baca_token(kredensial.credentials)
    if not isi:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Sesi habis. Silakan masuk lagi.")
    user = db.get(User, int(isi["sub"]))
    if not user or user.status == "Nonaktif":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Akun tidak aktif.")
    return user


def butuh_peran(*peran: str) -> Callable[..., User]:
    """Contoh: Depends(butuh_peran('admin', 'superadmin'))."""

    def periksa(user: User = Depends(user_saat_ini)) -> User:
        if user.peran not in peran:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Anda tidak punya akses ke fitur ini.")
        return user

    return periksa


PENGAWAS = ("admin", "superadmin")
