import { useEffect, useMemo, useRef, useState } from 'react'
import { Modal } from '@/components/Modal'
import { StatusData } from '@/components/StatusData'
import { KodeShift } from '@/components/shift/KodeShift'
import { AreaTeks, Avatar, Tombol } from '@/components/ui'
import { api, pesanGalat, query } from '@/lib/api'
import { Ikon } from '@/lib/ikon'
import { infoHari } from '@/lib/shift'
import { dariIso, formatTanggal, keIso } from '@/lib/tanggal'
import { useApi } from '@/lib/useApi'
import { cn } from '@/lib/util'
import type { HariRekan, JadwalSaya, RekanShift, Shift } from '@/types'

const ALASAN_CEPAT = ['Acara keluarga', 'Sakit', 'Keperluan pribadi', 'Urusan mendesak']
/** Berapa hari ke depan yang bisa dipilih, termasuk hari ini. */
const JANGKAUAN = 28

function geser(iso: string, n: number): string {
  const t = dariIso(iso)
  t.setDate(t.getDate() + n)
  return keIso(t)
}

function tanggalPendek(iso: string): string {
  const { hari, tanggal } = formatTanggal(iso)
  return `${hari.slice(0, 3)}, ${tanggal.slice(0, -5)}`
}

/** 'A', null → kotak kosong bergaris. */
function Kode({ shift, ukuran = 26 }: { shift?: Shift | null; ukuran?: number }) {
  return shift ? (
    <KodeShift shift={shift} ukuran={ukuran} />
  ) : (
    <span
      className="grid flex-none place-items-center rounded-lg border border-dashed border-garis-kuat text-teks-samar"
      style={{ width: ukuran, height: ukuran }}
    >
      –
    </span>
  )
}

/** Kenapa satu hari tidak bisa dipilih; '' berarti bisa. */
function alasanTakBisa(shift: Shift | null | undefined, diajukan: boolean, shiftSaya?: Shift | null): string {
  if (!shift) return 'Tidak ada jadwal'
  if (diajukan) return 'Sedang diajukan tukar'
  if (shiftSaya && shift.id === shiftSaya.id) return 'Shiftnya sama'
  return ''
}

/**
 * Pop-up tukar jadwal: pilih tanggal jadwal saya → pilih rekan → pilih tanggal
 * jadwal rekan (bawaannya tanggal yang sama) → alasan → kirim.
 *
 * Tanggal saya 7 ⇄ tanggal rekan 8 artinya rekan masuk menggantikan jadwal saya
 * di tanggal 7 dan saya masuk menggantikan jadwalnya di tanggal 8. Backend
 * menukar isi kotak kami berdua di kedua tanggal itu, jadi tidak ada yang
 * dobel jadwal.
 */
export function AjukanTukar({
  awal,
  onTutup,
  onTerkirim,
}: {
  /** tanggal jadwal saya yang langsung terpilih, mis. dari tombol di satu hari */
  awal?: string | null
  onTutup: () => void
  onTerkirim: () => void
}) {
  const [tanggalSaya, setTanggalSaya] = useState<string | null>(awal ?? null)
  const [rekan, setRekan] = useState<RekanShift | null>(null)
  const [tanggalRekan, setTanggalRekan] = useState<string | null>(null)
  const [alasan, setAlasan] = useState('')
  const [galat, setGalat] = useState('')
  const [mengirim, setMengirim] = useState(false)

  const rentang = useMemo(() => {
    const hariIni = keIso(new Date())
    return { dari: hariIni, sampai: geser(hariIni, JANGKAUAN - 1) }
  }, [])

  const jadwalSaya = useApi<JadwalSaya[]>(`/api/shift/saya${query(rentang)}`, [])
  const daftarRekan = useApi<RekanShift[]>(`/api/shift/rekan${query({ tanggal: rentang.dari })}`, [])
  const jadwalRekan = useApi<HariRekan[]>(
    rekan ? `/api/shift/rekan/${rekan.id}/jadwal${query(rentang)}` : null,
    [],
  )

  const sayaPada = (t: string) => jadwalSaya.data.find((h) => h.tanggal === t)?.shift
  const rekanPada = (t: string) => jadwalRekan.data.find((h) => h.tanggal === t)?.shift
  const shiftSaya = tanggalSaya ? sayaPada(tanggalSaya) : null

  /** Kenapa hari rekan itu tidak bisa diambil; shift yang sama hanya dilarang di tanggal yang sama. */
  function takBisaRekan(h: HariRekan) {
    return alasanTakBisa(h.shift, h.diajukanTukar, h.tanggal === tanggalSaya ? shiftSaya : null)
  }

  // Bawaan tanggal rekan = tanggal saya, asal hari itu bisa diambil.
  useEffect(() => {
    if (!tanggalSaya || jadwalRekan.memuat) return
    setTanggalRekan((kini) => {
      if (kini) return kini
      const sama = jadwalRekan.data.find((h) => h.tanggal === tanggalSaya)
      return sama && !takBisaRekan(sama) ? tanggalSaya : null
    })
    // takBisaRekan hanya membaca nilai yang sudah ada di daftar ini
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tanggalSaya, jadwalRekan.data, jadwalRekan.memuat])

  function pilihTanggalSaya(t: string) {
    setTanggalSaya(t)
    setTanggalRekan(null)
    setGalat('')
  }

  function pilihRekan(r: RekanShift) {
    if (r.id === rekan?.id) return
    jadwalRekan.setData([])
    setRekan(r)
    setTanggalRekan(null)
    setGalat('')
  }

  async function kirim() {
    if (!tanggalSaya || !rekan || !tanggalRekan) return
    if (!alasan.trim()) {
      setGalat('Tulis alasan singkat dulu, atau pilih salah satu alasan di atas.')
      return
    }
    setMengirim(true)
    setGalat('')
    try {
      await api('/api/shift/tukar', 'POST', {
        tanggalSaya,
        rekanId: rekan.id,
        tanggalRekan,
        alasan: alasan.trim(),
      })
      onTerkirim()
      onTutup()
    } catch (e) {
      setGalat(pesanGalat(e))
    } finally {
      setMengirim(false)
    }
  }

  const lengkap = !!tanggalSaya && !!rekan && !!tanggalRekan
  const siap = lengkap && !!alasan.trim()
  const depan = rekan?.nama.split(' ')[0] ?? ''

  return (
    <Modal
      judul="Tukar jadwal"
      sub="Pilih jadwal Anda dan jadwal rekan yang ingin ditukar"
      lebar="max-w-[540px]"
      onTutup={onTutup}
      aksi={
        <>
          <Tombol varian="hantu" onClick={onTutup} className="max-sm:flex-1">
            Batal
          </Tombol>
          <Tombol onClick={kirim} disabled={!siap || mengirim} className="max-sm:flex-[2]">
            <Ikon.Kirim size={15} /> {mengirim ? 'Mengirim…' : 'Kirim ajakan'}
          </Tombol>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-5">
        {/* Langkah 1: tanggal saya */}
        <section className="grid grid-cols-1 gap-2">
          <JudulBagian no={1} selesai={!!tanggalSaya}>
            Jadwal Anda tanggal berapa?
          </JudulBagian>
          <StatusData
            memuat={jadwalSaya.memuat && !jadwalSaya.data.length}
            galat={jadwalSaya.galat}
            onUlang={jadwalSaya.muat}
          />
          <PitaTanggal
            hari={jadwalSaya.data}
            dipilih={tanggalSaya}
            takBisa={(h) => alasanTakBisa(h.shift, h.diajukanTukar)}
            onPilih={pilihTanggalSaya}
          />
        </section>

        {/* Langkah 2: rekan */}
        {tanggalSaya && (
          <section className="grid grid-cols-1 gap-2">
            <JudulBagian no={2} selesai={!!rekan}>
              Tukar dengan siapa?
            </JudulBagian>
            <StatusData
              memuat={daftarRekan.memuat && !daftarRekan.data.length}
              galat={daftarRekan.galat}
              onUlang={daftarRekan.muat}
            />
            {!daftarRekan.memuat && !daftarRekan.data.length && !daftarRekan.galat && (
              <p className="m-0 rounded-xl bg-kertas py-5 text-center text-[12.5px] text-teks-samar">
                Belum ada rekan satu jabatan.
              </p>
            )}
            <div className="scrollbar-lembut -mx-1 grid max-h-[208px] grid-cols-1 gap-1.5 overflow-y-auto px-1 py-0.5 sm:grid-cols-2">
              {daftarRekan.data.map((r) => {
                const pilih = rekan?.id === r.id
                return (
                  <button
                    key={r.id}
                    type="button"
                    aria-pressed={pilih}
                    onClick={() => pilihRekan(r)}
                    className={cn(
                      'flex min-w-0 items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left transition',
                      pilih ? 'border-hijau bg-hijau-lembut ring-2 ring-hijau/20' : 'border-garis bg-white hover:border-hijau/60',
                    )}
                  >
                    <Avatar nama={r.nama} foto={r.fotoProfil} ukuran={30} />
                    <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-ink">{r.nama}</span>
                    {r.status === 'Cuti' && (
                      <span className="flex-none rounded-full bg-emas-lembut px-1.5 py-px text-[10px] font-semibold text-emas-teks">
                        Cuti
                      </span>
                    )}
                    <span
                      className={cn(
                        'grid h-5 w-5 flex-none place-items-center rounded-full border transition',
                        pilih ? 'border-hijau bg-hijau text-white' : 'border-garis-kuat',
                      )}
                    >
                      {pilih && <Ikon.Centang size={12} />}
                    </span>
                  </button>
                )
              })}
            </div>
          </section>
        )}

        {/* Langkah 3: tanggal rekan */}
        {tanggalSaya && rekan && (
          <section className="grid grid-cols-1 gap-2">
            <JudulBagian no={3} selesai={!!tanggalRekan}>
              {`Ambil jadwal ${depan} tanggal berapa?`}
            </JudulBagian>
            <p className="m-0 -mt-1 text-[12px] leading-snug text-teks-lembut">
              Biasanya tanggal yang sama. Bisa juga tanggal lain, mis. Anda tanggal 7 ⇄ {depan} tanggal 8.
            </p>
            <StatusData
              memuat={jadwalRekan.memuat && !jadwalRekan.data.length}
              galat={jadwalRekan.galat}
              onUlang={jadwalRekan.muat}
            />
            <PitaTanggal
              hari={jadwalRekan.data}
              dipilih={tanggalRekan}
              tandai={tanggalSaya}
              takBisa={takBisaRekan}
              onPilih={(t) => {
                setTanggalRekan(t)
                setGalat('')
              }}
            />
          </section>
        )}

        {lengkap && (
          <Ringkasan
            tanggalSaya={tanggalSaya}
            tanggalRekan={tanggalRekan}
            namaRekan={depan}
            saya={sayaPada}
            rekan={rekanPada}
          />
        )}

        {/* Langkah 4: alasan */}
        {lengkap && (
          <section className="grid grid-cols-1 gap-2">
            <JudulBagian no={4} selesai={!!alasan.trim()}>
              Alasannya apa?
            </JudulBagian>
            <div className="flex flex-wrap gap-1.5">
              {ALASAN_CEPAT.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => {
                    setAlasan(a)
                    setGalat('')
                  }}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-[12px] font-medium transition',
                    alasan === a
                      ? 'border-hijau bg-hijau text-white'
                      : 'border-garis bg-white text-teks-lembut hover:border-hijau/60 hover:text-ink',
                  )}
                >
                  {a}
                </button>
              ))}
            </div>
            <AreaTeks
              maxLength={500}
              rows={2}
              placeholder="Atau tulis alasan sendiri…"
              value={alasan}
              onChange={(e) => {
                setAlasan(e.target.value)
                if (galat) setGalat('')
              }}
            />
          </section>
        )}

        {galat && (
          <div className="flex items-start gap-2 rounded-xl border border-merah/30 bg-merah-lembut px-3 py-2 text-[12px] leading-relaxed text-merah-teks">
            <Ikon.Awas size={14} className="mt-px flex-none" />
            <span>{galat}</span>
          </div>
        )}

        <Alur />
      </div>
    </Modal>
  )
}

function JudulBagian({ no, selesai, children }: { no: number; selesai: boolean; children: string }) {
  return (
    <h4 className="m-0 flex items-center gap-2 text-[13.5px] font-bold text-ink">
      <span
        className={cn(
          'grid h-5 w-5 flex-none place-items-center rounded-full text-[11px] font-bold transition',
          selesai ? 'bg-hijau text-white' : 'bg-kertas text-teks-lembut',
        )}
      >
        {selesai ? <Ikon.Centang size={12} /> : no}
      </span>
      {children}
    </h4>
  )
}

/** Deretan hari yang bisa digeser ke samping; hari yang terpilih otomatis digulir ke tengah. */
function PitaTanggal<H extends { tanggal: string; hari: string; shift?: Shift | null }>({
  hari,
  dipilih,
  tandai,
  takBisa,
  onPilih,
}: {
  hari: H[]
  dipilih: string | null
  /** tanggal yang diberi garis bawah, mis. tanggal jadwal saya di pita milik rekan */
  tandai?: string | null
  takBisa: (h: H) => string
  onPilih: (tanggal: string) => void
}) {
  const wadah = useRef<HTMLDivElement>(null)
  const sasaran = dipilih ?? tandai

  useEffect(() => {
    const el = sasaran ? wadah.current?.querySelector<HTMLElement>(`[data-tanggal="${sasaran}"]`) : null
    if (!el || !wadah.current) return
    const w = wadah.current
    w.scrollTo({ left: el.offsetLeft - w.offsetLeft - (w.clientWidth - el.clientWidth) / 2, behavior: 'smooth' })
  }, [sasaran, hari.length])

  return (
    <div ref={wadah} className="scrollbar-lembut relative -mx-1 flex snap-x gap-1.5 overflow-x-auto px-1 pb-1.5 pt-0.5">
      {hari.map((h, i) => {
        const mati = takBisa(h)
        const pilih = dipilih === h.tanggal
        const info = infoHari(h.tanggal)
        const awalBulan = i === 0 || info.tanggal === 1
        return (
          <button
            key={h.tanggal}
            type="button"
            data-tanggal={h.tanggal}
            disabled={!!mati}
            title={mati || h.shift?.nama}
            aria-label={`${h.hari} ${formatTanggal(h.tanggal).tanggal}: ${mati || h.shift?.nama}`}
            aria-pressed={pilih}
            onClick={() => onPilih(h.tanggal)}
            className={cn(
              'relative flex w-[54px] flex-none snap-start flex-col items-center gap-1 rounded-xl border px-1 pb-2 pt-1.5 transition',
              'disabled:cursor-not-allowed disabled:opacity-35',
              pilih
                ? 'border-hijau bg-hijau-lembut ring-2 ring-hijau/25'
                : 'border-garis bg-white enabled:hover:border-hijau/60',
            )}
          >
            <span className="text-[10px] font-semibold uppercase leading-none text-teks-samar">
              {awalBulan ? formatTanggal(h.tanggal).tanggal.slice(3, 6) : info.hari}
            </span>
            <span className="num text-[16px] font-bold leading-none text-ink">{info.tanggal}</span>
            <Kode shift={h.shift} ukuran={24} />
            {tandai === h.tanggal && (
              <span className="absolute inset-x-3 -bottom-px h-[3px] rounded-full bg-hijau" aria-hidden />
            )}
          </button>
        )
      })}
    </div>
  )
}

/** Yang dipilih (saya ⇄ rekan), lalu jadwal kami berdua setelah disetujui. */
function Ringkasan({
  tanggalSaya,
  tanggalRekan,
  namaRekan,
  saya,
  rekan,
}: {
  tanggalSaya: string
  tanggalRekan: string
  namaRekan: string
  saya: (t: string) => Shift | null | undefined
  rekan: (t: string) => Shift | null | undefined
}) {
  const tanggal = [...new Set([tanggalSaya, tanggalRekan])].sort()
  const baris = [
    { nama: 'Anda', dari: saya, ke: rekan },
    { nama: namaRekan, dari: rekan, ke: saya },
  ]
  return (
    <div className="grid grid-cols-1 gap-3 rounded-2xl border border-dashed border-hijau/40 bg-[#F7FBF8] p-3 sm:p-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
        <Pihak nama="Jadwal Anda" tanggal={tanggalSaya} shift={saya(tanggalSaya)} />
        <span className="grid h-8 w-8 place-items-center rounded-full bg-white text-hijau-tua ring-1 ring-hijau/30">
          <Ikon.Tukar size={15} />
        </span>
        <Pihak nama={`Jadwal ${namaRekan}`} tanggal={tanggalRekan} shift={rekan(tanggalRekan)} />
      </div>

      <div className="grid grid-cols-1 gap-1.5 border-t border-hijau/20 pt-2.5">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-hijau-tua">Setelah disetujui</span>
        <div
          className="grid items-center gap-x-3 gap-y-1.5 text-[12.5px]"
          style={{ gridTemplateColumns: `minmax(0,auto) repeat(${tanggal.length}, max-content)` }}
        >
          <span />
          {tanggal.map((t) => (
            <span key={t} className="text-[11px] font-semibold text-teks-lembut">
              {tanggalPendek(t)}
            </span>
          ))}
          {baris.map((b) => (
            <Baris key={b.nama} nama={b.nama} tanggal={tanggal} dari={b.dari} ke={b.ke} />
          ))}
        </div>
      </div>
    </div>
  )
}

function Pihak({ nama, tanggal, shift }: { nama: string; tanggal: string; shift?: Shift | null }) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-xl bg-white px-2.5 py-2 ring-1 ring-garis">
      <Kode shift={shift} ukuran={32} />
      <span className="min-w-0">
        <span className="block truncate text-[11px] font-semibold text-teks-lembut">{nama}</span>
        <b className="block truncate text-[12.5px] font-bold text-ink">{tanggalPendek(tanggal)}</b>
      </span>
    </div>
  )
}

function Baris({
  nama,
  tanggal,
  dari,
  ke,
}: {
  nama: string
  tanggal: string[]
  dari: (t: string) => Shift | null | undefined
  ke: (t: string) => Shift | null | undefined
}) {
  return (
    <>
      <span className="truncate font-semibold text-ink">{nama}</span>
      {tanggal.map((t) => {
        const lama = dari(t)
        const baru = ke(t)
        const berubah = (lama?.id ?? null) !== (baru?.id ?? null)
        return (
          <span key={t} className="flex items-center gap-1" title={baru?.nama ?? 'Tidak ada jadwal'}>
            <span className={cn(berubah && 'opacity-40')}>
              <Kode shift={lama} ukuran={22} />
            </span>
            {berubah && (
              <>
                <Ikon.Chevron size={12} className="flex-none text-teks-samar" />
                <Kode shift={baru} ukuran={22} />
              </>
            )}
          </span>
        )
      })}
    </>
  )
}

/** Penjelasan alur dalam bahasa sederhana supaya tidak ada yang mengira jadwal langsung berubah. */
function Alur() {
  const langkah = ['Rekan setuju', 'Admin menyetujui', 'Jadwal berubah']
  return (
    <ol className="m-0 flex list-none flex-wrap items-center gap-x-1.5 gap-y-1 rounded-xl bg-kertas px-3 py-2.5 text-[11px] text-teks-lembut">
      {langkah.map((l, i) => (
        <li key={l} className="flex items-center gap-1.5">
          {i > 0 && <Ikon.Chevron size={11} className="flex-none text-teks-samar" />}
          <span className="grid h-4 w-4 flex-none place-items-center rounded-full bg-white text-[9.5px] font-bold text-ink">
            {i + 1}
          </span>
          <span className="whitespace-nowrap">{l}</span>
        </li>
      ))}
    </ol>
  )
}
