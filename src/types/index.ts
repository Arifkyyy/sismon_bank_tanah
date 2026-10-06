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
  /** alasan kejanggalan dari sistem, mis. 'Di luar jam shift'; hanya terisi untuk admin */
  tanda?: string[]
}

/** Pelapor/penangan kendala dalam bentuk ringkas. */
export interface OrangKendala {
  id: number
  nama: string
  jabatan?: Jabatan | null
  fotoProfil?: string | null
}

/** `nama`, `jabatan`, `fotoProfil` = pelapor. */
export interface Kendala {
  id?: number
  pelaporId?: number
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
  /** = fotoSebelum; dipertahankan untuk halaman lama */
  fotoUrl?: string[]
  /** foto saat dilaporkan */
  fotoSebelum?: string[]
  /** bukti setelah diperbaiki */
  fotoSesudah?: string[]
  /** petugas yang bertugas memperbaiki; null bila akunnya sudah dihapus */
  penangan?: OrangKendala | null
  /** semua waktu berbentuk '15 Sep 2026 · 10.24' */
  ditugaskanPada?: string | null
  mulaiPada?: string | null
  selesaiPada?: string | null
  /** nama yang menandai selesai */
  diselesaikanOleh?: string | null
  diselesaikanOlehId?: number | null
  keteranganSelesai?: string | null
  dibukaLagiPada?: string | null
  /** kapan terakhir ada perubahan (status/penangan) */
  diperbaruiPada?: string | null
  /** alasan kejanggalan dari sistem, mis. 'Dikirim terlambat'; hanya terisi untuk admin */
  tanda?: string[]
}

export type JenisRiwayatKendala = 'dilaporkan' | 'ditugaskan' | 'mulai' | 'selesai' | 'dibuka_lagi' | 'status'

export interface RiwayatKendala {
  waktu: string
  jenis: JenisRiwayatKendala
  /** kalimat siap tampil, mis. 'Ditugaskan ke Andi' */
  kejadian: string
  oleh?: string | null
  /** keterangan penyelesaian / alasan buka lagi */
  catatan?: string | null
}

/** GET /api/kendala/{id} */
export interface DetailKendala extends Kendala {
  riwayat: RiwayatKendala[]
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
  /** untuk ditampilkan, mis. '3 jam 30 menit' */
  total: string
  /** lama lembur dalam menit — pakai ini untuk menjumlahkan, bukan `total` */
  menit: number
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
  /** tarif per jam (rupiah) yang dikunci saat penugasan dikirim */
  tarifPerJam?: number | null
  /** tarif × lama lembur, dalam rupiah */
  upah?: number | null
  /** jam yang benar-benar dikerjakan bila dikoreksi admin, mis. '18.00 – 21.30';
   *  bila ada, `total` dan `upah` sudah dihitung dari jam ini */
  rentangAktual?: string | null
  /** jam aktual dalam format input ('18:00'), untuk mengisi formulir koreksi */
  mulaiAktual?: string | null
  selesaiAktual?: string | null
  /** kapan admin menandai dibayar; kosong = belum dibayar */
  dibayarPada?: string | null
  dibayarOleh?: string | null
}

/** Tarif lembur yang berlaku sekarang; diubah admin di Pengajuan lembur. */
export interface TarifLembur {
  tarifPerJam: number
  /** kapan terakhir diubah, mis. '29 Sep 2026 · 10.24'; kosong = belum pernah */
  diubahPada?: string | null
  diubahOleh?: string | null
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
  /** uang lembur (rupiah) dari penugasan yang diterima dalam periode */
  upah: number
  upahDibayar: number
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
  /** 'sesudah' = bukti kendala selesai diperbaiki */
  tahap?: 'sebelum' | 'sesudah'
  url: string
  ukuranByte: number
}

/** Ringkasan penyimpanan foto — GET /api/foto/statistik. */
export interface StatistikFoto {
  total: number
  ukuranByte: number
  lebihEnamBulan: number
}

/* ------------------------------------------------------------ Jadwal shift */

/** Nama warna shift; kelas Tailwind-nya di src/lib/shift.ts. */
export type WarnaShift = 'hijau' | 'hijau-tua' | 'emas' | 'tanah' | 'ink' | 'abu'

/** Jenis shift — GET /api/shift/jenis. Libur: `sistem: true`, tanpa jam. */
export interface Shift {
  id: number
  nama: string
  /** 1–2 huruf, tampil di kotak jadwal */
  kode: string
  /** '07:00' untuk isian form; kosong untuk Libur */
  mulai?: string | null
  selesai?: string | null
  /** '07.00 – 15.00' untuk tampilan; kosong untuk Libur */
  rentang?: string | null
  /** jam selesai < jam mulai, mis. Malam 23.00 – 07.00 */
  lintasHari: boolean
  /** jam selesai = jam mulai */
  duaPuluhEmpatJam: boolean
  jabatan: Jabatan[]
  warna: WarnaShift
  aktif: boolean
  sistem: boolean
  /** sudah dipakai jadwal/tukar: tidak bisa dihapus, hanya dinonaktifkan */
  dipakai: boolean
}

export type StatusTukar = 'Menunggu Rekan' | 'Menunggu Admin' | 'Disetujui' | 'Ditolak' | 'Dibatalkan'

/** Petugas di tabel jadwal admin. */
export interface PetugasJadwal {
  id: number
  nama: string
  jabatan: Jabatan
  status: Status
  fotoProfil?: string | null
}

/** Satu kotak terisi di tabel jadwal admin. */
export interface KotakJadwal {
  petugasId: number
  /** ISO '2026-10-06' */
  tanggal: string
  shiftId: number
  /** hasil tukar shift (tanda ⇄) */
  tukar: boolean
  /** ikut permintaan tukar yang masih berjalan */
  diajukanTukar: boolean
}

/** GET /api/shift/jadwal */
export interface JadwalPeriode {
  dari: string
  sampai: string
  petugas: PetugasJadwal[]
  kotak: KotakJadwal[]
}

/** Satu hari di Jadwal Saya — GET /api/shift/saya. Shift kosong = belum dijadwalkan. */
export interface JadwalSaya {
  tanggal: string
  tanggalTeks: string
  hari: string
  shift?: Shift | null
  tukar: boolean
  diajukanTukar: boolean
  diubahPada?: string | null
  diaturOleh?: string | null
}

/** Rekan satu jabatan dan shiftnya di suatu tanggal — GET /api/shift/rekan. */
export interface RekanShift {
  id: number
  nama: string
  status: Status
  fotoProfil?: string | null
  shift?: Shift | null
  diajukanTukar: boolean
}

/** Satu hari jadwal rekan — GET /api/shift/rekan/{id}/jadwal. */
export interface HariRekan {
  tanggal: string
  tanggalTeks: string
  hari: string
  shift?: Shift | null
  diajukanTukar: boolean
}

export interface PihakTukar {
  id: number
  nama: string
  fotoProfil?: string | null
  tanggal: string
  tanggalTeks: string
  hari: string
  shift: Shift
}

/** Permintaan tukar shift — GET /api/shift/tukar dan /tukar/saya. */
export interface TukarShift {
  id: number
  status: StatusTukar
  jabatan: Jabatan
  pemohon: PihakTukar
  rekan: PihakTukar
  alasan: string
  alasanTolak?: string | null
  ditolakOleh?: 'rekan' | 'admin' | null
  catatanBatal?: string | null
  dibuatPada: string
  dijawabRekanPada?: string | null
  diputusPada?: string | null
  diputusOleh?: string | null
  diperbaruiPada: string
  /** hanya di /tukar/saya */
  peranSaya?: 'pemohon' | 'rekan' | null
}

/** Hasil isi massal / salin periode. */
export interface HasilMassal {
  diisi: number
  dilewati: number
  tukarDibatalkan: number
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
