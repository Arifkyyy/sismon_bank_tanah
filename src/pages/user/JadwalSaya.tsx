import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { StatusData } from '@/components/StatusData'
import { AjukanTukar } from '@/components/shift/AjukanTukar'
import { KartuTukar } from '@/components/shift/KartuTukar'
import { KodeShift } from '@/components/shift/KodeShift'
import { ModalAlasan } from '@/components/shift/ModalAlasan'
import { IsiKartu, Kartu, KopKartu, Segmen, Tombol, TombolIkon } from '@/components/ui'
import { useKonfirmasi } from '@/context/KonfirmasiContext'
import { api, pesanGalat, query } from '@/lib/api'
import { Ikon } from '@/lib/ikon'
import { ARSIR_AKHIR_PEKAN, geserPeriode, infoHari, labelJam, periodeDari } from '@/lib/shift'
import { dariIso, keIso } from '@/lib/tanggal'
import { useApi } from '@/lib/useApi'
import { cn } from '@/lib/util'
import type { JadwalSaya, TukarShift } from '@/types'

type Tampilan = '7 hari' | 'Kalender'
const HARI_SENIN = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']

/**
 * Jadwal shift milik petugas yang sedang masuk: 7 hari ke depan atau
 * kalender sebulan, lalu daftar permintaan tukar miliknya.
 */
export function JadwalSayaUser() {
  const [tampilan, setTampilan] = useState<Tampilan>('7 hari')
  const [acuan, setAcuan] = useState(() => new Date())
  const [dipilih, setDipilih] = useState<string | null>(null)
  const hariIni = keIso(new Date())

  const bulan = useMemo(() => periodeDari('Bulan', acuan), [acuan])
  const tujuhHari = useApi<JadwalSaya[]>('/api/shift/saya', [])
  const sebulan = useApi<JadwalSaya[]>(
    tampilan === 'Kalender' ? `/api/shift/saya${query({ dari: bulan.dari, sampai: bulan.sampai })}` : null,
    [],
  )
  const tukar = useApi<TukarShift[]>('/api/shift/tukar/saya', [])

  const sumber = tampilan === '7 hari' ? tujuhHari : sebulan
  const hariDipilih = sebulan.data.find((h) => h.tanggal === dipilih)
  const kosongAwal = (dariIso(bulan.dari).getDay() + 6) % 7

  const berjalan = tukar.data.filter((t) => t.status === 'Menunggu Rekan' || t.status === 'Menunggu Admin')
  const selesai = tukar.data.filter((t) => !berjalan.includes(t))
  const perluJawaban = berjalan.filter((t) => t.peranSaya === 'rekan' && t.status === 'Menunggu Rekan')
  const lainnya = berjalan.filter((t) => !perluJawaban.includes(t))

  const konfirmasi = useKonfirmasi()
  const [ajukan, setAjukan] = useState<JadwalSaya | null>(null)
  const [tolak, setTolak] = useState<TukarShift | null>(null)
  const [sibuk, setSibuk] = useState<number | null>(null)
  const [pesan, setPesan] = useState('')

  /** Muat ulang semua yang bisa berubah karena tukar shift, termasuk angka di menu. */
  function segarkan() {
    void tukar.muat()
    void tujuhHari.muat()
    if (tampilan === 'Kalender') void sebulan.muat()
    window.dispatchEvent(new Event('shift-berubah'))
  }

  async function jalankan(t: TukarShift, aksi: () => Promise<unknown>) {
    setSibuk(t.id)
    setPesan('')
    try {
      await aksi()
      segarkan()
    } catch (e) {
      setPesan(pesanGalat(e))
    } finally {
      setSibuk(null)
    }
  }

  async function setuju(t: TukarShift) {
    const ya = await konfirmasi({
      judul: 'Setuju tukar shift?',
      pesan: `Permintaan dari ${t.pemohon.nama} diteruskan ke admin. Jadwal baru berubah setelah admin menyetujuinya.`,
      tombol: 'Setuju',
    })
    if (ya) await jalankan(t, () => api(`/api/shift/tukar/${t.id}/jawab`, 'POST', { setuju: true }))
  }

  async function batal(t: TukarShift) {
    const ya = await konfirmasi({
      judul: 'Batalkan permintaan?',
      pesan: `Ajakan tukar shift dengan ${t.rekan.nama} dibatalkan, dan ${t.rekan.nama} diberi tahu.`,
      tombol: 'Batalkan permintaan',
      nada: 'peringatan',
    })
    if (ya) await jalankan(t, () => api(`/api/shift/tukar/${t.id}/batal`, 'POST'))
  }

  function aksiTukar(t: TukarShift) {
    if (t.status === 'Menunggu Rekan' && t.peranSaya === 'rekan') {
      return (
        <>
          <Tombol varian="bahaya" kecil onClick={() => setTolak(t)} disabled={sibuk === t.id}>
            <Ikon.Silang size={14} /> Tolak
          </Tombol>
          <Tombol kecil onClick={() => void setuju(t)} disabled={sibuk === t.id}>
            <Ikon.Centang size={14} /> Setuju
          </Tombol>
        </>
      )
    }
    if ((t.status === 'Menunggu Rekan' || t.status === 'Menunggu Admin') && t.peranSaya === 'pemohon') {
      return (
        <Tombol varian="hantu" kecil onClick={() => void batal(t)} disabled={sibuk === t.id}>
          Batalkan permintaan
        </Tombol>
      )
    }
    return undefined
  }

  /** Tombol Ajukan tukar: hanya untuk hari ini/sesudahnya yang sudah punya shift dan belum diajukan. */
  function tombolAjukan(h: JadwalSaya) {
    if (h.tanggal < hariIni || !h.shift || h.diajukanTukar) return undefined
    return (
      <Tombol varian="hantu" kecil onClick={() => setAjukan(h)}>
        <Ikon.Tukar size={14} /> Ajukan tukar
      </Tombol>
    )
  }

  return (
    <div className="grid gap-4.5">
      <Kartu>
        <KopKartu
          judul="Jadwal shift saya"
          sub={tampilan === '7 hari' ? 'Hari ini dan 6 hari ke depan' : bulan.label}
          aksi={
            <Segmen
              opsi={['7 hari', 'Kalender']}
              nilai={tampilan}
              onPilih={(v) => {
                setTampilan(v as Tampilan)
                setDipilih(null)
              }}
            />
          }
        />
        <StatusData memuat={sumber.memuat && !sumber.data.length} galat={sumber.galat} onUlang={sumber.muat} />

        {tampilan === '7 hari' && (
          <IsiKartu className="grid gap-2">
            {tujuhHari.data.map((h) => (
              <BarisHari key={h.tanggal} hari={h} hariIni={hariIni} aksi={tombolAjukan(h)} />
            ))}
          </IsiKartu>
        )}

        {tampilan === 'Kalender' && (
          <IsiKartu>
            <div className="mb-3 flex items-center justify-center gap-2">
              <TombolIkon label="Bulan sebelumnya" onClick={() => setAcuan((a) => geserPeriode('Bulan', a, -1))}>
                <Ikon.Chevron size={15} className="rotate-180" />
              </TombolIkon>
              <b className="min-w-[150px] text-center text-[14px] font-bold text-ink">{bulan.label}</b>
              <TombolIkon label="Bulan berikutnya" onClick={() => setAcuan((a) => geserPeriode('Bulan', a, 1))}>
                <Ikon.Chevron size={15} />
              </TombolIkon>
            </div>

            <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
              {HARI_SENIN.map((h) => (
                <span key={h} className="pb-1 text-center text-[11px] font-semibold text-teks-samar">
                  {h}
                </span>
              ))}
              {Array.from({ length: kosongAwal }, (_, i) => (
                <span key={`k${i}`} />
              ))}
              {bulan.tanggal.map((t) => {
                const h = sebulan.data.find((x) => x.tanggal === t)
                const info = infoHari(t)
                const pilih = dipilih === t
                return (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={pilih}
                    aria-label={`${h?.hari ?? ''} ${h?.tanggalTeks ?? t}: ${h?.shift?.nama ?? 'belum dijadwalkan'}`}
                    onClick={() => setDipilih(pilih ? null : t)}
                    className={cn(
                      'relative flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border transition sm:aspect-auto sm:py-2',
                      pilih ? 'border-hijau ring-2 ring-hijau/30' : 'border-garis hover:border-hijau',
                      t === hariIni ? 'bg-hijau-lembut' : 'bg-white',
                    )}
                    style={info.akhirPekan && t !== hariIni ? { backgroundImage: ARSIR_AKHIR_PEKAN } : undefined}
                  >
                    <span className={cn('num text-[11px] font-semibold', t === hariIni ? 'text-hijau-tua' : 'text-teks-lembut')}>
                      {info.tanggal}
                    </span>
                    {h?.shift ? (
                      <KodeShift shift={h.shift} ukuran={24} />
                    ) : (
                      <span className="grid h-6 w-6 place-items-center rounded-md border border-dashed border-garis-kuat text-[11px] text-teks-samar">
                        –
                      </span>
                    )}
                    {h?.tukar && (
                      <span className="absolute right-1 top-1 text-ink">
                        <Ikon.Tukar size={10} />
                      </span>
                    )}
                    {h?.diajukanTukar && <span className="absolute bottom-1 right-1 h-2 w-2 rounded-full bg-emas" />}
                  </button>
                )
              })}
            </div>

            {hariDipilih && (
              <div className="mt-3.5">
                <BarisHari hari={hariDipilih} hariIni={hariIni} aksi={tombolAjukan(hariDipilih)} />
              </div>
            )}
          </IsiKartu>
        )}
      </Kartu>

      <Kartu>
        <KopKartu
          judul="Permintaan tukar saya"
          sub="Yang Anda ajukan dan yang ditujukan kepada Anda"
        />
        <StatusData memuat={tukar.memuat && !tukar.data.length} galat={tukar.galat} onUlang={tukar.muat} />
        <IsiKartu className="grid gap-3">
          {pesan && (
            <div className="flex items-start gap-2 rounded-xl border border-merah/30 bg-merah-lembut px-3.5 py-2.5 text-[12.5px] text-merah-teks">
              <Ikon.Awas size={15} className="mt-px flex-none" />
              <span className="flex-1">{pesan}</span>
            </div>
          )}
          {!tukar.memuat && !tukar.data.length && (
            <p className="m-0 py-4 text-center text-[12.5px] text-teks-samar">Belum ada permintaan tukar shift.</p>
          )}
          {perluJawaban.length > 0 && (
            <p className="m-0 text-[11px] font-bold uppercase tracking-wide text-emas-teks">Perlu jawaban Anda</p>
          )}
          {[...perluJawaban, ...lainnya].map((t) => (
            <KartuTukar key={t.id} tukar={t} aksi={aksiTukar(t)} />
          ))}
          {selesai.length > 0 && berjalan.length > 0 && (
            <p className="m-0 mt-1 text-[11px] font-bold uppercase tracking-wide text-teks-samar">Riwayat</p>
          )}
          {selesai.map((t) => (
            <KartuTukar key={t.id} tukar={t} />
          ))}
        </IsiKartu>
      </Kartu>

      {ajukan && <AjukanTukar hari={ajukan} onTutup={() => setAjukan(null)} onTerkirim={segarkan} />}
      {tolak && (
        <ModalAlasan
          judul="Tolak ajakan tukar shift?"
          sub={`Dari ${tolak.pemohon.nama}`}
          wajib={false}
          tombol="Tolak"
          onTutup={() => setTolak(null)}
          onKirim={async (alasan) => {
            await api(`/api/shift/tukar/${tolak.id}/jawab`, 'POST', { setuju: false, alasan })
            segarkan()
          }}
        />
      )}
    </div>
  )
}

/** Satu hari di daftar: tanggal, shift, dan tanda tukar. `aksi` untuk tombol di kanan. */
function BarisHari({ hari: h, hariIni, aksi }: { hari: JadwalSaya; hariIni: string; aksi?: ReactNode }) {
  const kini = h.tanggal === hariIni
  const label = h.shift ? labelJam(h.shift) : ''
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-3 rounded-xl border px-3.5 py-2.5',
        kini ? 'border-hijau/40 bg-hijau-lembut' : 'border-garis bg-white',
      )}
    >
      <div className="w-[52px] flex-none text-center">
        <span className={cn('block text-[11px] font-semibold', kini ? 'text-hijau-tua' : 'text-teks-samar')}>
          {kini ? 'Hari ini' : h.hari}
        </span>
        <span className="num block text-[18px] font-bold leading-tight text-ink">{infoHari(h.tanggal).tanggal}</span>
      </div>
      {h.shift ? (
        <KodeShift shift={h.shift} ukuran={36} />
      ) : (
        <span className="grid h-9 w-9 flex-none place-items-center rounded-lg border border-dashed border-garis-kuat text-teks-samar">
          –
        </span>
      )}
      <div className="min-w-0 flex-1">
        <b className="block text-[13.5px] font-semibold text-ink">{h.shift?.nama ?? 'Belum dijadwalkan'}</b>
        <span className="num block text-[12px] text-teks-lembut">
          {h.tanggalTeks}
          {h.shift?.rentang && ` · ${h.shift.rentang}`}
          {label && ` · ${label}`}
        </span>
        {(h.tukar || h.diajukanTukar) && (
          <span className="mt-1 flex flex-wrap gap-1.5">
            {h.tukar && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#EEF2F0] px-2 py-0.5 text-[10.5px] font-semibold text-teks-lembut">
                <Ikon.Tukar size={11} /> Hasil tukar shift
              </span>
            )}
            {h.diajukanTukar && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emas-lembut px-2 py-0.5 text-[10.5px] font-semibold text-emas-teks">
                Sedang diajukan tukar
              </span>
            )}
          </span>
        )}
      </div>
      {aksi}
    </div>
  )
}
