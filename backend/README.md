# Backend — Sistem Monitoring Petugas Badan Bank Tanah

FastAPI + PostgreSQL. Melayani logbook, laporan kendala, lembur, checklist
harian, rekap, arsip foto, dan kelola akun.

- Cara memasang dan menjalankan: **[PANDUAN.md](PANDUAN.md)**
- Daftar endpoint dan bentuk datanya: **[KONTRAK-API.md](KONTRAK-API.md)**
- Dokumentasi yang bisa dicoba langsung: `http://localhost:8000/docs`

## Isi folder

```
backend/
├── app/
│   ├── main.py          titik masuk, CORS, pesan galat berbahasa Indonesia
│   ├── config.py        pengaturan dari .env
│   ├── database.py      sambungan PostgreSQL
│   ├── models.py        struktur 9 tabel
│   ├── schemas.py       bentuk data masuk dan keluar API
│   ├── security.py      acak kata sandi (bcrypt) dan token login (JWT)
│   ├── deps.py          pemeriksaan login dan peran
│   ├── format.py        tanggal dan jam gaya Indonesia (WIB)
│   ├── tampil.py        baris database → bentuk yang dipakai frontend
│   ├── catatan.py       logika bersama logbook dan kendala
│   ├── foto_util.py     simpan/hapus berkas foto
│   ├── audit.py         pencatat jejak tindakan penting
│   └── routers/         satu berkas per kelompok endpoint
├── alembic/             riwayat perubahan struktur tabel
├── uploads/             berkas foto bukti (tidak ikut Git)
├── seed.py              akun awal, item checklist, dan data contoh
└── requirements.txt
```

## Tabel

| Tabel | Isi |
| --- | --- |
| `users` | semua akun: super admin, admin, petugas |
| `logbook` | catatan aktivitas harian |
| `kendala` | laporan kendala dan statusnya |
| `lembur` | penugasan lembur, termasuk draf admin |
| `foto` | alamat berkas foto milik logbook atau kendala |
| `checklist_item` | daftar pemeriksaan per jabatan (data master) |
| `checklist_harian` | satu lembar checklist per petugas per hari |
| `checklist_jawaban` | jawaban tiap item, per sesi |
| `log_audit` | jejak hapus foto, buat/hapus akun, ubah status |

Yang **tidak** disimpan karena selalu dihitung ulang: nama hari, total jam
lembur, persentase kepatuhan, dan seluruh angka di kartu statistik. Dengan
begitu angkanya tidak pernah berbeda dengan data aslinya.

## Checklist harian

Isi checklist disimpan di database, bukan di kode, jadi daftar pemeriksaan
bisa diubah super admin saat SOP direvisi.

- **Dua bentuk.** `mode: "harian"` berarti satu status per hari (checklist
  OB/OG). `mode: "sesi"` berarti dicek Pagi, Siang, dan Sore (checklist
  Cleaning Service).
- **Isi awal.** `seed.py` memasukkan 15 item OB/OG dan 10 item Cleaning
  Service dari dokumen SOP. Security dan Messenger sengaja kosong; daftarnya
  ditambahkan lewat halaman Kelola Checklist setelah SOP-nya selesai. API
  mengembalikan daftar kosong, bukan galat.
- **Kolom paraf tidak dipakai.** Penggantinya akun yang login ditambah jam
  pengiriman, yang lebih sulit dipalsukan.
- **Alurnya** Draf → Dikirim. Lembar yang sudah dikirim terkunci; hanya admin
  yang bisa membukanya lagi lewat `POST /api/checklist/{id}/buka-kunci`.
- **Batas tanggal** diatur `CHECKLIST_MUNDUR_HARI` di `.env`. Bawaannya `1`,
  artinya boleh mengisi hari ini dan kemarin. Isi `0` bila wajib hari itu juga.
- **Item yang sudah pernah dijawab tidak bisa dihapus**, hanya dinonaktifkan,
  supaya checklist bulan lalu tetap utuh.

## Jabatan

`Security`, `OB`, `CS`, `Messenger`. Menambah jabatan baru perlu tiga langkah:
ubah `JABATAN` di `app/models.py`, `Jabatan` di `app/schemas.py`, lalu
`alembic revision --autogenerate` dan `alembic upgrade head`.
