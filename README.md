# Sistem Monitoring Petugas — Badan Bank Tanah

Aplikasi web untuk memantau logbook harian, laporan kendala, dan lembur petugas
**Security**, **Office Boy**, **Customer Service**, dan **Messenger**.

Dibangun dengan **React 18 + TypeScript + Vite + Tailwind CSS**.

---

## Cara menjalankan

Butuh Node.js versi 18 atau lebih baru.

```bash
npm install     # pasang semua paket (sekali saja)
npm run dev     # jalankan di http://localhost:5173
```

Perintah lain:

```bash
npm run build     # bangun versi produksi ke folder dist/
npm run preview   # lihat hasil build
npm run lint      # periksa kesalahan TypeScript
```

## Cara mencoba tiap peran

Di halaman login ada tiga tombol pratinjau: **Super Admin**, **Admin**, dan
**Petugas**. Ada juga bar melayang di bawah layar untuk berpindah peran cepat
tanpa login ulang.

> Bar melayang itu komponen `src/components/PreviewBar.tsx`. **Hapus baris
> `<PreviewBar />` di `src/App.tsx`** sebelum aplikasi dipakai sungguhan —
> di produksi peran ditentukan hasil login, bukan tombol.

## Halaman yang tersedia

| Peran | Halaman |
| --- | --- |
| **Admin** | Dashboard, Data user, Log aktivitas, Rekapitulasi, Laporan kendala, Pengajuan lembur, Profil |
| **Super Admin** | Semua halaman admin + Kelola akun (tambah/hapus admin & petugas) + Hapus data foto |
| **Petugas** | Dashboard, Logbook, Rekap harian, Laporan kendala, Lembur, Profil |

Ada juga halaman **Sistem desain** (`/admin/sistem-desain`) berisi palet warna,
skala huruf, dan komponen — berguna sebagai rujukan saat menambah halaman baru.

## Susunan folder

```
src/
├── components/     komponen yang dipakai berulang
│   ├── ui.tsx          tombol, kartu, tabel, pil status, input
│   ├── Sidebar.tsx     sidebar + penanda menu yang meluncur
│   ├── AppLayout.tsx   rangka aplikasi (sidebar + topbar + isi)
│   ├── StatCard.tsx    kartu statistik
│   ├── Bagan.tsx       bagan batang & donat
│   ├── Linimasa.tsx    daftar kejadian berurutan
│   ├── Kamera.tsx      bingkai ambil foto
│   └── PreviewBar.tsx  bar pindah peran (hapus di produksi)
├── config/menu.ts  daftar menu & judul halaman tiap peran
├── context/        AuthContext — menyimpan peran yang sedang masuk
├── data/mock.ts    SELURUH data contoh ada di sini
├── lib/            ikon SVG dan fungsi bantu
├── pages/          satu berkas per halaman
└── types/          tipe TypeScript bersama
```

## Menyambungkan ke backend

Semua data contoh terkumpul di satu berkas: **`src/data/mock.ts`**.
Ganti isinya dengan pemanggilan API — komponennya tidak perlu diubah karena
tipe datanya sudah dikunci di `src/types/index.ts`.

Untuk login sungguhan, ubah fungsi `masuk` di `src/context/AuthContext.tsx`
supaya memanggil API dan menyimpan token.

## Catatan penting soal foto

Di halaman **Logbook** dan **Laporan kendala** tidak ada tombol unggah dari
galeri, dan ini disengaja: foto bukti harus diambil saat itu juga.

Komponen `src/components/Kamera.tsx` saat ini masih berupa bingkai tampilan.
Untuk membuatnya berfungsi, ganti isi bingkai dengan elemen `<video>`:

```ts
const stream = await navigator.mediaDevices.getUserMedia({
  video: { facingMode: 'user' },
})
```

lalu gambar frame-nya ke `<canvas>` saat tombol rana ditekan, dan tempelkan cap
waktu serta lokasi sebelum dikirim ke server.

## Warna dan huruf

Palet diambil dari logo Badan Bank Tanah, didaftarkan di `tailwind.config.ts`:

| Token Tailwind | Nilai | Dipakai untuk |
| --- | --- | --- |
| `sidebar-atas` → `sidebar-bawah` | `#09381A` → `#1A9E48` | gradasi sidebar |
| `ink` | `#0B3747` | judul, teks utama |
| `hijau` | `#10874C` | tombol utama, status aman |
| `emas` | `#F2BE26` | menunggu jawaban, jam lembur |
| `tanah` | `#DE7B2C` | laporan kendala |
| `merah` | `#C4443B` | **hanya** tindakan menghapus |
| `kertas` | `#F1F5F2` | latar halaman & penanda menu aktif |

Huruf: **Plus Jakarta Sans** untuk seluruh isi, **Inter** untuk kop sidebar
(`font-inter`). Keduanya dimuat dari Google Fonts di `index.html`.

## Cara kerja penanda menu yang meluncur

Ada di `src/components/Sidebar.tsx`. Ringkasnya:

1. Posisi menu aktif diukur dengan `getBoundingClientRect()`, lalu penandanya
   digeser memakai `transform: translateY(...)` — bukan `top`, supaya
   animasinya diproses kartu grafis dan tetap mulus di HP kelas bawah.
2. Warnanya sama persis dengan latar halaman (`bg-kertas`), jadi terlihat
   seperti halaman yang "menggigit" masuk ke sidebar.
3. Dua sudut cekungnya digambar dengan `radial-gradient` di kelas
   `.penanda-menu` (`src/index.css`), karena Tailwind tidak punya utilitas
   untuk sudut cekung.
4. Sidebar sengaja **tanpa bayangan ke kanan**. Bayangan akan menggelapkan
   halaman di sebelahnya tapi tidak mengenai bagian cekungnya, sehingga
   cekungan terlihat berbeda warna.
