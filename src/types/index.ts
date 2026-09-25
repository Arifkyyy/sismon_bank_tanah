/** Empat jabatan petugas lapangan yang dipantau sistem ini. */
export type Jabatan = 'Security' | 'OB' | 'CS' | 'Messenger'

/** Peran akun di dalam sistem. */
export type Peran = 'superadmin' | 'admin' | 'user'

/** Semua status yang bisa muncul sebagai pil berwarna. */
export type Status =
  | 'Aktif'
  | 'Cuti'
  | 'Nonaktif'
  | 'Baru'
  | 'Diproses'
  | 'Selesai'
  | 'Menunggu'
  | 'Diterima'
  | 'Ditolak'

export interface Akun {
  /** id baris di basis data backend */
  id: number
  nama: string
  peran: string
  email: string
  inisial: string
  nip: string
  unit: string
  telepon?: string
  /** tanggal bergabung siap tampil, mis. '19 Juli 2021' */
  bergabung?: string
  /** true untuk super admin — avatarnya pakai gradasi emas */
  emas?: boolean
  /** URL foto profil; kosong berarti avatar memakai inisial */
  foto?: string | null
}

export interface Petugas {
  /** id baris di basis data backend */
  id: number
  nama: string
  jabatan: Jabatan
  /** URL foto profil petugas; kosong berarti avatar memakai inisial */
  fotoProfil?: string | null
  email: string
  telepon: string
  status: Status
  /** nomor induk pegawai */
  nip?: string
  /** unit/pos tugas, mis. 'Pos Utama — Gedung A' */
  unit?: string
}

/** Isi popup Lihat detail di Data user — hal yang tidak tampil di tabel. */
export interface DetailPetugas {
  /** mis. '19 Jul 2021' */
  bergabung: string
  terakhirMasuk?: string | null
  /** waktu logbook terakhir, mis. '24 Sep 2026 · 07.02' */
  aktivitasTerakhir?: string | null
  logbookBulanIni: number
  kendalaBulanIni: number
  /** kendala berstatus Baru/Diproses, dari bulan mana pun */
  kendalaTerbuka: number
  /** lembur yang diterima bulan ini, mis. '3 jam 30 menit', atau '—' */
  lemburBulanIni: string
}

/** Satu baris logbook. */
export interface Logbook {
  /** id baris di backend; belum ada selama draf masih di layar */
  id?: number
  nama: string
  jabatan: Jabatan
  /** URL foto profil petugas; kosong berarti avatar memakai inisial */
  fotoProfil?: string | null
  tanggal: string
  /** tanggal yang sama dalam ISO '2026-09-15' */
  tanggalIso?: string
  hari: string
  jam: string
  keterangan: string
  /** varian warna placeholder foto — dipakai saat foto aslinya belum dimuat */
  foto: 'a' | 'b' | 'c'
  /** foto asli hasil kamera (data URL); mengalahkan `foto` bila ada isinya */
  fotoUrl?: string[]
  /** '—' bila tidak ada lembur */
  lembur: string
}

export interface Kendala {
  id?: number
  nama: string
  jabatan: Jabatan
  /** URL foto profil petugas; kosong berarti avatar memakai inisial */
  fotoProfil?: string | null
  tanggal: string
  tanggalIso?: string
  hari: string
  jam: string
  keterangan: string
  status: Status
  foto: 'a' | 'b' | 'c'
  /** foto asli hasil kamera (data URL); mengalahkan `foto` bila ada isinya */
  fotoUrl?: string[]
  /** kapan admin terakhir mengubah statusnya, mis. '15 Sep 2026 · 10.24' */
  diperbaruiPada?: string | null
}

export interface Lembur {
  /** penanda tetap satu penugasan — dipakai saat petugas menjawab */
  id: string
  nama: string
  jabatan: Jabatan
  /** URL foto profil petugas; kosong berarti avatar memakai inisial */
  fotoProfil?: string | null
  /** untuk ditampilkan, mis. '16 Sep 2026' */
  tanggal: string
  /** tanggal yang sama dalam ISO '2026-09-16' — dipakai penyaring periode */
  tanggalIso: string
  /** contoh: '18.00 – 22.00' */
  rentang: string
  total: string
  keterangan: string
  status: Status
  /** wajib diisi petugas saat menolak; ikut terlihat oleh admin */
  alasan?: string
  /** kapan petugas menjawab, mis. '15 Sep 2026 · 10.24' */
  dijawabPada?: string
  /** kapan admin mengirim penugasan ini, mis. '14 Sep 2026 · 16.05' */
  dikirimPada?: string | null
  /** nama admin yang membuat penugasan */
  dibuatOleh?: string | null
  pembuatPeran?: 'admin' | 'superadmin' | null
  /** unit kerja pembuat, mis. 'Bagian Pengelolaan Gedung' */
  pembuatUnit?: string | null
  pembuatFoto?: string | null
}

/**
 * Penugasan lembur yang sudah disusun admin tapi belum dikirim ke petugas.
 * Tanggal dan jam masih dalam format input ('2026-09-16', '18:00') supaya
 * bisa dibuka lagi di formulir saat admin mengoreksi.
 */
export interface DrafLembur {
  id: string
  /** boleh kosong selama masih draf */
  nama: string
  jabatan: Jabatan
  /** URL foto profil petugas; kosong berarti avatar memakai inisial */
  fotoProfil?: string | null
  /** ISO, mis. '2026-09-16' */
  tanggal: string
  /** 'HH:MM' */
  mulai: string
  /** 'HH:MM' */
  selesai: string
  keterangan: string
}

export interface ItemMenu {
  id: string
  label: string
  /** path relatif terhadap layout peran */
  path: string
  ikon: string
  /** angka notifikasi kecil di kanan menu */
  tanda?: string
}

export interface GrupMenu {
  judul: string
  item: ItemMenu[]
}

/* ------------------------------------------------- Bentuk data dari backend */

/** Satu baris rekapitulasi per petugas — GET /api/statistik/rekap. */
export interface RekapPetugas {
  petugasId: number
  nama: string
  jabatan: Jabatan
  /** URL foto profil petugas; kosong berarti avatar memakai inisial */
  fotoProfil?: string | null
  hari: number
  logbook: number
  kendala: number
  /** sudah berupa teks, mis. '12 jam' */
  lembur: string
  /** sudah berupa persen, mis. '93%' */
  patuh: string
  /** lembar checklist terkirim, mis. '12/14 hari' */
  checklist: string
}

/** Satu batang pada bagan tujuh hari — GET /api/statistik/tujuh-hari. */
export interface HariBagan {
  hari: string
  logbook: number
  lembur: number
}

/** Satu irisan donat sebaran jabatan — GET /api/statistik/sebaran-jabatan. */
export interface SebaranJabatan {
  /** nama panjang jabatan, mis. 'Customer Service' */
  label: string
  nilai: number
}

/** Satu foto di arsip — GET /api/foto. */
export interface FotoArsip {
  id: number
  nama: string
  jabatan: Jabatan
  waktu: string
  waktuIso: string
  sumber: 'Logbook' | 'Kendala'
  url: string
  ukuranByte: number
}

/** Ringkasan penyimpanan foto — GET /api/foto/statistik. */
export interface StatistikFoto {
  total: number
  ukuranByte: number
  lebihEnamBulan: number
}

/** Satu baris daftar akun admin — GET /api/akun/admin. */
export interface AkunAdmin {
  id: number
  nama: string
  email: string
  /** kapan terakhir masuk, sudah berupa teks */
  masuk: string
  status: Status
  fotoProfil?: string | null
}

/* --------------------------------------------------------- Kerja wajib */

export type Sesi = 'Harian' | 'Pagi' | 'Siang' | 'Sore'
/** 'harian' = satu kotak per hari; 'sesi' = kotak Pagi, Siang, Sore */
export type ModeChecklist = 'harian' | 'sesi'

/** Satu baris pemeriksaan pada SOP jabatan. */
export interface ChecklistItem {
  id: number
  jabatan: Jabatan
  urutan: number
  teks: string
  mode: ModeChecklist
  aktif: boolean
}

export interface ChecklistJawaban {
  itemId: number
  sesi: Sesi
  status: 'Ya' | 'Tidak'
  catatan: string
}

/** Lembar kerja wajib satu petugas pada satu tanggal. */
export interface ChecklistLembar {
  /** null bila petugas belum pernah menyimpan apa pun pada tanggal itu */
  id: number | null
  petugasId: number
  nama: string
  jabatan: Jabatan
  /** URL foto profil petugas; kosong berarti avatar memakai inisial */
  fotoProfil?: string | null
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

/** Satu baris tabel Kerja wajib petugas di halaman admin. */
export interface ChecklistRingkas {
  id: number | null
  petugasId: number
  nama: string
  jabatan: Jabatan
  /** URL foto profil petugas; kosong berarti avatar memakai inisial */
  fotoProfil?: string | null
  tanggal: string
  tanggalIso: string
  status: 'Draf' | 'Dikirim' | 'Belum diisi'
  totalKotak: number
  terisi: number
  tidak: number
  persen: number
  dikirimPada: string | null
}
