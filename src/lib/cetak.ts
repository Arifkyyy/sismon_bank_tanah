/**
 * Pembuat PDF tanpa pustaka tambahan: laporan disusun sebagai halaman HTML di
 * bingkai tersembunyi lalu dialog cetak browser dibuka. Pengguna memilih tujuan
 * "Simpan sebagai PDF". Bentuk isinya sengaja mirip `IsiExcel` di excel.ts.
 */

type Nilai = string | number | null | undefined

export interface IsiPdf {
  /** judul dokumen, juga dipakai browser sebagai nama berkas bawaan */
  judul: string
  /** baris keterangan di bawah judul, mis. nama petugas dan periode */
  keterangan?: string[]
  /** angka ringkasan di atas tabel: [label, nilai] */
  ringkasan?: [string, string][]
  kepala: string[]
  baris: Nilai[][]
  /** teks bila tabel kosong */
  kosong?: string
}

function aman(v: Nilai): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function susunHtml({ judul, keterangan = [], ringkasan = [], kepala, baris, kosong }: IsiPdf): string {
  const dicetak = new Date().toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })
  const isiTabel =
    baris.length === 0
      ? `<tr><td colspan="${kepala.length + 1}" class="kosong">${aman(kosong ?? 'Tidak ada data.')}</td></tr>`
      : baris
          .map((b, i) => `<tr><td class="no">${i + 1}</td>${b.map((v) => `<td>${aman(v)}</td>`).join('')}</tr>`)
          .join('')

  return `<!doctype html>
<html lang="id"><head><meta charset="utf-8"><title>${aman(judul)}</title>
<style>
  @page { size: A4; margin: 16mm 14mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: 'Plus Jakarta Sans', 'Segoe UI', Arial, sans-serif; color: #0B3747; font-size: 11px; }
  .kop { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #10874C; padding-bottom: 8px; }
  .lembaga { font-size: 10px; font-weight: 700; color: #10874C; letter-spacing: .04em; text-transform: uppercase; }
  h1 { margin: 2px 0 0; font-size: 18px; }
  .ket { margin-top: 8px; color: #4A6470; line-height: 1.6; }
  .waktu { font-size: 9.5px; color: #7B8F97; text-align: right; }
  .ringkasan { display: flex; gap: 8px; margin: 12px 0; }
  .ringkasan div { flex: 1; border: 1px solid #DCE6E0; border-radius: 6px; padding: 7px 9px; }
  .ringkasan span { display: block; font-size: 9.5px; color: #4A6470; }
  .ringkasan b { font-size: 15px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #10874C; color: #fff; text-align: left; font-size: 10px; padding: 6px 7px; }
  td { border-bottom: 1px solid #E2EAE5; padding: 6px 7px; vertical-align: top; }
  tr:nth-child(even) td { background: #F4F8F5; }
  thead { display: table-header-group; }
  tr { break-inside: avoid; }
  .no { width: 28px; color: #7B8F97; }
  .kosong { text-align: center; color: #7B8F97; padding: 24px; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
</style></head>
<body>
  <div class="kop">
    <div><div class="lembaga">Badan Bank Tanah</div><h1>${aman(judul)}</h1></div>
    <div class="waktu">Dicetak ${aman(dicetak)}</div>
  </div>
  ${keterangan.length ? `<div class="ket">${keterangan.map(aman).join('<br>')}</div>` : ''}
  ${
    ringkasan.length
      ? `<div class="ringkasan">${ringkasan.map(([l, n]) => `<div><span>${aman(l)}</span><b>${aman(n)}</b></div>`).join('')}</div>`
      : ''
  }
  <table>
    <thead><tr><th class="no">No.</th>${kepala.map((k) => `<th>${aman(k)}</th>`).join('')}</tr></thead>
    <tbody>${isiTabel}</tbody>
  </table>
</body></html>`
}

/** Membuka dialog cetak berisi laporan; bingkainya dibuang setelah dialog ditutup. */
export function cetakPdf(isi: IsiPdf) {
  const bingkai = document.createElement('iframe')
  bingkai.setAttribute('aria-hidden', 'true')
  bingkai.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden'
  document.body.appendChild(bingkai)

  const doc = bingkai.contentDocument
  const jendela = bingkai.contentWindow
  if (!doc || !jendela) {
    bingkai.remove()
    return
  }
  doc.open()
  doc.write(susunHtml(isi))
  doc.close()

  const buang = () => window.setTimeout(() => bingkai.remove(), 500)
  jendela.addEventListener('afterprint', buang, { once: true })
  // Tunggu huruf dimuat supaya tata letak di PDF tidak bergeser.
  const siap = doc.fonts?.ready ?? Promise.resolve()
  siap.then(() => {
    jendela.focus()
    jendela.print()
  })
}
