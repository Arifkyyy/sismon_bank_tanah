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
  /** pop-up tukar jadwal; `awal` = tanggal yang langsung terpilih */
  const [ajukan, setAjukan] = useState<{ awal: string | null } | null>(null)
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
      <Tombol varian="hantu" kecil onClick={() => setAjukan({ awal: h.tanggal })}>
        <Ikon.Tukar size={14} /> Tukar jadwal
      </Tombol>
    )
  }

  const bisaTukar = tujuhHari.data.some((h) => tombolAjukan(h))

  return (
    // Layar lebar: jadwal di kiri, permintaan tukar di kolom kanan. Di bawahnya satu kolom.
    <div className="grid gap-4.5 xl:grid-cols-[minmax(0,1fr)_minmax(360px,420px)] xl:items-start">
      {perluJawaban.length > 0 && (
        <button
          type="button"
          onClick={() => document.getElementById('permintaan-tukar')?.scrollIntoView({ behavior: 'smooth' })}
          className="flex items-center gap-3 rounded-kartu border border-emas/40 bg-emas-lembut px-3.5 py-3 text-left transition hover:brightness-[0.98] sm:px-4 xl:col-span-2"
        >
          <span className="grid h-9 w-9 flex-none place-items-center rounded-full bg-white text-emas-teks">
            <Ikon.Tukar size={17} />
          </span>
          <span className="min-w-0 flex-1">
            <b className="block text-[13px] font-bold leading-snug text-ink sm:text-[13.5px]">
              {perluJawaban.length === 1
                ? `${perluJawaban[0].pemohon.nama} mengajak Anda tukar shift`
                : `${perluJawaban.length} ajakan tukar shift menunggu jawaban Anda`}
            </b>
            <span className="block text-[12px] text-teks-lembut">Ketuk untuk melihat dan menjawab</span>
          </span>
          <Ikon.Chevron size={16} className="flex-none rotate-90 text-emas-teks" />
        </button>
      )}

      <Kartu>
        <KopKartu
          judul="Jadwal shift saya"
          sub={tampilan === '7 hari' ? 'Hari ini dan 6 hari ke depan' : bulan.label}
          aksi={
            <>
              <Segmen
                opsi={['7 hari', 'Kalender']}
                nilai={tampilan}
                onPilih={(v) => {
                  setTampilan(v as Tampilan)
                  setDipilih(null)
                }}
              />
              <Tombol kecil onClick={() => setAjukan({ awal: null })}>
                <Ikon.Tukar size={14} /> Tukar jadwal
              </Tombol>
            </>
          }
        />
        <StatusData memuat={sumber.memuat && !sumber.data.length} galat={sumber.galat} onUlang={sumber.muat} />

        {tampilan === '7 hari' && (
          <IsiKartu className="grid gap-2 max-sm:p-3">
            {bisaTukar && (
              <p className="m-0 mb-1 flex items-start gap-2 rounded-xl bg-kertas px-3 py-2 text-[12px] leading-snug text-teks-lembut">
                <Ikon.Info size={14} className="mt-px flex-none text-hijau-tua" />
                <span>
                  Berhalangan masuk? Tekan <b className="font-semibold text-ink">Tukar jadwal</b>, pilih tanggal
                  Anda, lalu pilih rekan dan tanggal jadwalnya.
                </span>
              </p>
            )}
            {tujuhHari.data.map((h) => (
              <BarisHari key={h.tanggal} hari={h} hariIni={hariIni} aksi={tombolAjukan(h)} />
            ))}
          </IsiKartu>
        )}

        {tampilan === 'Kalender' && (
          <IsiKartu className="max-sm:p-3">
            <div className="mb-3 flex items-center justify-between gap-2 sm:justify-center">
              <TombolIkon label="Bulan sebelumnya" onClick={() => setAcuan((a) => geserPeriode('Bulan', a, -1))}>
                <Ikon.Chevron size={15} className="rotate-180" />
              </TombolIkon>
              <b className="text-center text-[14px] font-bold text-ink sm:min-w-[150px]">{bulan.label}</b>
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
                      'relative flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg border py-1.5 transition',
                      'sm:min-h-[64px] sm:gap-1 sm:rounded-xl sm:py-2 lg:min-h-[72px]',
                      pilih ? 'border-hijau ring-2 ring-hijau/30' : 'border-garis hover:border-hijau',
                      t === hariIni ? 'bg-hijau-lembut' : 'bg-white',
                    )}
                    style={info.akhirPekan && t !== hariIni ? { backgroundImage: ARSIR_AKHIR_PEKAN } : undefined}
                  >
                    <span
                      className={cn(
                        'num text-[11px] font-semibold sm:text-[12px]',
                        t === hariIni ? 'text-hijau-tua' : 'text-teks-lembut',
                      )}
                    >
                      {info.tanggal}
                    </span>
                    {h?.shift ? (
                      <KodeShift
                        shift={h.shift}
                        ukuran={22}
                        className="rounded-md sm:!h-7 sm:!w-7 sm:!text-[11px]"
                      />
                    ) : (
                      <span className="grid h-[22px] w-[22px] place-items-center rounded-md border border-dashed border-garis-kuat text-[11px] text-teks-samar sm:h-7 sm:w-7">
                        –
                      </span>
                    )}
                    {h?.tukar && (
                      <span className="absolute right-0.5 top-0.5 text-ink sm:right-1.5 sm:top-1.5">
                        <Ikon.Tukar size={10} />
                      </span>
                    )}
                    {h?.diajukanTukar && (
                      <span className="absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full bg-emas sm:bottom-1.5 sm:right-1.5 sm:h-2 sm:w-2" />
                    )}
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
        <span id="permintaan-tukar" className="block scroll-mt-24" />
        <KopKartu
          judul="Permintaan tukar saya"
          sub="Yang Anda ajukan dan yang ditujukan kepada Anda"
        />
        <StatusData memuat={tukar.memuat && !tukar.data.length} galat={tukar.galat} onUlang={tukar.muat} />
        <IsiKartu className="grid gap-3 max-sm:p-3 xl:p-4">
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
            <KartuTukar key={t.id} tukar={t} aksi={aksiTukar(t)} sempitXl />
          ))}
          {selesai.length > 0 && berjalan.length > 0 && (
            <p className="m-0 mt-1 text-[11px] font-bold uppercase tracking-wide text-teks-samar">Riwayat</p>
          )}
          {selesai.map((t) => (
            <KartuTukar key={t.id} tukar={t} sempitXl />
          ))}
        </IsiKartu>
      </Kartu>

      {ajukan && <AjukanTukar awal={ajukan.awal} onTutup={() => setAjukan(null)} onTerkirim={segarkan} />}
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
  const jam = [h.shift?.rentang, h.shift ? labelJam(h.shift) : ''].filter(Boolean).join(' · ')
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border px-3 py-2.5 sm:px-3.5',
        kini ? 'border-hijau/40 bg-hijau-lembut' : 'border-garis bg-white',
      )}
    >
      <div className="w-11 flex-none text-center sm:w-[52px]">
        <span className={cn('block text-[11px] font-semibold', kini ? 'text-hijau-tua' : 'text-teks-samar')}>
          {kini ? 'Hari ini' : h.hari}
        </span>
        <span className="num block text-[18px] font-bold leading-tight text-ink">{infoHari(h.tanggal).tanggal}</span>
      </div>
      {h.shift ? (
        <KodeShift shift={h.shift} ukuran={34} />
      ) : (
        <span className="grid h-[34px] w-[34px] flex-none place-items-center rounded-lg border border-dashed border-garis-kuat text-teks-samar">
          –
        </span>
      )}
      <div className="min-w-0 flex-1">
        <b className="block truncate text-[13.5px] font-semibold text-ink">{h.shift?.nama ?? 'Belum dijadwalkan'}</b>
        <span className="num block text-[12px] leading-snug text-teks-lembut">
          {/* di HP tanggal lengkap disembunyikan: hari & tanggal sudah tampil di kolom kiri */}
          <span className="max-sm:hidden">
            {h.tanggalTeks}
            {jam && ' · '}
          </span>
          {jam}
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
      {aksi && (
        <div className="flex flex-none justify-end max-sm:w-full max-sm:border-t max-sm:border-garis/70 max-sm:pt-2 max-sm:[&>*]:w-full">
          {aksi}
        </div>
      )}
    </div>
  )
}
