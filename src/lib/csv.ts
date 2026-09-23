/**
 * Mengunduh tabel sebagai berkas CSV yang bisa dibuka di Excel.
 * Pemisahnya titik koma (;) karena Excel berbahasa Indonesia memakai koma
 * sebagai tanda desimal. BOM di depan supaya huruf seperti "—" tidak rusak.
 */
export function unduhCsv(namaBerkas: string, kepala: string[], baris: (string | number)[][]) {
  const sel = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`
  const isi = [kepala, ...baris].map((b) => b.map(sel).join(';')).join('\r\n')
  const blob = new Blob(['\uFEFF' + isi], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = namaBerkas.endsWith('.csv') ? namaBerkas : `${namaBerkas}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
