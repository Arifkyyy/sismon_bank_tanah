"""
Titik masuk backend.
Jalankan:  uvicorn app.main:app --reload
Dokumentasi API otomatis:  http://localhost:8000/docs
"""
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import pengaturan
from app.routers import akun, auth, checklist, foto, kendala, lembur, logbook, petugas, statistik

app = FastAPI(
    title="API Sistem Monitoring Petugas — Badan Bank Tanah",
    version="1.0.0",
    description="Backend untuk logbook, laporan kendala, dan lembur petugas Security, OB, dan CS.",
)

# CORS: izin agar frontend (localhost:5173) boleh memanggil API ini dari browser.
app.add_middleware(
    CORSMiddleware,
    allow_origins=pengaturan.daftar_origin,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pesan salah isi form dibuat dalam bahasa Indonesia yang mudah dibaca,
# supaya frontend bisa langsung menampilkannya ke pengguna.
_NAMA_FIELD = {
    "keterangan": "keterangan", "foto": "foto", "petugasId": "nama petugas", "tanggal": "tanggal",
    "jam": "jam", "mulai": "jam mulai", "selesai": "jam selesai", "email": "email", "sandi": "kata sandi",
    "sandiBaru": "kata sandi baru", "nama": "nama", "alasan": "alasan", "jabatan": "jabatan",
}


def _pesan(e: dict) -> str:
    field = _NAMA_FIELD.get(str(e["loc"][-1]), str(e["loc"][-1]))
    ctx = e.get("ctx") or {}
    match e["type"]:
        case "missing":
            return f"{field} wajib diisi"
        case "string_too_short":
            return f"{field} minimal {ctx.get('min_length')} karakter"
        case "too_short":
            return f"{field} minimal {ctx.get('min_length')}"
        case "value_error" if field == "email":
            return "format email tidak valid"
        case "literal_error":
            return f"pilihan {field} tidak valid"
        case _:
            return f"{field} tidak valid"


@app.exception_handler(RequestValidationError)
async def salah_isi(_: Request, exc: RequestValidationError):
    pesan = "; ".join(dict.fromkeys(_pesan(e) for e in exc.errors()))
    return JSONResponse(status_code=422, content={"detail": pesan[:1].upper() + pesan[1:] + "."})


for r in (auth, petugas, logbook, kendala, lembur, checklist, statistik, foto, akun):
    app.include_router(r.router)

# Foto bukti bisa dibuka lewat http://localhost:8000/uploads/2026/09/xxxx.jpg
Path(pengaturan.folder_foto).mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=pengaturan.folder_foto), name="uploads")


@app.get("/api/cek", tags=["Lain-lain"])
def cek():
    """Untuk memastikan server hidup."""
    return {"status": "ok"}
