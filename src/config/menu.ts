import type { GrupMenu, Peran } from '@/types'

/**
 * Menu per peran. Super admin memakai menu admin ditambah satu grup
 * "Kendali sistem" yang tidak boleh diakses admin biasa.
 */
const pemantauan: GrupMenu = {
  judul: 'Pemantauan',
  item: [
    { id: 'dash', label: 'Dashboard', path: '', ikon: 'Grid' },
    { id: 'log', label: 'Log aktivitas', path: 'log-aktivitas', ikon: 'Buku', tanda: '12' },
    { id: 'kendala', label: 'Laporan kendala', path: 'laporan-kendala', ikon: 'Awas', tanda: '2' },
  ],
}

const pengelolaan: GrupMenu = {
  judul: 'Pengelolaan',
  item: [
    { id: 'user', label: 'Data user', path: 'data-user', ikon: 'Orang' },
    { id: 'rekap', label: 'Rekapitulasi', path: 'rekapitulasi', ikon: 'Rekap' },
    { id: 'lembur', label: 'Pengajuan lembur', path: 'pengajuan-lembur', ikon: 'Jam' },
  ],
}

const akun: GrupMenu = {
  judul: 'Akun',
  item: [{ id: 'profil', label: 'Profil', path: 'profil', ikon: 'Profil' }],
}

export const MENU: Record<Peran, GrupMenu[]> = {
  admin: [pemantauan, pengelolaan, akun],
  superadmin: [
    pemantauan,
    pengelolaan,
    {
      judul: 'Kendali sistem',
      item: [
        { id: 'kelola', label: 'Kelola akun', path: 'kelola-akun', ikon: 'Perisai' },
        { id: 'hapusfoto', label: 'Hapus data foto', path: 'hapus-data-foto', ikon: 'Foto' },
      ],
    },
    akun,
  ],
  user: [
    {
      judul: 'Harian',
      item: [
        { id: 'dash', label: 'Dashboard', path: '', ikon: 'Grid' },
        { id: 'logbook', label: 'Aktivitas', path: 'logbook', ikon: 'Buku' },
        { id: 'kendala', label: 'Laporan kendala', path: 'laporan-kendala', ikon: 'Awas' },
      ],
    },
    {
      judul: 'Catatan saya',
      item: [
        { id: 'rekap', label: 'Rekap harian', path: 'rekap-harian', ikon: 'Rekap' },
        { id: 'lembur', label: 'Lembur', path: 'lembur', ikon: 'Jam', tanda: '1' },
      ],
    },
    akun,
  ],
}

/** Akar rute tiap peran. */
export const AKAR: Record<Peran, string> = {
  superadmin: '/super-admin',
  admin: '/admin',
  user: '/petugas',
}

/**
 * Judul + anak judul topbar, dipetakan dari segmen terakhir URL.
 * Kunci '' dipakai untuk halaman dashboard tiap peran.
 */
export const JUDUL: Record<string, [string, string]> = {
  '': ['Dashboard', 'Selasa, 15 September 2026'],
  'data-user': ['Data user', 'Daftar petugas Security, Office Boy, dan Customer Service'],
  'log-aktivitas': ['Log aktivitas', 'Seluruh logbook yang masuk dari petugas'],
  rekapitulasi: ['Rekapitulasi', 'Gabungan logbook dan lembur per periode'],
  'laporan-kendala': ['Laporan kendala', 'Kendala lapangan yang dilaporkan petugas'],
  'pengajuan-lembur': ['Pengajuan lembur', 'Buat penugasan lembur dan pantau jawabannya'],
  'kelola-akun': ['Kelola akun', 'Tambah, ubah, dan hapus akun admin maupun petugas'],
  'hapus-data-foto': ['Hapus data foto', 'Bersihkan arsip foto logbook dan laporan kendala'],
  logbook: ['Aktivitas', 'Catat aktivitas Anda hari ini'],
  'rekap-harian': ['Rekap harian', 'Ringkasan aktivitas dan kendala Anda'],
  lembur: ['Lembur', 'Penugasan lembur yang ditujukan kepada Anda'],
  profil: ['Profil', 'Data akun dan pengaturan keamanan'],
  'sistem-desain': ['Sistem desain', 'Warna, tipografi, dan komponen yang dipakai'],
}
