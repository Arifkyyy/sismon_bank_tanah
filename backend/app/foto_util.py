"""
Menyimpan dan menghapus berkas foto bukti.

Bila R2_* di .env terisi, foto disimpan di Cloudflare R2 (bucket privat) dan
dibuka lewat signed URL. Bila kosong, foto disimpan di folder uploads/ lokal.
Lokasi yang disimpan di database sama untuk keduanya: 2026/09/<acak>.jpg.
"""
import base64
import binascii
import re
import uuid
from functools import lru_cache
from pathlib import Path

from fastapi import HTTPException

from app.config import pengaturan
from app.format import sekarang

FOLDER = Path(pengaturan.folder_foto)
_DATA_URL = re.compile(r"^data:image/(jpeg|jpg|png|webp);base64,(.+)$", re.DOTALL)
_EKSTENSI = {"jpeg": "jpg", "jpg": "jpg", "png": "png", "webp": "webp"}
_JENIS = {"jpg": "image/jpeg", "png": "image/png", "webp": "image/webp"}


@lru_cache
def _r2():
    """Klien S3 untuk R2, atau None bila R2 belum diatur."""
    if not pengaturan.pakai_r2:
        return None
    import boto3
    from botocore.config import Config

    return boto3.client(
        "s3",
        endpoint_url=f"https://{pengaturan.r2_account_id}.r2.cloudflarestorage.com",
        aws_access_key_id=pengaturan.r2_access_key_id,
        aws_secret_access_key=pengaturan.r2_secret_access_key,
        region_name="auto",
        # Checksum otomatis boto3 versi baru belum selalu diterima R2.
        config=Config(
            signature_version="s3v4",
            request_checksum_calculation="when_required",
            response_checksum_validation="when_required",
        ),
    )


def jenis_berkas(lokasi: str) -> str:
    return _JENIS.get(lokasi.rsplit(".", 1)[-1].lower(), "application/octet-stream")


def simpan_data_url(data_url: str) -> tuple[str, int]:
    """
    Foto dari kamera frontend berbentuk data URL ('data:image/jpeg;base64,...').
    Diubah jadi berkas biasa, disimpan per bulan: 2026/09/<acak>.jpg.
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
    relatif = f"{t.year}/{t.month:02d}/{uuid.uuid4().hex}.{_EKSTENSI[cocok.group(1)]}"

    if klien := _r2():
        try:
            klien.put_object(
                Bucket=pengaturan.r2_bucket, Key=relatif, Body=isi, ContentType=jenis_berkas(relatif)
            )
        except Exception:
            raise HTTPException(502, "Foto gagal diunggah ke penyimpanan. Coba lagi.") from None
    else:
        tujuan = FOLDER / relatif
        tujuan.parent.mkdir(parents=True, exist_ok=True)
        tujuan.write_bytes(isi)
    return relatif, len(isi)


def hapus_berkas(lokasi: str) -> None:
    """Menghapus berkas; diam saja kalau berkasnya memang sudah tidak ada."""
    if klien := _r2():
        try:
            klien.delete_object(Bucket=pengaturan.r2_bucket, Key=lokasi)
        except Exception:
            pass  # Berkas yatim di bucket tidak merusak apa pun.
    else:
        (FOLDER / lokasi).unlink(missing_ok=True)


def url_foto(lokasi: str) -> str:
    if klien := _r2():
        # Ditandatangani di server tanpa memanggil R2, jadi tidak memperlambat.
        return klien.generate_presigned_url(
            "get_object",
            Params={"Bucket": pengaturan.r2_bucket, "Key": lokasi},
            ExpiresIn=pengaturan.r2_url_menit * 60,
        )
    return f"{pengaturan.url_publik.rstrip('/')}/uploads/{lokasi}"


def url_foto_profil(lokasi: str | None) -> str | None:
    """URL foto profil pengguna, atau None bila ia belum memasangnya."""
    return url_foto(lokasi) if lokasi else None
