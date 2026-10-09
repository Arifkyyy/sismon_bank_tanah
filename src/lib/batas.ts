/**
 * Batas jumlah baris yang diminta dari daftar logbook, kendala, dan arsip foto.
 * Sama dengan batas maksimal di backend (`batas: le=1000` di routers/logbook.py,
 * kendala.py, foto.py). Bila hasilnya mencapai batas ini, data lama mungkin tidak
 * ikut, jadi layar wajib memberi tahu, bukan diam-diam menampilkan sebagian.
 */
export const BATAS_DAFTAR = 1000

/** true bila daftar kemungkinan terpotong (jumlahnya mencapai batas). */
export function terpotong(jumlah: number): boolean {
  return jumlah >= BATAS_DAFTAR
}

/** Angka untuk kartu: '1.000+' bila daftarnya terpotong, supaya tidak menyesatkan. */
export function angkaDaftar(jumlah: number, potong: boolean): string {
  return `${jumlah.toLocaleString('id-ID')}${potong ? '+' : ''}`
}
