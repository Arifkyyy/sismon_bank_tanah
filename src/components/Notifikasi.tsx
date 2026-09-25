import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AKAR } from '@/config/menu'
import { useAuth } from '@/context/AuthContext'
import { useLembur } from '@/context/LemburContext'
import { Ikon } from '@/lib/ikon'
import type { NamaIkon } from '@/lib/ikon'
import { query } from '@/lib/api'
import { BULAN_PENDEK, keIso } from '@/lib/tanggal'
import { useApi } from '@/lib/useApi'
import { cn } from '@/lib/util'
import type { ChecklistLembar, ChecklistRingkas, Kendala, Peran } from '@/types'

type Nada = 'hijau' | 'emas' | 'tanah' | 'merah'

interface Notif {
  /** penanda tetap; berubah bila kejadiannya berubah (mis. status baru) supaya muncul lagi */
  kunci: string
  judul: string
  isi: string
  waktu: Date | null
  tautan: string
  ikon: NamaIkon
  nada: Nada
}

const WARNA: Record<Nada, string> = {
  hijau: 'bg-hijau-lembut text-hijau-tua',
  emas: 'bg-emas-lembut text-emas-teks',
  tanah: 'bg-tanah-lembut text-tanah-teks',
  merah: 'bg-merah-lembut text-merah',
}

/** Notifikasi yang lebih tua dari ini tidak ditampilkan lagi. */
const BATAS_HARI = 7

/** '15 Sep 2026 · 10.24' → Date */
function dariCap(teks?: string | null): Date | null {
  const m = teks?.match(/^(\d{1,2}) (\w{3}) (\d{4})(?: · (\d{2})\.(\d{2}))?/)
  if (!m) return null
  const bulan = BULAN_PENDEK.indexOf(m[2])
  if (bulan < 0) return null
  return new Date(Number(m[3]), bulan, Number(m[1]), Number(m[4] ?? 0), Number(m[5] ?? 0))
}

/** '2026-09-15' + '07.02' → Date */
function dariIsoJam(iso?: string, jam?: string): Date | null {
  if (!iso) return null
  const [j, mnt] = (jam ?? '00.00').split('.').map(Number)
  const [y, b, h] = iso.split('-').map(Number)
  return new Date(y, b - 1, h, j || 0, mnt || 0)
}

function waktuRelatif(t: Date, kini: Date): string {
  const menit = Math.floor((kini.getTime() - t.getTime()) / 60_000)
  const p = (n: number) => String(n).padStart(2, '0')
  const jam = `${p(t.getHours())}.${p(t.getMinutes())}`
  if (menit < 1) return 'Baru saja'
  if (menit < 60) return `${menit} menit lalu`
  if (keIso(t) === keIso(kini)) return `Hari ini · ${jam}`
  const kemarin = new Date(kini)
  kemarin.setDate(kini.getDate() - 1)
  if (keIso(t) === keIso(kemarin)) return `Kemarin · ${jam}`
  return `${t.getDate()} ${BULAN_PENDEK[t.getMonth()]} · ${jam}`
}

function bacaTersimpan(kunci: string): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(kunci) ?? '[]') as string[])
  } catch {
    return new Set()
  }
}

/**
 * Lonceng di topbar. Isinya disusun dari data yang sudah ada di backend —
 * tidak ada tabel notifikasi tersendiri. Tanda "sudah dibaca" disimpan per
 * akun di browser; kalau hilang, notifikasinya cuma tampil belum dibaca lagi.
 */
export function Notifikasi({ peran }: { peran: Peran }) {
  const { akun } = useAuth()
  const navigate = useNavigate()
  const lokasi = useLocation()
  const akar = AKAR[peran]
  const pengawas = peran !== 'user'
  const hariIni = keIso(new Date())

  const [buka, setBuka] = useState(false)
  const kotakRef = useRef<HTMLDivElement>(null)
  const kunciSimpan = `bt-notif-dibaca-${akun?.email ?? peran}`
  const [dibaca, setDibaca] = useState<Set<string>>(() => bacaTersimpan(kunciSimpan))
  useEffect(() => setDibaca(bacaTersimpan(kunciSimpan)), [kunciSimpan])

  /* ---------------------------------------------------------------- data */

  const { daftar: lembur, muat: muatLembur } = useLembur()
  const kendala = useApi<Kendala[]>(
    `/api/kendala${query(pengawas ? { status: 'Baru', batas: 50 } : { batas: 30 })}`,
    [],
  )
  const wajibAdmin = useApi<ChecklistRingkas[]>(pengawas ? `/api/checklist${query({ tanggal: hariIni })}` : null, [])
  const wajibSaya = useApi<ChecklistLembar | null>(pengawas ? null : '/api/checklist/lembar', null)

  const muatKendala = kendala.muat
  const muatWajibAdmin = wajibAdmin.muat
  const muatWajibSaya = wajibSaya.muat
  const muatSemua = useCallback(() => {
    muatLembur()
    muatKendala()
    if (pengawas) muatWajibAdmin()
    else muatWajibSaya()
  }, [pengawas, muatLembur, muatKendala, muatWajibAdmin, muatWajibSaya])

  // Diperbarui tiap pindah halaman dan tiap menit.
  useEffect(() => {
    const t = window.setInterval(muatSemua, 60_000)
    return () => window.clearInterval(t)
  }, [muatSemua])
  const halamanAwal = useRef(true)
  useEffect(() => {
    // Pemuatan pertama sudah dilakukan useApi sendiri.
    if (halamanAwal.current) {
      halamanAwal.current = false
      return
    }
    muatSemua()
  }, [lokasi.pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ------------------------------------------------------------- susun */

  const kini = new Date()
  const semua = useMemo<Notif[]>(() => {
    const hasil: Notif[] = []
    const batas = new Date()
    batas.setDate(batas.getDate() - BATAS_HARI)

    if (pengawas) {
      for (const k of kendala.data) {
        hasil.push({
          kunci: `kendala-${k.id}`,
          judul: `Laporan kendala baru dari ${k.nama}`,
          isi: k.keterangan,
          waktu: dariIsoJam(k.tanggalIso, k.jam),
          tautan: `${akar}/laporan-kendala`,
          ikon: 'Awas',
          nada: 'tanah',
        })
      }
      for (const l of lembur) {
        const dijawab = dariCap(l.dijawabPada)
        if (!dijawab || dijawab < batas) continue
        const tolak = l.status === 'Ditolak'
        hasil.push({
          kunci: `lembur-${l.id}-dijawab`,
          judul: `${l.nama} ${tolak ? 'menolak' : 'menerima'} penugasan lembur`,
          isi: `${l.tanggal} · ${l.rentang}${tolak && l.alasan ? ` — “${l.alasan}”` : ''}`,
          waktu: dijawab,
          tautan: `${akar}/pengajuan-lembur`,
          ikon: tolak ? 'Silang' : 'Centang',
          nada: tolak ? 'merah' : 'hijau',
        })
      }
      for (const r of wajibAdmin.data) {
        if (r.status !== 'Dikirim') continue
        hasil.push({
          kunci: `wajib-${r.id}-${r.dikirimPada}`,
          judul: `${r.nama} mengirim kerja wajib`,
          isi: `${r.terisi} dari ${r.totalKotak} kotak terisi${r.tidak ? ` · ${r.tidak} temuan ✗` : ''}`,
          waktu: dariCap(r.dikirimPada),
          tautan: `${akar}/kerja-wajib-petugas`,
          ikon: 'Daftar',
          nada: r.tidak ? 'emas' : 'hijau',
        })
      }
    } else {
      for (const l of lembur) {
        if (l.status !== 'Menunggu') continue
        hasil.push({
          kunci: `lembur-${l.id}`,
          judul: `Penugasan lembur baru dari ${l.dibuatOleh ?? 'admin'}`,
          isi: `${l.tanggal} · ${l.rentang} · ${l.keterangan}`,
          waktu: dariCap(l.dikirimPada) ?? dariIsoJam(l.tanggalIso),
          tautan: `${akar}/lembur`,
          ikon: 'Jam',
          nada: 'emas',
        })
      }
      for (const k of kendala.data) {
        const diubah = dariCap(k.diperbaruiPada)
        if (k.status === 'Baru' || !diubah || diubah < batas) continue
        const selesai = k.status === 'Selesai'
        hasil.push({
          kunci: `kendala-${k.id}-${k.status}`,
          judul: selesai ? 'Laporan kendala Anda sudah selesai' : 'Laporan kendala Anda sedang diproses',
          isi: k.keterangan,
          waktu: diubah,
          tautan: `${akar}/laporan-kendala`,
          ikon: selesai ? 'Centang' : 'Awas',
          nada: selesai ? 'hijau' : 'emas',
        })
      }
      const w = wajibSaya.data
      if (w && w.item.length > 0 && w.status !== 'Dikirim') {
        hasil.push({
          kunci: `wajib-${w.tanggalIso}`,
          judul: 'Kerja wajib hari ini belum dikirim',
          isi: `${w.terisi} dari ${w.totalKotak} kotak sudah terisi`,
          waktu: null,
          tautan: `${akar}/kerja-wajib`,
          ikon: 'Daftar',
          nada: 'emas',
        })
      }
    }

    // Pengingat tanpa waktu di paling atas, sisanya yang terbaru lebih dulu.
    return hasil.sort((a, b) => (b.waktu?.getTime() ?? Infinity) - (a.waktu?.getTime() ?? Infinity))
  }, [pengawas, akar, kendala.data, lembur, wajibAdmin.data, wajibSaya.data])

  const belum = semua.filter((n) => !dibaca.has(n.kunci)).length

  /* -------------------------------------------------------------- aksi */

  function simpan(baru: Set<string>) {
    // Buang kunci yang notifikasinya sudah tidak ada supaya penyimpanan tidak terus membesar.
    const ada = new Set(semua.map((n) => n.kunci))
    const rapi = new Set([...baru].filter((k) => ada.has(k)))
    setDibaca(rapi)
    try {
      localStorage.setItem(kunciSimpan, JSON.stringify([...rapi]))
    } catch {
      // penyimpanan browser tidak tersedia — tanda dibaca hanya bertahan selama halaman terbuka
    }
  }

  function bukaNotif(n: Notif) {
    simpan(new Set([...dibaca, n.kunci]))
    setBuka(false)
    navigate(n.tautan)
  }

  useEffect(() => {
    if (!buka) return
    function klik(e: MouseEvent) {
      if (!kotakRef.current?.contains(e.target as Node)) setBuka(false)
    }
    function tombol(e: KeyboardEvent) {
      if (e.key === 'Escape') setBuka(false)
    }
    document.addEventListener('mousedown', klik)
    document.addEventListener('keydown', tombol)
    return () => {
      document.removeEventListener('mousedown', klik)
      document.removeEventListener('keydown', tombol)
    }
  }, [buka])

  return (
    <div className="relative" ref={kotakRef}>
      <button
        type="button"
        aria-label={belum ? `Notifikasi, ${belum} belum dibaca` : 'Notifikasi'}
        aria-haspopup="dialog"
        aria-expanded={buka}
        onClick={() => {
          if (!buka) muatSemua()
          setBuka((v) => !v)
        }}
        className={cn(
          'relative grid h-10 w-10 place-items-center rounded-full text-teks-lembut hover:bg-kertas hover:text-ink',
          buka && 'bg-kertas text-ink',
        )}
      >
        <Ikon.Lonceng size={20} />
        {belum > 0 && (
          <i className="num absolute right-[3px] top-[3px] grid h-[18px] min-w-[18px] place-items-center rounded-full border-2 border-white bg-tanah px-1 text-[10px] font-bold not-italic leading-none text-white">
            {belum > 9 ? '9+' : belum}
          </i>
        )}
      </button>

      {buka && (
        <div
          role="dialog"
          aria-label="Notifikasi"
          className="masuk-halus absolute right-0 top-[calc(100%+8px)] z-50 w-[min(380px,calc(100vw-24px))] overflow-hidden rounded-kartu border border-garis bg-white shadow-naik max-sm:fixed max-sm:left-3 max-sm:right-3 max-sm:top-[70px] max-sm:w-auto"
        >
          <div className="flex items-center gap-3 border-b border-garis px-4.5 py-3.5">
            <div className="min-w-0 flex-1">
              <b className="block text-[14px] font-bold text-ink">Notifikasi</b>
              <span className="text-[11.5px] text-teks-lembut">
                {belum ? `${belum} belum dibaca` : 'Semua sudah dibaca'}
              </span>
            </div>
            <button
              type="button"
              disabled={belum === 0}
              onClick={() => simpan(new Set([...dibaca, ...semua.map((n) => n.kunci)]))}
              className="rounded-full px-2.5 py-1.5 text-[12px] font-semibold text-hijau transition hover:bg-hijau-lembut disabled:pointer-events-none disabled:text-teks-samar"
            >
              Tandai semua dibaca
            </button>
          </div>

          {semua.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <span className="mx-auto mb-2.5 grid h-11 w-11 place-items-center rounded-full bg-[#F3F7F4] text-teks-samar">
                <Ikon.Lonceng size={19} />
              </span>
              <b className="block text-[13px] font-semibold text-ink">Belum ada notifikasi</b>
              <span className="mt-0.5 block text-[12px] text-teks-lembut">Kabar terbaru akan muncul di sini.</span>
            </div>
          ) : (
            <ul className="scrollbar-lembut m-0 max-h-[420px] list-none overflow-y-auto overscroll-contain p-0">
              {semua.map((n) => {
                const Glif = Ikon[n.ikon]
                const baru = !dibaca.has(n.kunci)
                return (
                  <li key={n.kunci} className="border-b border-garis last:border-b-0">
                    <button
                      type="button"
                      onClick={() => bukaNotif(n)}
                      className={cn(
                        'flex w-full items-start gap-3 px-4.5 py-3 text-left transition hover:bg-[#F7FAF8]',
                        baru && 'bg-hijau-lembut/40',
                      )}
                    >
                      <span className={cn('mt-0.5 grid h-9 w-9 flex-none place-items-center rounded-full', WARNA[n.nada])}>
                        <Glif size={16} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          className={cn(
                            'block text-[12.5px] leading-snug text-ink',
                            baru ? 'font-bold' : 'font-semibold',
                          )}
                        >
                          {n.judul}
                        </span>
                        <span className="mt-0.5 line-clamp-2 block text-[12px] leading-snug text-teks-lembut">
                          {n.isi}
                        </span>
                        <span className="num mt-1 block text-[11px] text-teks-samar">
                          {n.waktu ? waktuRelatif(n.waktu, kini) : 'Pengingat hari ini'}
                        </span>
                      </span>
                      {baru && <i className="mt-1.5 h-2 w-2 flex-none rounded-full bg-tanah" aria-label="Belum dibaca" />}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
