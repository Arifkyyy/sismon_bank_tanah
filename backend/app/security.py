"""Acak kata sandi (bcrypt) dan token login (JWT)."""
import secrets
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

from app.config import pengaturan

ALGORITMA = "HS256"


def acak_sandi(sandi: str) -> str:
    return bcrypt.hashpw(sandi.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def cocok_sandi(sandi: str, hash_: str) -> bool:
    try:
        return bcrypt.checkpw(sandi.encode("utf-8"), hash_.encode("utf-8"))
    except ValueError:
        return False


def buat_token(user_id: int, peran: str) -> str:
    kedaluwarsa = datetime.now(timezone.utc) + timedelta(minutes=pengaturan.jwt_menit)
    isi = {"sub": str(user_id), "peran": peran, "exp": kedaluwarsa}
    return jwt.encode(isi, pengaturan.jwt_secret, algorithm=ALGORITMA)


def baca_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, pengaturan.jwt_secret, algorithms=[ALGORITMA])
    except jwt.PyJWTError:
        return None


def sandi_sementara() -> str:
    """Sandi acak 10 karakter untuk akun baru / atur ulang sandi."""
    return secrets.token_urlsafe(8)[:10]
