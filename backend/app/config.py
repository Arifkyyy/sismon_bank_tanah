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

    # Cloudflare R2. Kosong = foto disimpan di folder_foto lokal.
    r2_account_id: str = ""
    r2_access_key_id: str = ""
    r2_secret_access_key: str = ""
    r2_bucket: str = ""
    # Lama signed URL foto berlaku; disamakan dengan jwt_menit.
    r2_url_menit: int = 720

    # Lama lembur paling panjang dalam satu penugasan (jam).
    # Sama dengan MAKS_JAM_LEMBUR di frontend (src/components/AntreanLembur.tsx).
    maks_jam_lembur: int = 12

    # Berapa hari ke belakang checklist masih boleh diisi.
    # 0 = hanya hari ini; 1 = hari ini dan kemarin.
    checklist_mundur_hari: int = 1

    # Kunci Web Push (VAPID). Kosong = notifikasi push dimatikan, fitur lain tetap jalan.
    vapid_public_key: str = ""
    vapid_private_key: str = ""
    vapid_subject: str = "mailto:admin@example.com"

    @property
    def pakai_r2(self) -> bool:
        return all((self.r2_account_id, self.r2_access_key_id, self.r2_secret_access_key, self.r2_bucket))

    @property
    def daftar_origin(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def ambil_pengaturan() -> Pengaturan:
    return Pengaturan()


pengaturan = ambil_pengaturan()

# Semua jam di aplikasi ini memakai WIB.
ZONA = ZoneInfo("Asia/Jakarta")
