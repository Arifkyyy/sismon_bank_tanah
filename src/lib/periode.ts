import type { Rentang } from '@/components/RentangTanggal'
import { jumlahHari, keIso } from '@/lib/tanggal'

export type Periode = 'Harian' | 'Bulanan' | 'Custom' | 'All Time'

/** Rentang tanggal yang dikirim ke backend; kosong berarti tanpa batas. */
export interface JendelaTanggal {
  dari?: string
  sampai?: string
}

/**
 * Mengubah pilihan periode di layar menjadi rentang tanggal untuk API.
 * Mengembalikan null bila periodenya Custom tapi rentangnya belum dipilih —
 * artinya jangan mengambil data dulu.
 */
export function jendelaPeriode(
  periode: Periode,
  tanggal: string,
  bulan: string,
  rentang: Rentang | null,
): JendelaTanggal | null {
  switch (periode) {
    case 'Harian':
      return { dari: tanggal, sampai: tanggal }
    case 'Bulanan': {
      const [tahun, bln] = bulan.split('-').map(Number)
      return { dari: `${bulan}-01`, sampai: keIso(new Date(tahun, bln - 1, jumlahHari(tahun, bln - 1))) }
    }
    case 'Custom':
      return rentang ? { dari: rentang.mulai, sampai: rentang.sampai } : null
    default:
      return {}
  }
}
