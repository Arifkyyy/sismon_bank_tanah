"""Menyimpan dan menghapus berkas foto bukti di folder uploads/."""
import base64
import binascii
import re
import uuid
from pathlib import Path

from fastapi import HTTPException

from app.config import pengaturan
from app.format import sekarang

FOLDER = Path(pengaturan.folder_foto)
_DATA_URL = re.compile(r"^data:image/(jpeg|jpg|png|webp);base64,(.+)$", re.DOTALL)
_EKSTENSI = {"jpeg": "jpg", "jpg": "jpg", "png": "png", "webp": "webp"}


def simpan_data_url(data_url: str) -> tuple[str, int]:
    """
    Foto dari kamera frontend berbentuk data URL ('data:image/jpeg;base64,...').
    Diubah jadi berkas biasa, disimpan per bulan: uploads/2026/09/<acak>.jpg.
    Mengembalikan (lokasi relatif, ukuran byte).
    """
    cocok = _DATA_URL.match(data_url.strip())
    if not cocok:
        raise HTTPException(422, "Format foto tidak dikenali. Ambil ulang fotonya dari kamera.")
    try:
        isi = base64.b64decode(cocok.group(2), validate=True)
    except (binascii.Error, ValueError):
        raise HTTPException(422, "Data foto rusak. Ambil ulang fotonya.") from None

    batas = pengaturan.maks_ukuran_foto_mb * 1024 * 1024
    if len(isi) > batas:
        raise HTTPException(413, f"Ukuran foto melebihi {pengaturan.maks_ukuran_foto_mb} MB.")

    t = sekarang()
    relatif = Path(f"{t.year}") / f"{t.month:02d}" / f"{uuid.uuid4().hex}.{_EKSTENSI[cocok.group(1)]}"
    tujuan = FOLDER / relatif
    tujuan.parent.mkdir(parents=True, exist_ok=True)
    tujuan.write_bytes(isi)
    return relatif.as_posix(), len(isi)


def hapus_berkas(lokasi: str) -> None:
    """Menghapus berkas; diam saja kalau berkasnya memang sudah tidak ada."""
    (FOLDER / lokasi).unlink(missing_ok=True)


def url_foto(lokasi: str) -> str:
    return f"{pengaturan.url_publik.rstrip('/')}/uploads/{lokasi}"


def url_foto_profil(lokasi: str | None) -> str | None:
    """URL foto profil pengguna, atau None bila ia belum memasangnya."""
    return url_foto(lokasi) if lokasi else None
