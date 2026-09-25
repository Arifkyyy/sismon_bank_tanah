/**
 * Pembuat berkas Excel (.xlsx) tanpa pustaka tambahan.
 *
 * Berkas .xlsx adalah arsip ZIP berisi beberapa XML. Yang dibuat di sini satu
 * lembar kerja dengan kop (judul, periode, waktu unduh) lalu data sebagai
 * Tabel Excel sungguhan: kepala berwarna, baris belang, tombol saring, garis,
 * kepala dibekukan saat digulir, lebar kolom menyesuaikan isi, dan teks
 * panjang dibungkus.
 */

type Nilai = string | number | null | undefined

export interface IsiExcel {
  /** nama berkas tanpa ekstensi */
  namaBerkas: string
  /** judul besar di baris pertama, mis. 'Laporan Kendala' */
  judul: string
  /** keterangan di bawah judul, mis. periode dan saringan */
  keterangan?: string
  kepala: string[]
  baris: Nilai[][]
  /** nama lembar kerja; maksimal 31 huruf */
  namaLembar?: string
}

/* ------------------------------------------------------------------ ZIP */

const TABEL_CRC = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(data: Uint8Array): number {
  let c = 0xffffffff
  for (let i = 0; i < data.length; i++) c = TABEL_CRC[(c ^ data[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

/** Arsip ZIP tanpa kompresi (metode 'store') — cukup untuk Excel. */
function buatZip(berkas: { nama: string; isi: string }[]): Blob {
  const enc = new TextEncoder()
  const bagian: BlobPart[] = []
  const pusat: BlobPart[] = []
  let posisi = 0
  let besarPusat = 0

  for (const b of berkas) {
    const nama = enc.encode(b.nama)
    const data = enc.encode(b.isi)
    const crc = crc32(data)

    const lokal = new DataView(new ArrayBuffer(30))
    lokal.setUint32(0, 0x04034b50, true)
    lokal.setUint16(4, 20, true) // versi
    lokal.setUint16(6, 0x0800, true) // nama berkas UTF-8
    lokal.setUint16(8, 0, true) // tanpa kompresi
    lokal.setUint16(12, 0x21, true) // tanggal 1 Jan 1980
    lokal.setUint32(14, crc, true)
    lokal.setUint32(18, data.length, true)
    lokal.setUint32(22, data.length, true)
    lokal.setUint16(26, nama.length, true)
    bagian.push(lokal.buffer, nama, data)

    const p = new DataView(new ArrayBuffer(46))
    p.setUint32(0, 0x02014b50, true)
    p.setUint16(4, 20, true)
    p.setUint16(6, 20, true)
    p.setUint16(8, 0x0800, true)
    p.setUint16(10, 0, true)
    p.setUint16(14, 0x21, true)
    p.setUint32(16, crc, true)
    p.setUint32(20, data.length, true)
    p.setUint32(24, data.length, true)
    p.setUint16(28, nama.length, true)
    p.setUint32(42, posisi, true)
    pusat.push(p.buffer, nama)
    besarPusat += 46 + nama.length

    posisi += 30 + nama.length + data.length
  }

  const akhir = new DataView(new ArrayBuffer(22))
  akhir.setUint32(0, 0x06054b50, true)
  akhir.setUint16(8, berkas.length, true)
  akhir.setUint16(10, berkas.length, true)
  akhir.setUint32(12, besarPusat, true)
  akhir.setUint32(16, posisi, true)

  return new Blob([...bagian, ...pusat, akhir.buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

/* ------------------------------------------------------------ Lembar kerja */

const esc = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    // karakter kendali selain tab/baris baru membuat XML tidak sah
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')

/** 0 → 'A', 26 → 'AA' */
function hurufKolom(i: number): string {
  let s = ''
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s
  return s
}

// Indeks gaya di styles.xml
const GAYA_JUDUL = 1
const GAYA_KETERANGAN = 2
const GAYA_KEPALA = 3
const GAYA_TEKS = 4
const GAYA_ANGKA = 5

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="4">
<font><sz val="11"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="15"/><color rgb="FF145D31"/><name val="Calibri"/><family val="2"/></font>
<font><sz val="10"/><color rgb="FF5E7883"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font>
</fonts>
<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="6">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="top"/></xf>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`

function sel(ref: string, v: Nilai, gaya: number): string {
  if (v === null || v === undefined || v === '') return `<c r="${ref}" s="${gaya}"/>`
  if (typeof v === 'number' && Number.isFinite(v)) return `<c r="${ref}" s="${GAYA_ANGKA}"><v>${v}</v></c>`
  return `<c r="${ref}" s="${gaya}" t="inlineStr"><is><t xml:space="preserve">${esc(String(v))}</t></is></c>`
}

export function buatExcel(isi: Omit<IsiExcel, 'namaBerkas'>): Blob {
  const { judul, keterangan, namaLembar = 'Data' } = isi
  // Kolom nomor urut selalu ada di depan.
  const kepala = ['No.', ...isi.kepala]
  const baris = isi.baris.map((b, n) => [n + 1, ...b])
  const jmlKolom = kepala.length
  const kolomAkhir = hurufKolom(jmlKolom - 1)
  // Baris 1 judul, 2 keterangan, 3 waktu unduh, 4 kosong, 5 kepala tabel.
  const BARIS_KEPALA = 5
  const barisAkhir = BARIS_KEPALA + Math.max(baris.length, 1)

  // Lebar kolom dari isi terpanjang, dibatasi supaya kolom keterangan tidak kebablasan.
  const lebar = kepala.map((k, i) => {
    const terpanjang = Math.max(k.length + 4, ...baris.map((b) => String(b[i] ?? '').length))
    return i === 0 ? 6 : Math.min(Math.max(terpanjang + 2, 9), 55)
  })

  const t = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  const diunduh = `Diunduh ${p(t.getDate())}/${p(t.getMonth() + 1)}/${t.getFullYear()} pukul ${p(t.getHours())}.${p(t.getMinutes())}`

  // Nama kolom tabel Excel wajib unik dan tidak kosong.
  const namaKolom = kepala.map((k, i) => (k.trim() || `Kolom ${i + 1}`))
  namaKolom.forEach((k, i) => {
    if (namaKolom.indexOf(k) !== i) namaKolom[i] = `${k} ${i + 1}`
  })

  const isiBaris: string[] = [
    `<row r="1" ht="24" customHeight="1">${sel('A1', judul, GAYA_JUDUL)}</row>`,
    `<row r="2">${sel('A2', keterangan ?? '', GAYA_KETERANGAN)}</row>`,
    `<row r="3">${sel('A3', diunduh, GAYA_KETERANGAN)}</row>`,
    `<row r="${BARIS_KEPALA}" ht="22" customHeight="1">${namaKolom
      .map((k, i) => sel(`${hurufKolom(i)}${BARIS_KEPALA}`, k, GAYA_KEPALA))
      .join('')}</row>`,
  ]

  const data = baris.length ? baris : [kepala.map((_, i) => (i === 1 ? 'Tidak ada data pada periode ini' : ''))]
  data.forEach((b, n) => {
    const r = BARIS_KEPALA + 1 + n
    // Perkiraan tinggi baris dari teks yang terbungkus paling banyak.
    // Satu satuan lebar kolom memuat ±1,25 huruf rata-rata pada Calibri 11.
    const garis = Math.max(1, ...b.map((v, i) => Math.ceil(String(v ?? '').length / (lebar[i] * 1.25))))
    const tinggi = garis > 1 ? ` ht="${Math.min(garis, 12) * 15}" customHeight="1"` : ''
    isiBaris.push(
      `<row r="${r}"${tinggi}>${kepala.map((_, i) => sel(`${hurufKolom(i)}${r}`, b[i], GAYA_TEKS)).join('')}</row>`,
    )
  })

  const lembar = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>
<dimension ref="A1:${kolomAkhir}${barisAkhir}"/>
<sheetViews><sheetView workbookViewId="0" showGridLines="0"><pane ySplit="${BARIS_KEPALA}" topLeftCell="A${BARIS_KEPALA + 1}" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A${BARIS_KEPALA + 1}" sqref="A${BARIS_KEPALA + 1}"/></sheetView></sheetViews>
<sheetFormatPr defaultRowHeight="15"/>
<cols>${lebar.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>
<sheetData>${isiBaris.join('')}</sheetData>
<mergeCells count="3"><mergeCell ref="A1:${kolomAkhir}1"/><mergeCell ref="A2:${kolomAkhir}2"/><mergeCell ref="A3:${kolomAkhir}3"/></mergeCells>
<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/>
<pageSetup orientation="landscape" paperSize="9" fitToWidth="1" fitToHeight="0"/>
<tableParts count="1"><tablePart r:id="rId1"/></tableParts>
</worksheet>`

  const tabel = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<table xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" id="1" name="Tabel1" displayName="Tabel1" ref="A${BARIS_KEPALA}:${kolomAkhir}${barisAkhir}" totalsRowShown="0">
<autoFilter ref="A${BARIS_KEPALA}:${kolomAkhir}${barisAkhir}"/>
<tableColumns count="${jmlKolom}">${namaKolom.map((k, i) => `<tableColumn id="${i + 1}" name="${esc(k)}"/>`).join('')}</tableColumns>
<tableStyleInfo name="TableStyleMedium7" showFirstColumn="0" showLastColumn="0" showRowStripes="1" showColumnStripes="0"/>
</table>`

  const lembarAman = esc(namaLembar.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31))

  return buatZip([
    {
      nama: '[Content_Types].xml',
      isi: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/tables/table1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`,
    },
    {
      nama: '_rels/.rels',
      isi: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    },
    {
      nama: 'xl/workbook.xml',
      isi: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${lembarAman}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    },
    {
      nama: 'xl/_rels/workbook.xml.rels',
      isi: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    },
    { nama: 'xl/worksheets/sheet1.xml', isi: lembar },
    {
      nama: 'xl/worksheets/_rels/sheet1.xml.rels',
      isi: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/table" Target="../tables/table1.xml"/></Relationships>`,
    },
    { nama: 'xl/tables/table1.xml', isi: tabel },
    { nama: 'xl/styles.xml', isi: STYLES },
  ])
}

/** Membuat lalu langsung mengunduh berkas .xlsx. */
export function unduhExcel({ namaBerkas, ...isi }: IsiExcel) {
  const url = URL.createObjectURL(buatExcel(isi))
  const a = document.createElement('a')
  a.href = url
  a.download = `${namaBerkas.replace(/\.xlsx$/i, '')}.xlsx`
  a.click()
  // Beri waktu browser mulai mengunduh sebelum alamatnya dilepas.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
