import { useEffect, useState } from 'react'

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

/**
 * Selisih dua jam 'HH:MM' sebagai teks, mis. '4 jam' atau '3 jam 30 menit'.
 * Rentang yang melewati tengah malam dihitung ke hari berikutnya.
 */
export function lamaLembur(mulai: string, selesai: string): string {
  const [jm, mm] = mulai.split(':').map(Number)
  const [js, ms] = selesai.split(':').map(Number)
  if ([jm, mm, js, ms].some(Number.isNaN)) return '—'
  let menit = js * 60 + ms - (jm * 60 + mm)
  if (menit <= 0) menit += 24 * 60 // lewat tengah malam
  const jam = Math.floor(menit / 60)
  const sisa = menit % 60
  if (jam === 0) return `${sisa} menit`
  return sisa === 0 ? `${jam} jam` : `${jam} jam ${sisa} menit`
}

export const BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]
/**
 * Dua belas bulan terakhir, terbaru di depan. `kunci` sengaja berbentuk
 * '2026-09' supaya tanggal ISO bisa disaring dengan `iso.startsWith(kunci)`.
 */
export function daftarBulan(jumlah = 12): { kunci: string; label: string }[] {
  return Array.from({ length: jumlah }, (_, i) => {
    const t = new Date()
    t.setDate(1)
    t.setMonth(t.getMonth() - i)
    return {
      kunci: `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}`,
      label: `${BULAN[t.getMonth()]} ${t.getFullYear()}`,
    }
  })
}

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

/* ------------------------------------------------------------ Waktu nyata */

/**
 * Nama zona waktu Indonesia dari selisih UTC perangkat. Di luar tiga zona itu
 * dipakai bentuk 'UTC+X' supaya tidak mengarang nama yang salah.
 */
export function zonaWaktu(t: Date = new Date()): string {
  const jam = -t.getTimezoneOffset() / 60
  if (jam === 7) return 'WIB'
  if (jam === 8) return 'WITA'
  if (jam === 9) return 'WIT'
  const tanda = jam < 0 ? '-' : '+'
  return `UTC${tanda}${Math.abs(jam)}`
}

/** Date → '14.03.21' (detik ikut, karena dipakai sebagai cap waktu foto). */
export function jamLengkap(t: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(t.getHours())}.${p(t.getMinutes())}.${p(t.getSeconds())}`
}

/** Date → 'Senin, 22 Sep 2026 · 14.03.21 WIB' */
export function waktuPenuh(t: Date): string {
  const { tanggal, hari } = formatTanggal(keIso(t))
  return `${hari}, ${tanggal} · ${jamLengkap(t)} ${zonaWaktu(t)}`
}

/**
 * Jam yang berdetak tiap detik selama `aktif`. Penjadwalan dipatok ke batas
 * detik berikutnya, bukan interval 1000 ms, supaya angka detik tidak melompat
 * saat tab sempat tertidur.
 */
export function useJamHidup(aktif = true): Date {
  const [sekarang, setSekarang] = useState(() => new Date())

  useEffect(() => {
    if (!aktif) return
    let timer = 0
    function tik() {
      const t = new Date()
      setSekarang(t)
      timer = window.setTimeout(tik, 1000 - t.getMilliseconds())
    }
    tik()
    return () => window.clearTimeout(timer)
  }, [aktif])

  return sekarang
}
