/** Tiga jabatan petugas lapangan yang dipantau sistem ini. */
export type Jabatan = 'Security' | 'OB' | 'CS'

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
  nama: string
  peran: string
  email: string
  inisial: string
  nip: string
  unit: string
  /** true untuk super admin — avatarnya pakai gradasi emas */
  emas?: boolean
}

export interface Petugas {
  nama: string
  jabatan: Jabatan
  email: string
  telepon: string
  status: Status
}

/** Satu baris logbook. */
export interface Logbook {
  nama: string
  jabatan: Jabatan
  tanggal: string
  hari: string
  jam: string
  keterangan: string
  /** varian warna placeholder foto — dipakai data contoh */
  foto: 'a' | 'b' | 'c'
  /** foto asli hasil kamera (data URL); mengalahkan `foto` bila ada isinya */
  fotoUrl?: string[]
  /** '—' bila tidak ada lembur */
  lembur: string
}

export interface Kendala {
  nama: string
  jabatan: Jabatan
  tanggal: string
  hari: string
  jam: string
  keterangan: string
  status: Status
  foto: 'a' | 'b' | 'c'
  /** foto asli hasil kamera (data URL); mengalahkan `foto` bila ada isinya */
  fotoUrl?: string[]
}

export interface Lembur {
  nama: string
  jabatan: Jabatan
  tanggal: string
  /** contoh: '18.00 – 22.00' */
  rentang: string
  total: string
  keterangan: string
  status: Status
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
