# Sistem Monitoring Petugas — Badan Bank Tanah

Aplikasi web untuk memantau logbook harian, laporan kendala, dan lembur petugas **Security**, **Office Boy**,
**Customer Service**, dan **Messenger**.

| Bagian | Teknologi | Letak |
| --- | --- | --- |
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS + React Router | folder ini (`src/`) |
| Backend | FastAPI + SQLAlchemy + Alembic + PostgreSQL, login JWT | `backend/` |

Dokumentasi backend ada di **[backend/README.md](backend/README.md)**. Cara
memasangnya ada di **[backend/PANDUAN.md](backend/PANDUAN.md)**, dan daftar
endpoint ada di **[backend/KONTRAK-API.md](backend/KONTRAK-API.md)**.

---

## Cara menjalankan

Butuh **Node.js 18+**, **Python 3.10+**, dan **PostgreSQL**. Jalankan backend
dan frontend di dua terminal terpisah.

**1. Backend** (port 8000). Langkah lengkapnya ada di `backend/PANDUAN.md`:

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env     # lalu sesuaikan DATABASE_URL dan JWT_SECRET
alembic upgrade head       # buat tabel
python seed.py             # akun awal + data contoh
uvicorn app.main:app --reload
```

Untuk mencoba API langsung, buka `http://localhost:8000/docs`.

**2. Frontend** (port 5173):

```bash
npm install
npm run dev
```

Alamat backend dibaca dari `VITE_API_URL` di berkas `.env` di root proyek
(bawaannya `http://localhost:8000`).

> Port 5173 dikunci (`strictPort` di `vite.config.ts`). Kalau port itu sudah
> dipakai, Vite berhenti dan tidak pindah ke 5174, karena port lain akan
> ditolak oleh `CORS_ORIGINS` di backend.

Perintah frontend lainnya:

```bash
npm run build     # periksa TypeScript lalu bangun versi produksi ke dist/
npm run preview   # lihat hasil build
npm run lint      # periksa kesalahan TypeScript
```

## Akun untuk mencoba

`python seed.py` membuat akun contoh untuk tiap peran (Super Admin, Admin, dan
Petugas OB/CS/Messenger). Daftar email dan kata sandinya ada di
`backend/PANDUAN.md`. Setelah login, pengguna diarahkan ke halaman sesuai
perannya:

| Peran | Akar rute |
| --- | --- |
| Super Admin | `/super-admin` |
| Admin | `/admin` |
| Petugas | `/petugas` |

## Halaman yang tersedia

| Peran | Halaman |
| --- | --- |
| **Admin** | Dashboard, Log aktivitas, Laporan kendala, Data user, Rekapitulasi, Pengajuan lembur, Profil |
| **Super Admin** | Semua halaman admin + Kelola akun + Hapus data foto |
| **Petugas** | Dashboard, Aktivitas (logbook), Laporan kendala, Rekap harian, Lembur, Profil |

Semua peran juga bisa membuka halaman **Sistem desain** (`…/sistem-desain`).
Isinya palet warna, skala huruf, dan komponen, jadi bisa dipakai sebagai
rujukan saat menambah halaman baru.

Lonceng di topbar menampilkan notifikasi dari kendala, lembur, dan kerja
wajib. Angka penanda di sidebar juga diambil dari backend.

## Susunan folder frontend

```
src/
├── main.tsx, App.tsx   titik masuk dan rute per peran (dijaga oleh <Penjaga>)
├── components/         komponen yang dipakai berulang
│   ├── ui.tsx              tombol, kartu, tabel, pil status, input
│   ├── AppLayout.tsx       rangka aplikasi (sidebar + topbar + isi)
│   ├── Sidebar.tsx         sidebar + penanda menu yang meluncur
│   ├── Notifikasi.tsx      panel lonceng notifikasi
│   ├── Kamera.tsx          kamera langsung (getUserMedia) + cap waktu
│   ├── FotoBukti.tsx       kumpulan foto bukti sebuah catatan (maks. 5)
│   ├── Foto.tsx            PratinjauFoto: pop-up untuk melihat foto
│   ├── Modal.tsx           kerangka pop-up
│   ├── Bagan.tsx           bagan batang & donat
│   ├── StatCard.tsx        kartu statistik
│   ├── StatusData.tsx      tampilan memuat / galat / kosong
│   └── …                   Linimasa, Riwayat, RentangTanggal, Draf, AntreanLembur
├── config/menu.ts      daftar menu, akar rute, dan judul halaman tiap peran
├── context/
│   ├── AuthContext.tsx     sesi login (masuk, keluar, pulihkan sesi)
│   ├── KonfirmasiContext   useKonfirmasi(): pop-up konfirmasi
│   └── LemburContext.tsx   data lembur bersama
├── lib/
│   ├── api.ts              satu-satunya pintu ke backend
│   ├── useApi.ts           hook untuk mengambil data + status memuat/galat
│   ├── excel.ts            pembuat berkas .xlsx tanpa pustaka tambahan
│   ├── tanggal.ts, periode.ts   format tanggal & rentang periode (WIB)
│   └── ikon.tsx, util.ts
├── pages/              satu berkas per halaman
│   ├── Login, Profil, SistemDesain
│   ├── admin/ · superadmin/ · user/
└── types/index.ts      tipe data bersama (bentuknya sama dengan respons API)
```

## Cara frontend berbicara dengan backend

Semua panggilan lewat fungsi `api()` di **`src/lib/api.ts`**:

- Token login dikirim otomatis di header `Authorization`.
- Kalau **"Ingat perangkat ini"** dicentang, token disimpan di `localStorage`.
  Kalau tidak, token disimpan di `sessionStorage` dan hilang saat browser
  ditutup.
- Kalau backend menjawab **401**, sesi dihapus dan `AuthContext` mengembalikan
  pengguna ke halaman login.
- Pesan galat dari backend sudah berbahasa Indonesia (lihat
  `backend/app/main.py`), jadi bisa langsung ditampilkan ke pengguna lewat
  `GalatApi`.

Saat halaman dimuat ulang, `AuthContext` memulihkan sesi lewat
`GET /api/auth/saya` sebelum rute dijaga. Dengan begitu, pengguna yang sudah
login tidak terlempar ke halaman login.

## Aturan tampilan

- **Konfirmasi** memakai pop-up `useKonfirmasi()`, bukan `window.confirm` atau
  `alert`.
- **Melihat foto** memakai pop-up `PratinjauFoto`, bukan tab baru.

## Catatan penting soal foto

Halaman **Aktivitas** (logbook) dan **Laporan kendala** sengaja tidak punya
tombol unggah dari galeri, karena foto bukti harus diambil saat itu juga.

`src/components/Kamera.tsx` membuka kamera perangkat lewat `getUserMedia`,
menggambar frame ke `<canvas>` saat tombol rana ditekan, lalu menempelkan cap
waktu langsung ke gambar sebelum dikirim. Satu catatan boleh berisi paling
banyak **5 foto** (`MAKS_FOTO`, sama dengan batas di backend). Backend
menyimpan foto di `backend/uploads/`, dan foto bisa dibuka lewat
`http://localhost:8000/uploads/…`.

> `getUserMedia` hanya berjalan di `localhost` atau HTTPS. Di server produksi,
> aplikasi wajib dipasang dengan HTTPS.

## Warna dan huruf

Palet diambil dari logo Badan Bank Tanah dan didaftarkan di
`tailwind.config.ts`:

| Token Tailwind | Nilai | Dipakai untuk |
| --- | --- | --- |
| `sidebar-atas` → `sidebar-bawah` | `#09381A` → `#1A9E48` | gradasi sidebar |
| `ink` | `#0B3747` | judul, teks utama |
| `hijau` | `#10874C` | tombol utama, status aman |
| `emas` | `#F2BE26` | menunggu jawaban, jam lembur |
| `tanah` | `#DE7B2C` | laporan kendala |
| `merah` | `#C4443B` | **hanya** tindakan menghapus |
| `kertas` | `#F1F5F2` | latar halaman & penanda menu aktif |

Huruf: **Plus Jakarta Sans** untuk seluruh isi dan **Inter** untuk kop sidebar
(`font-inter`). Keduanya dimuat dari Google Fonts di `index.html`.

## Cara kerja penanda menu yang meluncur

Kodenya ada di `src/components/Sidebar.tsx`. Ringkasnya:

1. Posisi menu aktif diukur dengan `getBoundingClientRect()`. Penandanya lalu
   digeser memakai `transform: translateY(...)`, bukan `top`, supaya
   animasinya diproses kartu grafis dan tetap mulus di HP kelas bawah.
2. Warnanya sama persis dengan latar halaman (`bg-kertas`), jadi terlihat
   seperti halaman yang "menggigit" masuk ke sidebar.
3. Dua sudut cekungnya digambar dengan `radial-gradient` di kelas
   `.penanda-menu` (`src/index.css`), karena Tailwind tidak punya utilitas
   untuk sudut cekung.
4. Sidebar sengaja **tanpa bayangan ke kanan**. Bayangan akan menggelapkan
   halaman di sebelahnya tapi tidak mengenai bagian cekungnya, sehingga
   cekungan terlihat berbeda warna.
