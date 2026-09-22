import type { Akun, DrafLembur, Kendala, Lembur, Logbook, Peran, Petugas } from '@/types'

/**
 * Data contoh untuk prototipe. Ganti seluruh isi berkas ini dengan
 * pemanggilan API ketika backend sudah siap — komponennya tidak perlu diubah.
 */

export const HARI_INI = 'Selasa, 15 September 2026'
/** Hari yang sama dalam ISO — nilai awal penyaring harian. */
export const ISO_HARI_INI = '2026-09-15'

export const AKUN: Record<Peran, Akun> = {
  superadmin: {
    nama: 'Dian Permatasari',
    peran: 'Super Admin',
    email: 'dian.permatasari@banktanah.go.id',
    inisial: 'DP',
    nip: '19880412 201203 2 004',
    unit: 'Divisi Umum & SDM',
    emas: true,
  },
  admin: {
    nama: 'Rahmat Hidayat',
    peran: 'Admin',
    email: 'rahmat.hidayat@banktanah.go.id',
    inisial: 'RH',
    nip: '19910228 201504 1 007',
    unit: 'Bagian Pengelolaan Gedung',
  },
  user: {
    nama: 'Bagas Setiawan',
    peran: 'Security',
    email: 'bagas.setiawan@banktanah.go.id',
    inisial: 'BS',
    nip: '20210719 003',
    unit: 'Pos Utama — Gedung A',
  },
}

export const PETUGAS: Petugas[] = [
  { nama: 'Bagas Setiawan', jabatan: 'Security', email: 'bagas.setiawan@banktanah.go.id', telepon: '0812-1144-9021', status: 'Aktif' },
  { nama: 'Siti Nurhaliza', jabatan: 'CS', email: 'siti.nurhaliza@banktanah.go.id', telepon: '0813-2210-7744', status: 'Aktif' },
  { nama: 'Joko Priyono', jabatan: 'OB', email: 'joko.priyono@banktanah.go.id', telepon: '0857-9911-2038', status: 'Aktif' },
  { nama: 'Andri Kurniawan', jabatan: 'Security', email: 'andri.kurniawan@banktanah.go.id', telepon: '0811-7788-4512', status: 'Cuti' },
  { nama: 'Maya Anggraini', jabatan: 'CS', email: 'maya.anggraini@banktanah.go.id', telepon: '0895-3344-1120', status: 'Aktif' },
  { nama: 'Rudi Hartono', jabatan: 'OB', email: 'rudi.hartono@banktanah.go.id', telepon: '0856-2277-9903', status: 'Nonaktif' },
  { nama: 'Fitri Handayani', jabatan: 'CS', email: 'fitri.handayani@banktanah.go.id', telepon: '0821-6655-3310', status: 'Aktif' },
  { nama: 'Slamet Riyadi', jabatan: 'Security', email: 'slamet.riyadi@banktanah.go.id', telepon: '0877-1122-8890', status: 'Aktif' },
]

export const LOGBOOK: Logbook[] = [
  { nama: 'Bagas Setiawan', jabatan: 'Security', tanggal: '15 Sep 2026', hari: 'Selasa', jam: '07.02', keterangan: 'Serah terima shift pagi di Pos Utama. Kondisi area aman, seluruh akses berfungsi.', foto: 'a', lembur: '—' },
  { nama: 'Joko Priyono', jabatan: 'OB', tanggal: '15 Sep 2026', hari: 'Selasa', jam: '07.20', keterangan: 'Pembersihan lobi lantai 1 dan pantry lantai 3 selesai.', foto: 'b', lembur: '—' },
  { nama: 'Siti Nurhaliza', jabatan: 'CS', tanggal: '15 Sep 2026', hari: 'Selasa', jam: '08.05', keterangan: 'Pembukaan layanan meja depan, 4 tamu terlayani sebelum pukul 09.00.', foto: 'c', lembur: '1j 30m' },
  { nama: 'Maya Anggraini', jabatan: 'CS', tanggal: '15 Sep 2026', hari: 'Selasa', jam: '08.31', keterangan: 'Rekap surat masuk diserahkan ke Bagian Umum.', foto: 'a', lembur: '—' },
  { nama: 'Slamet Riyadi', jabatan: 'Security', tanggal: '15 Sep 2026', hari: 'Selasa', jam: '09.14', keterangan: 'Patroli keliling area parkir dan pintu belakang, tidak ada temuan.', foto: 'b', lembur: '2j 00m' },
  { nama: 'Fitri Handayani', jabatan: 'CS', tanggal: '14 Sep 2026', hari: 'Senin', jam: '16.48', keterangan: 'Penutupan layanan, laporan harian diserahkan ke koordinator.', foto: 'c', lembur: '—' },
  { nama: 'Andri Kurniawan', jabatan: 'Security', tanggal: '14 Sep 2026', hari: 'Senin', jam: '19.00', keterangan: 'Mulai shift malam, pengecekan seluruh titik CCTV.', foto: 'a', lembur: '3j 00m' },
]

export const KENDALA: Kendala[] = [
  { nama: 'Joko Priyono', jabatan: 'OB', tanggal: '15 Sep 2026', hari: 'Selasa', jam: '10.12', keterangan: 'Keran wastafel toilet pria lantai 2 bocor, air menggenang di lantai.', status: 'Baru', foto: 'b' },
  { nama: 'Bagas Setiawan', jabatan: 'Security', tanggal: '15 Sep 2026', hari: 'Selasa', jam: '09.40', keterangan: 'Palang parkir sisi timur macet saat dibuka, perlu pengecekan teknisi.', status: 'Diproses', foto: 'a' },
  { nama: 'Siti Nurhaliza', jabatan: 'CS', tanggal: '14 Sep 2026', hari: 'Senin', jam: '13.25', keterangan: 'Printer meja depan tidak terdeteksi jaringan sejak pagi.', status: 'Diproses', foto: 'c' },
  { nama: 'Maya Anggraini', jabatan: 'CS', tanggal: '13 Sep 2026', hari: 'Minggu', jam: '11.05', keterangan: 'AC ruang tunggu tidak dingin, tamu mengeluh sejak siang.', status: 'Selesai', foto: 'a' },
  { nama: 'Slamet Riyadi', jabatan: 'Security', tanggal: '12 Sep 2026', hari: 'Sabtu', jam: '21.30', keterangan: 'Lampu sorot halaman belakang mati, area jadi gelap saat patroli.', status: 'Selesai', foto: 'b' },
]

export const LEMBUR: Lembur[] = [
  { id: 'lbr-1', nama: 'Bagas Setiawan', jabatan: 'Security', tanggal: '16 Sep 2026', tanggalIso: '2026-09-16', rentang: '18.00 – 22.00', total: '4 jam', keterangan: 'Pengamanan rapat koordinasi direksi di Ruang Serbaguna.', status: 'Menunggu' },
  { id: 'lbr-2', nama: 'Siti Nurhaliza', jabatan: 'CS', tanggal: '16 Sep 2026', tanggalIso: '2026-09-16', rentang: '17.00 – 20.00', total: '3 jam', keterangan: 'Pendampingan tamu kunjungan kerja daerah.', status: 'Diterima', dijawabPada: '15 Sep 2026 · 09.12' },
  { id: 'lbr-3', nama: 'Joko Priyono', jabatan: 'OB', tanggal: '15 Sep 2026', tanggalIso: '2026-09-15', rentang: '17.00 – 21.00', total: '4 jam', keterangan: 'Persiapan dan pembersihan ruang rapat setelah acara.', status: 'Diterima', dijawabPada: '14 Sep 2026 · 16.40' },
  { id: 'lbr-4', nama: 'Andri Kurniawan', jabatan: 'Security', tanggal: '14 Sep 2026', tanggalIso: '2026-09-14', rentang: '19.00 – 23.00', total: '4 jam', keterangan: 'Penggantian rekan yang berhalangan hadir shift malam.', status: 'Ditolak', alasan: 'Sedang sakit dan sudah izin ke koordinator pos.', dijawabPada: '13 Sep 2026 · 20.05' },
  { id: 'lbr-5', nama: 'Maya Anggraini', jabatan: 'CS', tanggal: '13 Sep 2026', tanggalIso: '2026-09-13', rentang: '16.00 – 19.00', total: '3 jam', keterangan: 'Rekap dokumen layanan akhir pekan.', status: 'Selesai', dijawabPada: '12 Sep 2026 · 15.30' },
]

/**
 * Antrean penugasan lembur yang masih dikoreksi admin — belum sampai ke
 * petugas. Sengaja dibuat bervariasi — ada yang sudah lengkap, ada yang
 * keterangannya masih terlalu singkat, ada yang petugasnya sudah nonaktif atau
 * sedang cuti, dan ada yang namanya belum diisi — supaya alur crosscheck admin
 * terlihat sejak halaman pertama dibuka.
 */
export const DRAF_LEMBUR: DrafLembur[] = [
  {
    id: 'draf-1',
    nama: 'Slamet Riyadi',
    jabatan: 'Security',
    tanggal: '2026-09-17',
    mulai: '18:00',
    selesai: '23:00',
    keterangan: 'Pengamanan bongkar muat dokumen arsip dari gudang lantai dasar ke Gedung B.',
  },
  {
    id: 'draf-2',
    nama: 'Rudi Hartono',
    jabatan: 'OB',
    tanggal: '2026-09-17',
    mulai: '16:30',
    selesai: '20:00',
    keterangan: 'Bersih-bersih.',
  },
  {
    id: 'draf-3',
    nama: 'Andri Kurniawan',
    jabatan: 'Security',
    tanggal: '2026-09-18',
    mulai: '19:00',
    selesai: '23:30',
    keterangan: 'Pendampingan shift malam saat pemeliharaan genset di area belakang gedung.',
  },
  {
    id: 'draf-4',
    nama: '',
    jabatan: 'CS',
    tanggal: '2026-09-18',
    mulai: '17:00',
    selesai: '20:00',
    keterangan: 'Pendampingan tamu kunjungan kerja Kementerian ATR/BPN sampai acara selesai.',
  },
]

/** Rekap gabungan logbook + lembur per petugas. */
export const REKAP = [
  { nama: 'Bagas Setiawan', jabatan: 'Security' as const, hari: 15, logbook: 45, kendala: 2, lembur: '12 jam', patuh: '100%' },
  { nama: 'Siti Nurhaliza', jabatan: 'CS' as const, hari: 14, logbook: 41, kendala: 1, lembur: '9 jam', patuh: '93%' },
  { nama: 'Joko Priyono', jabatan: 'OB' as const, hari: 15, logbook: 30, kendala: 4, lembur: '16 jam', patuh: '100%' },
  { nama: 'Maya Anggraini', jabatan: 'CS' as const, hari: 13, logbook: 38, kendala: 1, lembur: '6 jam', patuh: '87%' },
  { nama: 'Slamet Riyadi', jabatan: 'Security' as const, hari: 15, logbook: 44, kendala: 3, lembur: '14 jam', patuh: '100%' },
  { nama: 'Fitri Handayani', jabatan: 'CS' as const, hari: 12, logbook: 33, kendala: 0, lembur: '3 jam', patuh: '80%' },
  { nama: 'Andri Kurniawan', jabatan: 'Security' as const, hari: 9, logbook: 26, kendala: 1, lembur: '8 jam', patuh: '60%' },
]

/** [logbook, jam lembur] tujuh hari terakhir. */
export const TUJUH_HARI: { hari: string; logbook: number; lembur: number }[] = [
  { hari: 'Rab', logbook: 92, lembur: 8 },
  { hari: 'Kam', logbook: 88, lembur: 14 },
  { hari: 'Jum', logbook: 95, lembur: 6 },
  { hari: 'Sab', logbook: 90, lembur: 18 },
  { hari: 'Min', logbook: 97, lembur: 10 },
  { hari: 'Sen', logbook: 64, lembur: 4 },
  { hari: 'Sel', logbook: 58, lembur: 2 },
]

export const ARSIP_FOTO = [
  { nama: 'Bagas Setiawan', waktu: '15 Sep 2026 · 07.02', sumber: 'Logbook', dipilih: true },
  { nama: 'Joko Priyono', waktu: '15 Sep 2026 · 07.20', sumber: 'Logbook', dipilih: false },
  { nama: 'Siti Nurhaliza', waktu: '15 Sep 2026 · 08.05', sumber: 'Logbook', dipilih: true },
  { nama: 'Bagas Setiawan', waktu: '15 Sep 2026 · 09.40', sumber: 'Kendala', dipilih: false },
  { nama: 'Maya Anggraini', waktu: '14 Sep 2026 · 08.31', sumber: 'Logbook', dipilih: false },
  { nama: 'Slamet Riyadi', waktu: '14 Sep 2026 · 21.30', sumber: 'Kendala', dipilih: true },
  { nama: 'Fitri Handayani', waktu: '14 Sep 2026 · 16.48', sumber: 'Logbook', dipilih: false },
  { nama: 'Andri Kurniawan', waktu: '13 Sep 2026 · 19.00', sumber: 'Logbook', dipilih: false },
]

export const AKUN_ADMIN = [
  { nama: 'Rahmat Hidayat', email: 'rahmat.hidayat@banktanah.go.id', masuk: '15 Sep 2026, 07.40', status: 'Aktif' as const },
  { nama: 'Nurul Aisyah', email: 'nurul.aisyah@banktanah.go.id', masuk: '14 Sep 2026, 16.05', status: 'Aktif' as const },
  { nama: 'Teguh Santoso', email: 'teguh.santoso@banktanah.go.id', masuk: '02 Sep 2026, 09.11', status: 'Nonaktif' as const },
]
