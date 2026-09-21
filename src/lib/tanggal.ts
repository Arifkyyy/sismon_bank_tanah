export const BULAN_PENDEK = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
export const NAMA_HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

/** '2026-09-15' → { tanggal: '15 Sep 2026', hari: 'Selasa' } */
export function formatTanggal(iso: string): { tanggal: string; hari: string } {
  const [y, m, d] = iso.split('-').map(Number)
  const tgl = new Date(y, (m || 1) - 1, d || 1)
  return {
    tanggal: `${String(d).padStart(2, '0')} ${BULAN_PENDEK[tgl.getMonth()]} ${y}`,
    hari: NAMA_HARI[tgl.getDay()],
  }
}

/** '09:40' → '09.40'; kosong → '--.--' */
export function formatJam(jam: string): string {
  return jam ? jam.replace(':', '.') : '--.--'
}

export const BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]
/** Kepala kolom kalender, Minggu sebagai hari pertama. */
export const HARI_MINI = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

/** Date → '2026-09-15' (memakai waktu lokal, bukan UTC). */
export function keIso(t: Date): string {
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
}

/** '2026-09-15' → Date lokal. */
export function dariIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

/** Jumlah hari pada bulan tertentu; bulan dihitung 0–11. */
export function jumlahHari(tahun: number, bulan: number): number {
  return new Date(tahun, bulan + 1, 0).getDate()
}

/** Hari pertama bulan jatuh di kolom ke berapa (0 = Minggu). */
export function awalBulan(tahun: number, bulan: number): number {
  return new Date(tahun, bulan, 1).getDay()
}

/** '2026-09-01' + '2026-09-15' → '01 Sep – 15 Sep 2026' */
export function formatRentang(mulai: string, sampai: string): string {
  const a = formatTanggal(mulai).tanggal
  const b = formatTanggal(sampai).tanggal
  if (mulai === sampai) return a
  // Tahun cukup ditulis sekali bila keduanya di tahun yang sama.
  return a.slice(-4) === b.slice(-4) ? `${a.slice(0, 6)} – ${b}` : `${a} – ${b}`
}
