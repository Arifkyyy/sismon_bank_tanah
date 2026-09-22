import type { Jabatan, Status } from '@/types'

/** Menggabungkan kelas Tailwind, mengabaikan nilai kosong. */
export function cn(...kelas: (string | false | null | undefined)[]): string {
  return kelas.filter(Boolean).join(' ')
}

/** Dua huruf pertama dari nama, untuk avatar. */
export function inisial(nama: string): string {
  return nama
    .split(' ')
    .slice(0, 2)
    .map((k) => k[0])
    .join('')
    .toUpperCase()
}

/** Warna avatar ditentukan jabatan supaya mudah dikenali di tabel panjang. */
export function warnaAvatar(jabatan: Jabatan): string {
  switch (jabatan) {
    case 'Security':
      return 'linear-gradient(135deg,#3E7FA3,#1C5A7C)'
    case 'OB':
      return 'linear-gradient(135deg,#24985C,#145D31)'
    case 'CS':
      return 'linear-gradient(135deg,#E8C25A,#C09A3E)'
  }
}

/** Satu warna satu arti — dipakai konsisten di seluruh halaman. */
export const WARNA_STATUS: Record<Status, string> = {
  Aktif: 'bg-hijau-lembut text-hijau-tua',
  Diterima: 'bg-hijau-lembut text-hijau-tua',
  Selesai: 'bg-hijau-lembut text-hijau-tua',
  Cuti: 'bg-emas-lembut text-emas-teks',
  Diproses: 'bg-emas-lembut text-emas-teks',
  Menunggu: 'bg-emas-lembut text-emas-teks',
  Baru: 'bg-tanah-lembut text-tanah-teks',
  Ditolak: 'bg-merah-lembut text-merah',
  Nonaktif: 'bg-[#EEF2F0] text-teks-lembut',
}

/** Urutan jabatan yang dipakai di semua pilihan dan penyaring. */
export const DAFTAR_JABATAN: Jabatan[] = ['Security', 'OB', 'CS']

/**
 * Nama panjang jabatan untuk label yang perlu jelas (mis. pilihan jabatan saat
 * membuat penugasan). Data tetap disimpan sebagai kode pendek `Jabatan`.
 */
export const JABATAN_PANJANG: Record<Jabatan, string> = {
  Security: 'Security',
  OB: 'Office Boy',
  CS: 'Customer Service',
}

/** 'Office Boy' → 'OB'; label yang tidak dikenali dianggap Security. */
export function jabatanDariLabel(label: string): Jabatan {
  return DAFTAR_JABATAN.find((j) => JABATAN_PANJANG[j] === label) ?? 'Security'
}

export const WARNA_JABATAN: Record<Jabatan, string> = {
  Security: 'border-[#BCD4E4] bg-[#EDF5FA] text-[#1C5A7C]',
  OB: 'border-[#CFE3D6] bg-[#EDF6F0] text-hijau-tua',
  CS: 'border-[#F0DCAE] bg-[#FDF6E4] text-emas-teks',
}

/** Gradasi placeholder foto bukti. */
export const WARNA_FOTO: Record<'a' | 'b' | 'c', string> = {
  a: 'from-[#CFE3D6] via-[#9BC3AC] to-[#6FA98B]',
  b: 'from-[#C6DCE8] via-[#8FB3C6] to-[#5D8BA3]',
  c: 'from-[#F2E2B8] via-[#DCC077] to-[#C09A3E]',
}
