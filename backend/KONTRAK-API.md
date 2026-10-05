# Kontrak API

Semua alamat diawali `/api`. Semua jawaban berbentuk JSON dengan nama field
**camelCase**, sama dengan tipe di `src/types/index.ts`.

Kecuali `POST /api/auth/masuk`, setiap permintaan wajib membawa token:

```
Authorization: Bearer <token>
```

Kalau gagal, jawabannya selalu berbentuk `{ "detail": "pesan dalam bahasa Indonesia" }`,
jadi pesannya bisa langsung ditampilkan ke pengguna.

## Daftar endpoint

### Auth
| Metode | Alamat | Hak akses | Keterangan |
| --- | --- | --- | --- |
| POST | `/auth/masuk` | semua | `{email, sandi}` → `{token, peran, akun}` |
| GET | `/auth/saya` | login | memulihkan sesi dari token → `{peran, akun}` |
| POST | `/auth/ganti-sandi` | login | `{sandiLama, sandiBaru}` |

### Petugas
| Metode | Alamat | Hak akses | Keterangan |
| --- | --- | --- | --- |
| GET | `/petugas?jabatan=` | login | daftar petugas (`Petugas[]`) |
| GET | `/petugas/{id}/detail` | admin | NIP/unit di `Petugas`; ini: bergabung, terakhir masuk, ringkasan bulan ini |
| PATCH | `/petugas/{id}` | admin | `{nama, jabatan, email, telepon, nip, unit, status}` → `Petugas` |

### Logbook
| Metode | Alamat | Hak akses | Keterangan |
| --- | --- | --- | --- |
| GET | `/logbook?tanggal=&dari=&sampai=&jabatan=&petugas_id=&cari=&batas=` | login | petugas hanya melihat miliknya; `cari` = potongan nama petugas |
| POST | `/logbook` | login | `{petugasId, tanggal, jam, keterangan, foto[]}` |

`foto` berisi data URL hasil kamera (`data:image/jpeg;base64,...`), maksimal 5 foto,
tiap foto maksimal 5 MB. Keterangan minimal 20 karakter. Petugas hanya boleh
mengisi `petugasId` dengan id akunnya sendiri (selain itu 403); admin boleh
mencatat atas nama petugas mana pun. Aturan yang sama berlaku untuk `/kendala`.

### Laporan kendala
| Metode | Alamat | Hak akses | Keterangan |
| --- | --- | --- | --- |
| GET | `/kendala?status=&tanggal=&dari=&sampai=&jabatan=&petugas_id=&penangan_id=&terbuka=&milik=&cari=&batas=` | login | lihat aturan di bawah |
| GET | `/kendala/{id}` | login | `Kendala` + `riwayat[]` |
| POST | `/kendala` | login | isian sama dengan logbook; penangan otomatis = pelapor |
| POST | `/kendala/{id}/mulai` | penangan / admin | Baru → Diproses |
| POST | `/kendala/{id}/selesai` | penangan / admin | `{keterangan, foto[]}` → Selesai |
| PATCH | `/kendala/{id}/penangan` | admin | `{penanganId}` petugas berstatus Aktif; tidak untuk kendala Selesai |
| POST | `/kendala/{id}/buka-lagi` | admin | `{alasan}` wajib; Selesai → Diproses |
| PATCH | `/kendala/{id}/status` | admin | `{status: "Diproses"}` hanya dari Baru |

**Siapa melihat apa.** Admin melihat semua. Petugas hanya menerima kendala yang
ia laporkan (`petugasId`/pengirim = dia) atau yang **penangannya** dia; laporan
lain ditolak 403 di `GET /kendala/{id}`.

Saringan tambahan: `terbuka=true` = belum Selesai (`false` = hanya Selesai);
`milik=dilaporkan` / `milik=ditangani` relatif terhadap akun yang sedang masuk
(dipakai petugas untuk memisahkan "kendala saya" dan "perlu saya tangani");
`penangan_id` untuk admin; `cari` = potongan nama pelapor; `berubah_sejak=YYYY-MM-DD`
= hanya yang diperbarui (ditugaskan/diproses/selesai/dibuka lagi) sejak tanggal itu,
diurutkan dari perubahan terbaru (dipakai lonceng notifikasi).

**Penangan.** Saat dibuat, penangan = pelapor. Admin bisa mengalihkannya ke
petugas lain (`/penangan`). Petugas hanya bisa `/mulai` dan `/selesai` pada
kendala yang penangannya dia sendiri (selain itu 403 "Kendala ini tidak
ditugaskan kepada Anda.").

**Selesai.** Petugas: hanya dari Diproses, wajib 1–5 foto sesudah (data URL dari
kamera, aturan sama dengan foto laporan) dan keterangan penyelesaian. Admin:
boleh dari Baru maupun Diproses (mis. dikerjakan vendor), foto tidak wajib,
keterangan tetap wajib. `PATCH /status` tidak menerima Selesai.

**Buka lagi.** Waktu dan keterangan selesai dikosongkan; foto sesudah yang lama
tetap disimpan sebagai jejak (foto sesudah berikutnya ditambahkan).

Bentuk `Kendala` (selain field lama `nama`, `jabatan`, `fotoProfil` = pelapor):

```ts
pelaporId: number
fotoUrl: string[]        // = fotoSebelum, untuk halaman lama
fotoSebelum: string[]
fotoSesudah: string[]
penangan: { id, nama, jabatan, fotoProfil } | null   // null bila akunnya dihapus
ditugaskanPada, mulaiPada, selesaiPada, dibukaLagiPada, diperbaruiPada: string | null  // '15 Sep 2026 · 10.24'
diselesaikanOleh: string | null   // nama
diselesaikanOlehId: number | null // = penangan.id berarti diselesaikan petugas, bukan admin
keteranganSelesai: string | null
// hanya di GET /kendala/{id}:
riwayat: { waktu, jenis, kejadian, oleh, catatan }[]
// jenis: 'dilaporkan' | 'ditugaskan' | 'mulai' | 'selesai' | 'dibuka_lagi' | 'status'
```

**Notifikasi push kendala.** Admin: laporan baru, kendala ditandai selesai oleh
petugas (tautan `laporan-petugas?tab=kendala`). Petugas: ditugaskan kepadanya,
kendala yang ia tangani/laporkan dibuka lagi, laporannya diproses/selesai oleh
orang lain (tautan `catatan-harian?jenis=kendala`).

Riwayat disusun dari `log_audit` (aksi `kendala_*` dan `ubah_status_kendala`).
`catatan` berisi keterangan penyelesaian atau alasan buka lagi. Kendala dari
sebelum fitur ini hanya punya kejadian "Dilaporkan" dan perubahan status lama.

### Lembur
| Metode | Alamat | Hak akses | Keterangan |
| --- | --- | --- | --- |
| GET | `/lembur?dari=&sampai=&jabatan=` | login | admin: semua; petugas: miliknya |
| POST | `/lembur/{id}/terima` | petugas | |
| POST | `/lembur/{id}/tolak` | petugas | `{alasan}` minimal 5 karakter |
| GET | `/lembur/draf` | admin | antrean draf |
| POST | `/lembur/draf` | admin | `{petugasId, jabatan, tanggal, mulai, selesai, keterangan}`; lama lembur maks. `MAKS_JAM_LEMBUR` jam (bawaan 12), selesai < mulai = lewat tengah malam |
| PUT | `/lembur/draf/{id}` | admin | |
| DELETE | `/lembur/draf/{id}` | admin | |
| POST | `/lembur/draf/{id}/kirim` | admin | draf → Menunggu; tarif per jam saat itu dikunci ke penugasan |
| PUT | `/lembur/{id}/jam-aktual` | admin | `{mulai, selesai}` jam yang benar-benar dikerjakan (null keduanya = kembali ke rencana); ditolak bila sudah dibayar |
| POST | `/lembur/{id}/bayar` | admin | tandai dibayar; hanya Diterima yang tanggalnya sudah lewat |
| DELETE | `/lembur/{id}/bayar` | admin | batalkan tanda bayar |
| GET | `/pengaturan/tarif-lembur` | login | `{tarifPerJam, diubahPada, diubahOleh}` |
| PUT | `/pengaturan/tarif-lembur` | admin | `{tarifPerJam}` Rp1.000–Rp1.000.000; dicatat di log audit |

Status `Selesai` tidak disimpan di database. Penugasan berstatus Diterima yang
tanggalnya sudah lewat otomatis tampil sebagai Selesai.

Setiap penugasan terkirim membawa `tarifPerJam` dan `upah` (tarif × lama
lembur, rupiah). Mengubah tarif tidak mengubah penugasan yang sudah terkirim.
Bila admin mengoreksi jam aktual (`rentangAktual`), `total`, `upah`, rekap, dan
jam lembur di logbook dihitung dari jam aktual itu. `dibayarPada` kosong =
belum dibayar. Rekap per petugas (`/statistik/rekap`) membawa `upah` dan
`upahDibayar`.

### Checklist harian
| Metode | Alamat | Hak akses | Keterangan |
| --- | --- | --- | --- |
| GET | `/checklist/item?jabatan=&semua=` | login | daftar pemeriksaan per jabatan |
| POST | `/checklist/item` | super admin | tambah item |
| PUT | `/checklist/item/{id}` | super admin | ubah item |
| PUT | `/checklist/item/urutan/{jabatan}` | super admin | `{ids: [...]}` urutan dari atas |
| DELETE | `/checklist/item/{id}` | super admin | dihapus bila belum dipakai, kalau sudah hanya dinonaktifkan |
| GET | `/checklist/lembar?petugas_id=&tanggal=` | login | lembar + item + jawaban |
| PUT | `/checklist/lembar` | login | simpan seluruh lembar; `kirim: true` untuk mengunci |
| GET | `/checklist?tanggal=&jabatan=` | admin | satu baris per petugas |
| POST | `/checklist/{id}/buka-kunci` | admin | Dikirim → Draf |

### Statistik
| Metode | Alamat | Hak akses | Keterangan |
| --- | --- | --- | --- |
| GET | `/statistik/tujuh-hari` | login | bagan batang; petugas otomatis hanya datanya sendiri |
| GET | `/statistik/sebaran-jabatan` | admin | bagan donat |
| GET | `/statistik/rekap?dari=&sampai=&jabatan=` | admin | rekap per petugas; `hari` = hari yang punya logbook **atau** laporan kendala |

### Arsip foto (super admin)
| Metode | Alamat | Keterangan |
| --- | --- | --- |
| GET | `/foto?sumber=&jabatan=&batas=` | daftar arsip; tiap foto membawa `tahap: "sebelum" \| "sesudah"` (sesudah = bukti kendala selesai) |
| GET | `/foto/statistik` | total, ukuran, jumlah lebih dari 6 bulan |
| POST | `/foto/hapus` | `{ids: [...]}` |
| POST | `/foto/hapus-sebelum` | `{tanggal, konfirmasi: "HAPUS"}`; minimal 30 hari lalu |

### Kelola akun (super admin)
| Metode | Alamat | Keterangan |
| --- | --- | --- |
| GET | `/akun/admin` | daftar akun admin |
| POST | `/akun` | `{jenis: "admin"\|"user", nama, jabatan, nip, email, unit, telepon}` → sandi sementara |
| PATCH | `/akun/{id}/status` | `{status: "Aktif"\|"Cuti"\|"Nonaktif"}` |
| POST | `/akun/{id}/reset-sandi` | → sandi sementara baru |
| DELETE | `/akun/{id}` | permanen, data dan fotonya ikut terhapus |

### Jadwal shift
| Metode | Alamat | Hak akses | Keterangan |
| --- | --- | --- | --- |
| GET | `/shift/jenis?jabatan=&semua=` | admin | `Shift[]`; Libur selalu ikut; `semua=true` ikut yang nonaktif |
| POST | `/shift/jenis` | admin | `{nama, kode, mulai, selesai, jabatan[], warna, aktif}` |
| PUT | `/shift/jenis/{id}` | admin | isian sama; Libur tidak bisa diubah |
| POST | `/shift/jenis/{id}/aktif` | admin | `{aktif}` |
| DELETE | `/shift/jenis/{id}` | admin | hanya bila belum pernah dipakai (`dipakai: false`) |
| GET | `/shift/jadwal?dari=&sampai=&jabatan=&cari=` | admin | `{dari, sampai, petugas[], kotak[]}`; maks. 62 hari |
| PUT | `/shift/jadwal` | admin | `{petugasId, tanggal, shiftId}`; `shiftId: null` = kosongkan |
| POST | `/shift/jadwal/massal` | admin | `{petugasIds[], dari, sampai, shiftId, timpa}` → `{diisi, dilewati, tukarDibatalkan}` |
| POST | `/shift/jadwal/salin` | admin | `{mode: "minggu"\|"bulan", dari, sampai, jabatan, timpa}` |
| GET | `/shift/saya?dari=&sampai=` | petugas | satu baris per hari (shift kosong = belum dijadwalkan); bawaan hari ini + 6 hari |
| GET | `/shift/rekan?tanggal=` | petugas | rekan satu jabatan + shift mereka di tanggal itu |
| GET | `/shift/rekan/{id}/jadwal?dari=&sampai=` | petugas | jadwal seorang rekan; bawaan hari ini + 13 hari |
| POST | `/shift/tukar` | petugas | `{tanggalSaya, rekanId, tanggalRekan, alasan}` |
| POST | `/shift/tukar/{id}/jawab` | rekan | `{setuju, alasan}` |
| POST | `/shift/tukar/{id}/putuskan` | admin | `{setuju, alasan}`; tolak wajib alasan; setuju = jadwal langsung ditukar |
| POST | `/shift/tukar/{id}/batal` | pengaju | selama masih Menunggu Rekan / Menunggu Admin |
| GET | `/shift/tukar?status=&batas=` | admin | terbaru lebih dulu |
| GET | `/shift/tukar/saya` | petugas | yang saya ajukan dan yang ditujukan ke saya (`peranSaya`) |

Tanggal jadwal = tanggal shift **dimulai**: Malam 6 Okt 23.00 – 7 Okt 07.00
tercatat 6 Okt. `selesai < mulai` = lintas hari (`lintasHari`), `selesai = mulai`
= 24 jam (`duaPuluhEmpatJam`). Satu petugas hanya punya satu kotak per tanggal,
dan shift yang diberikan harus berlaku untuk jabatannya (Libur berlaku untuk semua).

`massal` dan `salin` dengan `timpa: false` dijawab **409** bila ada kotak berisi
shift lain yang akan tertimpa. Tampilkan pesannya sebagai konfirmasi, lalu kirim
ulang dengan `timpa: true`. Salin minggu mengambil 7 hari sebelumnya; salin bulan
mengambil tanggal yang sama di bulan sebelumnya (tanggal yang tidak ada dilewati).
Shift sumber yang nonaktif atau tidak cocok jabatan dilewati (`dilewati`).

Tukar shift: status `Menunggu Rekan` → `Menunggu Admin` → `Disetujui` / `Ditolak`,
atau `Dibatalkan`. Saat disetujui, kotak kedua petugas ditukar pada tanggal
pemohon **dan** tanggal rekan (satu tanggal bila sama), lalu kotaknya diberi tanda
`tukar: true` (⇄). Tanggal yang sudah lewat tidak bisa diajukan atau disetujui.
Kotak yang ikut permintaan berjalan bertanda `diajukanTukar: true` dan tidak bisa
diajukan lagi; bila admin mengubah kotak itu, permintaannya otomatis dibatalkan
(`catatanBatal: "Jadwal diubah admin"`).

---

## Tipe TypeScript untuk checklist

Tempel ke `src/types/index.ts`:

```ts
export type Sesi = 'Harian' | 'Pagi' | 'Siang' | 'Sore'
export type ModeChecklist = 'harian' | 'sesi'

/** Satu baris pemeriksaan pada SOP. */
export interface ChecklistItem {
  id: number
  jabatan: Jabatan
  urutan: number
  teks: string
  /** 'harian' = satu kotak per hari; 'sesi' = kotak Pagi, Siang, Sore */
  mode: ModeChecklist
  aktif: boolean
}

export interface ChecklistJawaban {
  itemId: number
  sesi: Sesi
  status: 'Ya' | 'Tidak'
  catatan: string
}

/** Lembar checklist satu petugas pada satu tanggal. */
export interface ChecklistLembar {
  /** null bila petugas belum pernah menyimpan apa pun pada tanggal itu */
  id: number | null
  petugasId: number
  nama: string
  jabatan: Jabatan
  tanggal: string
  tanggalIso: string
  hari: string
  status: 'Draf' | 'Dikirim'
  dikirimPada: string | null
  /** false bila sudah dikirim atau tanggalnya di luar batas pengisian */
  bisaDiisi: boolean
  item: ChecklistItem[]
  jawaban: ChecklistJawaban[]
  totalKotak: number
  terisi: number
  /** jumlah kotak yang dijawab 'Tidak' */
  tidak: number
  persen: number
}

/** Satu baris tabel checklist di halaman admin. */
export interface ChecklistRingkas {
  id: number | null
  petugasId: number
  nama: string
  jabatan: Jabatan
  tanggal: string
  tanggalIso: string
  status: 'Draf' | 'Dikirim' | 'Belum diisi'
  totalKotak: number
  terisi: number
  tidak: number
  persen: number
  dikirimPada: string | null
}
```

## Contoh pemakaian di frontend

```ts
// Membuka lembar hari ini milik petugas yang sedang login
const lembar = await api<ChecklistLembar>('/api/checklist/lembar')

// Menyimpan sebagai draf (jawaban dikirim utuh, bukan per kotak)
await api<ChecklistLembar>('/api/checklist/lembar', 'PUT', {
  petugasId: lembar.petugasId,
  tanggal: lembar.tanggalIso,
  jawaban: [
    { itemId: 1, sesi: 'Harian', status: 'Ya' },
    { itemId: 2, sesi: 'Harian', status: 'Tidak', catatan: 'Dispenser lantai 2 bocor.' },
  ],
})

// Mengunci lembar: semua kotak harus sudah terisi
await api<ChecklistLembar>('/api/checklist/lembar', 'PUT', { ...isi, kirim: true })
```

Catatan untuk halaman petugas:

- Kirim **seluruh** jawaban setiap kali menyimpan. Jawaban lama ditimpa.
- Item `mode: 'sesi'` perlu tiga jawaban: Pagi, Siang, Sore.
- Kalau `item` kosong, tampilkan pesan "Checklist untuk jabatan ini belum
  disusun" — ini kondisi normal untuk Security dan Messenger sekarang.
- Kalau `bisaDiisi` bernilai false, tampilkan lembar dalam keadaan hanya baca.
