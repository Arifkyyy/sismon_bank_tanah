"""Pengaturan aplikasi, dibaca dari berkas .env."""
from functools import lru_cache
from zoneinfo import ZoneInfo

from pydantic_settings import BaseSettings, SettingsConfigDict


class Pengaturan(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = "postgresql+psycopg://sismon:sismon123@localhost:5432/sismon_bank_tanah"
    jwt_secret: str = "ganti-dengan-teks-acak-yang-panjang"
    jwt_menit: int = 720
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    folder_foto: str = "uploads"
    url_publik: str = "http://localhost:8000"

    # Batas foto: sama dengan MAKS_FOTO di frontend.
    maks_foto: int = 5
    maks_ukuran_foto_mb: int = 5

    # Berapa hari ke belakang checklist masih boleh diisi.
    # 0 = hanya hari ini; 1 = hari ini dan kemarin.
    checklist_mundur_hari: int = 1

    @property
    def daftar_origin(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def ambil_pengaturan() -> Pengaturan:
    return Pengaturan()


pengaturan = ambil_pengaturan()

# Semua jam di aplikasi ini memakai WIB.
ZONA = ZoneInfo("Asia/Jakarta")
