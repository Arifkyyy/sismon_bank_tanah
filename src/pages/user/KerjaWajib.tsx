import { useEffect, useRef, useState } from 'react'
import { StatusData } from '@/components/StatusData'
import { KakiForm, Kartu, Tombol } from '@/components/ui'
import { Ikon } from '@/lib/ikon'
import { api, pesanGalat } from '@/lib/api'
import { useApi } from '@/lib/useApi'
import { BULAN, keIso, useJamHidup } from '@/lib/tanggal'
import { cn, JABATAN_PANJANG } from '@/lib/util'
import type { ChecklistItem, ChecklistJawaban, ChecklistLembar, Sesi } from '@/types'

/**
 * Sesi Siang dan Sore baru bisa diisi mulai jam ini. Backend menolak isian
 * yang lebih awal — samakan dengan JAM_BUKA di backend/app/routers/checklist.py.
 */
export const JAM_BUKA: Record<Sesi, number> = { Harian: 0, Pagi: 0, Siang: 11, Sore: 15 }
const URUTAN_SESI: Sesi[] = ['Harian', 'Pagi', 'Siang', 'Sore']

/** Item mode 'sesi' dicek tiga kali sehari; item 'harian' sekali. */
export function sesiItem(i: ChecklistItem): Sesi[] {
  return i.mode === 'sesi' ? ['Pagi', 'Siang', 'Sore'] : ['Harian']
}

type Isian = { status?: 'Ya' | 'Tidak'; catatan: string }
const kunci = (itemId: number, sesi: Sesi) => `${itemId}|${sesi}`

function terbuka(sesi: Sesi, tanggalIso: string, kini: Date) {
  // Tanggal yang sudah lewat semua sesinya terbuka.
  return tanggalIso < keIso(kini) || kini.getHours() >= JAM_BUKA[sesi]
}

/** Jam berdetak dipisah supaya tidak membuat seluruh lembar digambar ulang tiap detik. */
function JamBerjalan() {
  const t = useJamHidup()
  const p = (n: number) => String(n).padStart(2, '0')
  return (
    <span className="num inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-ink">
      <Ikon.Jam size={15} />
      {t.getDate()} {BULAN[t.getMonth()]} {t.getFullYear()} | {p(t.getHours())}.{p(t.getMinutes())}
    </span>
  )
}

function Kotak({
  jenis,
  aktif,
  disabled,
  onClick,
}: {
  jenis: 'Ya' | 'Tidak'
  aktif: boolean
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-label={jenis === 'Ya' ? 'Sudah dikerjakan' : 'Tidak / ada kendala'}
      aria-pressed={aktif}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'grid h-[22px] w-[22px] place-items-center rounded-[5px] border-2 transition disabled:cursor-not-allowed',
        aktif
          ? jenis === 'Ya'
            ? 'border-hijau bg-hijau text-white'
            : 'border-merah bg-merah text-white'
          : 'border-garis-kuat bg-white text-transparent enabled:hover:border-teks-samar',
      )}
    >
      {jenis === 'Ya' ? <Ikon.Centang size={14} strokeWidth={3} /> : <Ikon.Silang size={13} strokeWidth={3} />}
    </button>
  )
}

export function KerjaWajib() {
  // Lembar hari ini milik akun yang sedang masuk.
  const { data: lembar, setData: setLembar, memuat, galat, muat } = useApi<ChecklistLembar | null>(
    '/api/checklist/lembar',
    null,
  )
  const [isian, setIsian] = useState<Record<string, Isian>>({})
  const [tab, setTab] = useState<Sesi | null>(null)
  const [simpanan, setSimpanan] = useState<'diam' | 'menyimpan' | 'tersimpan'>('diam')
  const [galatSimpan, setGalatSimpan] = useState<string | null>(null)
  const [mengirim, setMengirim] = useState(false)

  // Cukup per setengah menit untuk membuka sesi Siang/Sore tepat waktu.
  const [kini, setKini] = useState(() => new Date())
  useEffect(() => {
    const t = window.setInterval(() => setKini(new Date()), 30_000)
    return () => window.clearInterval(t)
  }, [])

  // Isian dari server hanya dipasang sekali per tanggal; sesudahnya layar yang memegang.
  const dimuat = useRef<string | null>(null)
  useEffect(() => {
    if (!lembar || dimuat.current === lembar.tanggalIso) return
    dimuat.current = lembar.tanggalIso
    setIsian(
      Object.fromEntries(
        lembar.jawaban.map((j) => [kunci(j.itemId, j.sesi), { status: j.status, catatan: j.catatan }]),
      ),
    )
  }, [lembar])

  /* ---------------------------------------------------- simpan otomatis */

  const isianTerbaru = useRef(isian)
  isianTerbaru.current = isian
  const timer = useRef(0)
  const nomor = useRef(0)

  function susunJawaban(): ChecklistJawaban[] {
    return Object.entries(isianTerbaru.current).flatMap(([k, v]) => {
      if (!v.status) return []
      const [itemId, sesi] = k.split('|')
      return [{ itemId: Number(itemId), sesi: sesi as Sesi, status: v.status, catatan: v.catatan.trim() }]
    })
  }

  async function simpanKeServer(kirim: boolean) {
    if (!lembar) return
    const saya = ++nomor.current
    const hasil = await api<ChecklistLembar>('/api/checklist/lembar', 'PUT', {
      petugasId: lembar.petugasId,
      tanggal: lembar.tanggalIso,
      jawaban: susunJawaban(),
      kirim,
    })
    // Jawaban dari simpanan lama yang datang belakangan diabaikan.
    if (saya === nomor.current) setLembar(hasil)
  }

  async function simpanDraf() {
    timer.current = 0
    setSimpanan('menyimpan')
    try {
      await simpanKeServer(false)
      setSimpanan('tersimpan')
      setGalatSimpan(null)
    } catch (e) {
      setSimpanan('diam')
      setGalatSimpan(pesanGalat(e))
    }
  }

  function jadwalkanSimpan() {
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => void simpanDraf(), 800)
  }

  // Pindah halaman sebelum jeda habis: simpan saat itu juga.
  const simpanRef = useRef(simpanDraf)
  simpanRef.current = simpanDraf
  useEffect(
    () => () => {
      if (timer.current) {
        window.clearTimeout(timer.current)
        void simpanRef.current()
      }
    },
    [],
  )

  /* -------------------------------------------------------------- tampil */

  if (!lembar) {
    return (
      <Kartu>
        <StatusData memuat={memuat} galat={galat} onUlang={muat} />
      </Kartu>
    )
  }

  if (lembar.item.length === 0) {
    return (
      <Kartu>
        <div className="px-5 py-14 text-center">
          <span className="mx-auto mb-2.5 grid h-11 w-11 place-items-center rounded-full bg-[#F3F7F4] text-teks-samar">
            <Ikon.Daftar size={19} />
          </span>
          <b className="block text-[13.5px] font-semibold text-ink">
            Kerja wajib {JABATAN_PANJANG[lembar.jabatan]} belum disusun
          </b>
          <span className="mt-0.5 block text-[12px] text-teks-lembut">
            Daftarnya sedang disiapkan atasan. Halaman ini terisi otomatis begitu daftarnya ditambahkan.
          </span>
        </div>
      </Kartu>
    )
  }

  const tanggalIso = lembar.tanggalIso
  const daftarTab = URUTAN_SESI.filter((s) => lembar.item.some((i) => sesiItem(i).includes(s)))
  const tabTerbuka = daftarTab.filter((s) => terbuka(s, tanggalIso, kini))
  // Bawaan: sesi terbuka yang paling akhir, mis. Siang setelah pukul 11.00.
  const tabAktif = tab && tabTerbuka.includes(tab) ? tab : (tabTerbuka.at(-1) ?? daftarTab[0])
  const terkirim = lembar.status === 'Dikirim'
  const bisaUbah = lembar.bisaDiisi && !terkirim && terbuka(tabAktif, tanggalIso, kini) && !mengirim

  const itemTab = lembar.item.filter((i) => sesiItem(i).includes(tabAktif))
  const isiTab = (s: Sesi) =>
    lembar.item.filter((i) => sesiItem(i).includes(s) && isian[kunci(i.id, s)]?.status).length
  const totalTab = (s: Sesi) => lembar.item.filter((i) => sesiItem(i).includes(s)).length

  const semuaKotak = lembar.item.flatMap((i) => sesiItem(i).map((s) => isian[kunci(i.id, s)]))
  const sisa = semuaKotak.filter((v) => !v?.status).length
  const tanpaCatatan = semuaKotak.filter((v) => v?.status === 'Tidak' && !v.catatan.trim()).length
  const siapKirim = sisa === 0 && tanpaCatatan === 0

  function ubah(itemId: number, patch: Partial<Isian>) {
    const k = kunci(itemId, tabAktif)
    setIsian((s) => ({ ...s, [k]: { status: s[k]?.status, catatan: s[k]?.catatan ?? '', ...patch } }))
    jadwalkanSimpan()
  }

  function pilih(itemId: number, status: 'Ya' | 'Tidak') {
    const lama = isian[kunci(itemId, tabAktif)]?.status
    ubah(itemId, { status: lama === status ? undefined : status })
  }

  async function kirim() {
    if (!window.confirm('Kirim kerja wajib hari ini ke admin? Setelah dikirim, isian tidak bisa diubah lagi.')) return
    window.clearTimeout(timer.current)
    timer.current = 0
    setMengirim(true)
    setGalatSimpan(null)
    try {
      await simpanKeServer(true)
    } catch (e) {
      setGalatSimpan(pesanGalat(e))
    } finally {
      setMengirim(false)
    }
  }

  const n = isiTab(tabAktif)
  const m = totalTab(tabAktif)

  return (
    <Kartu>
      <div className="p-5">
        {daftarTab.length > 1 && (
          <div className="mb-4 grid grid-cols-3 gap-3">
            {daftarTab.map((s) => {
              const buka = tabTerbuka.includes(s)
              const aktif = s === tabAktif
              const lengkap = isiTab(s) === totalTab(s)
              const berjalan = s === tabTerbuka.at(-1) && tanggalIso === keIso(kini)
              return (
                <button
                  key={s}
                  type="button"
                  disabled={!buka}
                  aria-pressed={aktif}
                  onClick={() => setTab(s)}
                  className={cn(
                    'rounded-xl border px-3.5 py-3 text-left transition',
                    aktif
                      ? 'border-ink bg-white shadow-kartu'
                      : buka
                        ? 'border-garis-kuat bg-white hover:border-teks-samar'
                        : 'cursor-not-allowed border-garis-kuat bg-[#EEF2F0] text-teks-samar',
                  )}
                >
                  <b className={cn('flex items-center gap-1.5 text-[13.5px] font-bold', buka && 'text-ink')}>
                    {!buka && <Ikon.Kunci size={14} />}
                    {s}
                    {buka && lengkap && <Ikon.Centang size={14} className="text-hijau" strokeWidth={2.6} />}
                  </b>
                  <span className="mt-0.5 block text-[11px] text-teks-samar">
                    {!buka
                      ? `Dibuka pukul ${String(JAM_BUKA[s]).padStart(2, '0')}.00`
                      : berjalan && !lengkap
                        ? 'Sedang dibuka'
                        : `${isiTab(s)} dari ${totalTab(s)} terisi`}
                  </span>
                </button>
              )
            })}
          </div>
        )}

        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <b className="text-[13px] font-bold text-ink">
            {n} dari {m} kegiatan terisi
          </b>
          <JamBerjalan />
        </div>
        <div className="mb-2 h-2 overflow-hidden rounded-full bg-[#E3EAE6]">
          <div
            className="h-full rounded-full bg-hijau transition-[width] duration-300"
            style={{ width: `${m ? (n / m) * 100 : 0}%` }}
          />
        </div>
        <p className="m-0 mb-4 text-[11.5px] text-teks-samar">
          Centang ✓ bila sudah dikerjakan, ✗ bila tidak bisa dikerjakan atau ada kendala — lalu jelaskan di
          keterangan.
        </p>

        {terkirim && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-hijau/30 bg-hijau-lembut px-3.5 py-2.5 text-[12.5px] leading-relaxed text-hijau-tua">
            <Ikon.Centang size={15} className="mt-px flex-none" />
            <span>
              Sudah dikirim ke admin{lembar.dikirimPada ? ` pada ${lembar.dikirimPada}` : ''}. Isian terkunci —
              minta admin membuka kuncinya bila ada yang perlu diperbaiki.
            </span>
          </div>
        )}

        <ol className="m-0 grid list-none gap-3 p-0">
          {itemTab.map((i, nomorItem) => {
            const v = isian[kunci(i.id, tabAktif)]
            const wajibCatatan = v?.status === 'Tidak'
            return (
              <li key={i.id} className="rounded-xl border border-garis-kuat bg-white px-4 py-3.5">
                <div className="mb-2.5 flex items-start gap-3">
                  <span className="num w-5 flex-none pt-px text-[13.5px] font-bold text-ink">{nomorItem + 1}</span>
                  <b className="min-w-0 flex-1 text-[13.5px] font-semibold leading-snug text-ink">{i.teks}</b>
                  <div className="flex flex-none gap-2">
                    <Kotak jenis="Ya" aktif={v?.status === 'Ya'} disabled={!bisaUbah} onClick={() => pilih(i.id, 'Ya')} />
                    <Kotak
                      jenis="Tidak"
                      aktif={v?.status === 'Tidak'}
                      disabled={!bisaUbah}
                      onClick={() => pilih(i.id, 'Tidak')}
                    />
                  </div>
                </div>
                <input
                  value={v?.catatan ?? ''}
                  onChange={(e) => ubah(i.id, { catatan: e.target.value })}
                  disabled={!bisaUbah}
                  maxLength={500}
                  placeholder={wajibCatatan ? 'Keterangan (wajib): jelaskan kendalanya' : 'Keterangan (opsional)'}
                  className={cn(
                    'ml-8 w-[calc(100%-2rem)] rounded-full border bg-white px-4 py-2 text-[12.5px] transition focus:border-hijau focus:outline-none disabled:bg-[#F7FAF8]',
                    wajibCatatan && !v?.catatan.trim() ? 'border-merah/60' : 'border-garis-kuat',
                  )}
                />
              </li>
            )
          })}
        </ol>

        {galatSimpan && (
          <div className="mt-3.5 flex items-start gap-2 rounded-xl border border-merah/30 bg-merah-lembut px-3.5 py-2.5 text-[12px] leading-relaxed text-merah-teks">
            <Ikon.Awas size={14} className="mt-px flex-none" />
            <span>{galatSimpan}</span>
          </div>
        )}
      </div>

      {!terkirim && lembar.bisaDiisi && (
        <KakiForm>
          <span className="mr-auto self-center text-[12px] text-teks-lembut">
            {simpanan === 'menyimpan'
              ? 'Menyimpan…'
              : sisa > 0
                ? `${simpanan === 'tersimpan' ? 'Draf tersimpan · ' : ''}${sisa} kotak lagi sebelum bisa dikirim`
                : tanpaCatatan > 0
                  ? `${tanpaCatatan} jawaban ✗ belum diberi keterangan`
                  : 'Semua kotak terisi'}
          </span>
          <Tombol onClick={kirim} disabled={!siapKirim || mengirim || simpanan === 'menyimpan'}>
            <Ikon.Kirim size={15} /> {mengirim ? 'Mengirim…' : 'Kirim ke admin'}
          </Tombol>
        </KakiForm>
      )}
    </Kartu>
  )
}
