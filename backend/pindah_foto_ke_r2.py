"""
Mengunggah foto lama dari folder uploads/ lokal ke bucket R2.

Jalankan sekali di tiap laptop yang punya foto lama (dari folder backend):
    python pindah_foto_ke_r2.py
Aman diulang: foto yang sudah ada di bucket dilewati. Berkas lokal tidak dihapus.
"""
from pathlib import Path

from botocore.exceptions import ClientError

from app.config import pengaturan
from app.foto_util import FOLDER, _r2, jenis_berkas

klien = _r2()
if klien is None:
    raise SystemExit("R2_* di .env belum lengkap. Isi dulu, lalu jalankan ulang.")

naik = lewat = 0
for berkas in sorted(p for p in Path(FOLDER).rglob("*") if p.is_file()):
    kunci = berkas.relative_to(FOLDER).as_posix()
    try:
        klien.head_object(Bucket=pengaturan.r2_bucket, Key=kunci)
        lewat += 1
        continue
    except ClientError:
        pass
    klien.put_object(
        Bucket=pengaturan.r2_bucket, Key=kunci, Body=berkas.read_bytes(), ContentType=jenis_berkas(kunci)
    )
    naik += 1
    print("naik:", kunci)

print(f"Selesai. {naik} diunggah, {lewat} sudah ada.")
