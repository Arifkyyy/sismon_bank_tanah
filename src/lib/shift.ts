import { unduhExcel } from '@/lib/excel'
import { BULAN, BULAN_PENDEK, dariIso, HARI_MINI, keIso } from '@/lib/tanggal'
import type { JadwalPeriode, Shift, StatusTukar, WarnaShift } from '@/types'

export const WARNA_STATUS_TUKAR: Record<StatusTukar, string> = {
  'Menunggu Rekan': 'bg-emas-lembut text-emas-teks',
  'Menunggu Admin': 'bg-emas-lembut text-emas-teks',
  Disetujui: 'bg-hijau-lembut text-hijau-tua',
  Ditolak: 'bg-merah-lembut text-merah',
  Dibatalkan: 'bg-[#EEF2F0] text-teks-lembut',
}

/**
 * Warna shift. Daftarnya tetap dan sama dengan WARNA_SHIFT di
 * backend/app/models.py; semuanya diambil dari palet tailwind.config.ts.
 * Merah sengaja tidak ada karena khusus untuk tindakan menghapus.
 */
export const WARNA_SHIFT: Record<WarnaShift, { label: string; kotak: string }> = {
  hijau: { label: 'Hijau', kotak: 'border-hijau/25 bg-hijau-lembut text-hijau-tua' },
  'hijau-tua': { label: 'Hijau tua', kotak: 'border-hijau-tua bg-hijau-tua text-white' },
  emas: { label: 'Emas', kotak: 'border-emas/50 bg-emas-lembut text-emas-teks' },
  tanah: { label: 'Tanah', kotak: 'border-tanah/30 bg-tanah-lembut text-tanah-teks' },
  ink: { label: 'Biru tua', kotak: 'border-ink bg-ink text-white' },
  abu: { label: 'Abu-abu', kotak: 'border-garis-kuat bg-[#EEF2F0] text-teks-lembut' },
}

export const DAFTAR_WARNA_SHIFT = Object.keys(WARNA_SHIFT) as WarnaShift[]

/** Menit dari tengah malam, '07:30' → 450. */
function menit(jam: string): number {
  const [j, m] = jam.split(':').map(Number)
  return j * 60 + m
}

/** Keterangan panjang shift dari jam form, mis. 'Lintas hari · 8 jam'. Kosong bila jam belum lengkap. */
export function keteranganJam(mulai: string, selesai: string): string {
  if (!mulai || !selesai) return ''
  const selisih = menit(selesai) - menit(mulai)
  const lama = selisih <= 0 ? selisih + 24 * 60 : selisih
  const jam = Math.floor(lama / 60)
  const sisa = lama % 60
  const teks = sisa ? `${jam} jam ${sisa} menit` : `${jam} jam`
  if (selisih === 0) return '24 jam penuh'
  return selisih < 0 ? `Lintas hari · ${teks}` : teks
}

/** Label kecil di samping jam: 'lintas hari' / '24 jam' / kosong. */
export function labelJam(s: Pick<Shift, 'lintasHari' | 'duaPuluhEmpatJam'>): string {
  if (s.duaPuluhEmpatJam) return '24 jam'
  return s.lintasHari ? 'lintas hari' : ''
}

/* ------------------------------------------------------------- Periode jadwal */

export type ModePeriode = 'Minggu' | 'Bulan'

export interface Periode {
  dari: string
  sampai: string
  /** semua tanggal ISO dari–sampai */
  tanggal: string[]
  /** mis. '6 – 12 Okt 2026' atau 'Oktober 2026' */
  label: string
}

function tambahHari(t: Date, n: number): Date {
  const h = new Date(t)
  h.setDate(h.getDate() + n)
  return h
}

/** Minggu dihitung Senin–Minggu; bulan dari tanggal 1 sampai akhir bulan (sama dengan salin periode di backend). */
export function periodeDari(mode: ModePeriode, acuan: Date): Periode {
  let awal: Date
  let akhir: Date
  if (mode === 'Minggu') {
    awal = tambahHari(acuan, -((acuan.getDay() + 6) % 7))
    akhir = tambahHari(awal, 6)
  } else {
    awal = new Date(acuan.getFullYear(), acuan.getMonth(), 1)
    akhir = new Date(acuan.getFullYear(), acuan.getMonth() + 1, 0)
  }
  const tanggal: string[] = []
  for (let t = awal; t <= akhir; t = tambahHari(t, 1)) tanggal.push(keIso(t))
  const label =
    mode === 'Bulan'
      ? `${BULAN[awal.getMonth()]} ${awal.getFullYear()}`
      : awal.getMonth() === akhir.getMonth()
        ? `${awal.getDate()} – ${akhir.getDate()} ${BULAN_PENDEK[akhir.getMonth()]} ${akhir.getFullYear()}`
        : `${awal.getDate()} ${BULAN_PENDEK[awal.getMonth()]} – ${akhir.getDate()} ${BULAN_PENDEK[akhir.getMonth()]} ${akhir.getFullYear()}`
  return { dari: tanggal[0], sampai: tanggal[tanggal.length - 1], tanggal, label }
}

/** Menggeser acuan satu periode ke depan (+1) atau ke belakang (-1). */
export function geserPeriode(mode: ModePeriode, acuan: Date, arah: 1 | -1): Date {
  if (mode === 'Minggu') return tambahHari(acuan, 7 * arah)
  return new Date(acuan.getFullYear(), acuan.getMonth() + arah, 1)
}

/** '2026-10-06' → { hari: 'Sen', tanggal: 6, akhirPekan } */
export function infoHari(iso: string): { hari: string; tanggal: number; akhirPekan: boolean } {
  const t = dariIso(iso)
  return { hari: HARI_MINI[t.getDay()], tanggal: t.getDate(), akhirPekan: t.getDay() === 0 || t.getDay() === 6 }
}

/** Arsir lembut untuk kolom Sabtu–Minggu. */
export const ARSIR_AKHIR_PEKAN =
  'repeating-linear-gradient(135deg, rgba(11,55,71,.045) 0 4px, transparent 4px 9px)'

/** Export tabel jadwal: satu baris per petugas, satu kolom per tanggal berisi kode shift. */
export function unduhJadwal(
  data: JadwalPeriode,
  periode: Periode,
  shift: Map<number, Shift>,
  petugasIds: Set<number>,
  saringan: string,
) {
  const isi = new Map(data.kotak.map((k) => [`${k.petugasId}|${k.tanggal}`, k]))
  const petugas = data.petugas.filter((p) => petugasIds.has(p.id))
  const dipakai = new Set(
    data.kotak.filter((k) => petugasIds.has(k.petugasId)).map((k) => k.shiftId),
  )
  const legenda = [...dipakai]
    .map((id) => shift.get(id))
    .filter((s): s is Shift => !!s)
    .map((s) => `${s.kode} = ${s.nama}${s.rentang ? ` (${s.rentang})` : ''}`)
    .join(', ')
  unduhExcel({
    namaBerkas: `jadwal-shift-${periode.dari}`,
    judul: 'Jadwal Shift Petugas',
    keterangan: [`Periode: ${periode.label}`, saringan || 'Semua jabatan', legenda && `Kode: ${legenda}`, '⇄ = hasil tukar shift']
      .filter(Boolean)
      .join(' · '),
    kepala: [
      'Nama',
      'Jabatan',
      ...periode.tanggal.map((t) => {
        const h = infoHari(t)
        return `${h.hari} ${h.tanggal}`
      }),
    ],
    baris: petugas.map((p) => [
      p.status === 'Cuti' ? `${p.nama} (Cuti)` : p.nama,
      p.jabatan,
      ...periode.tanggal.map((t) => {
        const k = isi.get(`${p.id}|${t}`)
        const s = k ? shift.get(k.shiftId) : undefined
        return s ? `${s.kode}${k?.tukar ? ' ⇄' : ''}` : ''
      }),
    ]),
    namaLembar: 'Jadwal shift',
  })
}
