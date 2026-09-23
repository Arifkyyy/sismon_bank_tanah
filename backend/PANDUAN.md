# Panduan Backend — Sistem Monitoring Petugas Badan Bank Tanah

Backend ini memakai **FastAPI** (Python) dan **PostgreSQL**.
Panduan ini ditulis untuk Windows + PowerShell.

---

## 1. Pasang program yang dibutuhkan

| Program | Keterangan |
| --- | --- |
| Python 3.11 atau lebih baru | Saat memasang, centang **Add Python to PATH** |
| PostgreSQL 15 atau lebih baru | Catat kata sandi user `postgres` yang Anda buat |

Cek pemasangan:

```powershell
python --version
psql --version
```

## 2. Buat database

Buka **SQL Shell (psql)** dari Start Menu, masuk sebagai `postgres`, lalu ketik:

```sql
CREATE USER sismon WITH PASSWORD 'sismon123';
CREATE DATABASE sismon_bank_tanah OWNER sismon;
```

Ganti `sismon123` dengan kata sandi lain kalau dipakai di server kantor.

## 3. Siapkan folder backend

Taruh folder `backend/` di dalam repo, sejajar dengan folder `src/`:

```
sismon_bank_tanah/
├── src/          (frontend React)
├── backend/      (folder ini)
└── package.json
```

Lalu:

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

`venv` adalah kotak terpisah supaya paket Python proyek ini tidak bercampur
dengan proyek lain. Kalau `Activate.ps1` ditolak Windows, jalankan sekali:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

## 4. Isi pengaturan

```powershell
copy .env.example .env
python -c "import secrets; print(secrets.token_hex(32))"
```

Buka `.env`, tempel hasil perintah kedua ke `JWT_SECRET`. Itu kunci rahasia
untuk menandatangani token login. Sesuaikan juga `DATABASE_URL` kalau nama
user atau kata sandi database Anda berbeda.

## 5. Buat semua tabel

```powershell
alembic upgrade head
```

Alembic membaca berkas di `alembic/versions/` dan membuat tabelnya di
PostgreSQL. Untuk mengecek: `psql -d sismon_bank_tanah -c "\dt"`.

## 6. Isi akun dan data contoh

```powershell
python seed.py            # akun + data contoh (untuk mencoba)
python seed.py --kosong   # hanya akun super admin + item checklist
```

Semua akun contoh memakai kata sandi **`BankTanah2026!`**:

| Peran | Email |
| --- | --- |
| Super Admin | dian.permatasari@banktanah.go.id |
| Admin | rahmat.hidayat@banktanah.go.id |
| Petugas (OB) | joko.priyono@banktanah.go.id |
| Petugas (CS) | siti.nurhaliza@banktanah.go.id |
| Petugas (Messenger) | dimas.prakoso@banktanah.go.id |

Ganti kata sandi ini sebelum dipakai sungguhan.

## 7. Jalankan

```powershell
uvicorn app.main:app --reload
```

- API: `http://localhost:8000`
- Dokumentasi otomatis yang bisa dicoba langsung: `http://localhost:8000/docs`
- Foto bukti: `http://localhost:8000/uploads/...`

## 8. Sambungkan ke frontend

Di folder utama (tempat `package.json`), buat berkas `.env`:

```
VITE_API_URL=http://localhost:8000
```

Alamat frontend yang boleh memanggil API diatur di `CORS_ORIGINS` pada `.env`
backend. Bawaannya sudah `http://localhost:5173`.

Bentuk data tiap endpoint ada di **KONTRAK-API.md**.

---

## Kalau ada masalah

| Pesan | Penyebab dan cara mengatasi |
| --- | --- |
| `connection refused ... port 5432` | Layanan PostgreSQL belum jalan. Buka Services di Windows, jalankan `postgresql-x64-…` |
| `password authentication failed` | `DATABASE_URL` di `.env` tidak cocok dengan user/kata sandi database |
| Frontend kena **CORS** | Alamat frontend belum terdaftar di `CORS_ORIGINS` pada `.env` |
| `401 Sesi habis` | Token kedaluwarsa (bawaan 12 jam). Login ulang |
| `ModuleNotFoundError` | venv belum diaktifkan. Jalankan `.venv\Scripts\Activate.ps1` |

## Kalau struktur tabel diubah

Setelah mengubah `app/models.py`:

```powershell
alembic revision --autogenerate -m "penjelasan singkat"
alembic upgrade head
```

Periksa dulu berkas yang dihasilkan di `alembic/versions/` sebelum dijalankan.

## Sebelum dipakai di server kantor

1. Ganti `JWT_SECRET` dengan nilai acak baru.
2. Ganti semua kata sandi akun bawaan.
3. Pakai `python seed.py --kosong`, jangan yang berisi data contoh.
4. Jalankan lewat HTTPS. Folder `uploads/` sebaiknya tidak bisa diakses
   sembarang orang; saat ini berkas foto bisa dibuka siapa saja yang tahu
   alamatnya (nama berkasnya acak, tapi tidak ada pemeriksaan login).
5. Cadangkan database secara berkala: `pg_dump sismon_bank_tanah > cadangan.sql`.
