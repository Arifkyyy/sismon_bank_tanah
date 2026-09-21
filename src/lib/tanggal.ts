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
