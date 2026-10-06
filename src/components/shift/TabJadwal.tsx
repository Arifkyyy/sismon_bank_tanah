import { Fragment, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { StatusData } from '@/components/StatusData'
import { IsiMassal } from '@/components/shift/IsiMassal'
import type { IsianMassal } from '@/components/shift/IsiMassal'
import { KodeShift } from '@/components/shift/KodeShift'
import { PilihShiftKotak } from '@/components/shift/PilihShiftKotak'
import { Avatar, InputRapi, Kartu, PilihRapi, Segmen, Tombol, TombolIkon } from '@/components/ui'
import { useKonfirmasi } from '@/context/KonfirmasiContext'
import { api, GalatApi, pesanGalat, query } from '@/lib/api'
import { Ikon } from '@/lib/ikon'
import {
  ARSIR_AKHIR_PEKAN, geserPeriode, infoHari, labelJam, periodeDari, unduhJadwal,
} from '@/lib/shift'
import type { ModePeriode } from '@/lib/shift'
import { formatTanggal, keIso } from '@/lib/tanggal'
import { useApi } from '@/lib/useApi'
import { cn, DAFTAR_JABATAN, JABATAN_PANJANG } from '@/lib/util'
import type { HasilMassal, Jabatan, JadwalPeriode, KotakJadwal, PetugasJadwal, Shift } from '@/types'

const kunci = (petugasId: number, tanggal: string) => `${petugasId}|${tanggal}`
const arsir = (aktif: boolean): CSSProperties | undefined =>
  aktif ? { backgroundImage: ARSIR_AKHIR_PEKAN } : undefined

/** Libur di paling akhir, sisanya urut jam mulai. */
function urutShift(a: Shift, b: Shift): number {
  return Number(a.sistem) - Number(b.sistem) || (a.mulai ?? '').localeCompare(b.mulai ?? '')
}

interface KotakTerbuka {
  petugas: PetugasJadwal
  tanggal: string
  jangkar: HTMLElement
}

/**
 * Tab "Jadwal": tabel petugas × tanggal. Di layar lebar berupa tabel dengan
 * kolom nama dan baris tanggal yang menempel saat digulir; di HP berupa
 * daftar per hari. Klik kotak untuk memilih shift.
 */
export function TabJadwal() {
  const konfirmasi = useKonfirmasi()
  const [mode, setMode] = useState<ModePeriode>('Minggu')
  const [acuan, setAcuan] = useState(() => new Date())
  const [jabatan, setJabatan] = useState<Jabatan | 'Semua'>('Semua')
  const [cari, setCari] = useState('')
  const [pesan, setPesan] = useState<{ nada: 'baik' | 'buruk'; teks: string } | null>(null)
  const [terbuka, setTerbuka] = useState<KotakTerbuka | null>(null)
  const [menyimpan, setMenyimpan] = useState<string | null>(null)
  const [sibuk, setSibuk] = useState(false)
  const [massal, setMassal] = useState(false)
  const [tanggalHp, setTanggalHp] = useState<string | null>(null)

  const periode = useMemo(() => periodeDari(mode, acuan), [mode, acuan])
  const jadwal = useApi<JadwalPeriode | null>(
    `/api/shift/jadwal${query({ dari: periode.dari, sampai: periode.sampai })}`,
    null,
  )
  const jenis = useApi<Shift[]>('/api/shift/jenis?semua=true', [])
  const hariIni = keIso(new Date())

  const petaShift = useMemo(() => new Map(jenis.data.map((s) => [s.id, s])), [jenis.data])
  const petaKotak = useMemo(
    () => new Map((jadwal.data?.kotak ?? []).map((k) => [kunci(k.petugasId, k.tanggal), k])),
    [jadwal.data],
  )
  const terlihat = useMemo(() => {
    const kata = cari.trim().toLowerCase()
    return (jadwal.data?.petugas ?? []).filter(
      (p) => (jabatan === 'Semua' || p.jabatan === jabatan) && p.nama.toLowerCase().includes(kata),
    )
  }, [jadwal.data, jabatan, cari])
  const kelompok = DAFTAR_JABATAN.map((j) => ({ jabatan: j, petugas: terlihat.filter((p) => p.jabatan === j) })).filter(
    (k) => k.petugas.length,
  )

  // Shift yang muncul di periode ini (untuk ringkasan) dan untuk legenda (ditambah semua yang aktif).
  const shiftTerpakai = useMemo(() => {
    const ids = new Set(terlihat.flatMap((p) => periode.tanggal.map((t) => petaKotak.get(kunci(p.id, t))?.shiftId)))
    return jenis.data.filter((s) => ids.has(s.id)).sort(urutShift)
  }, [terlihat, periode, petaKotak, jenis.data])
  const legenda = useMemo(
    () => jenis.data.filter((s) => s.aktif || shiftTerpakai.includes(s)).sort(urutShift),
    [jenis.data, shiftTerpakai],
  )

  function pilihanUntuk(p: PetugasJadwal): Shift[] {
    return jenis.data.filter((s) => s.aktif && (s.sistem || s.jabatan.includes(p.jabatan))).sort(urutShift)
  }

  function lapor(h: HasilMassal) {
    const bagian = [h.diisi ? `${h.diisi} kotak diisi` : 'Tidak ada kotak yang berubah']
    if (h.dilewati) bagian.push(`${h.dilewati} dilewati karena shiftnya nonaktif atau tidak cocok jabatan`)
    if (h.tukarDibatalkan) bagian.push(`${h.tukarDibatalkan} permintaan tukar dibatalkan otomatis`)
    setPesan({ nada: 'baik', teks: `${bagian.join(' · ')}.` })
  }

  /** Kirim dengan timpa=false; bila backend menjawab 409 (ada kotak terisi), tanya dulu lalu kirim ulang. */
  async function denganTimpa(kirim: (timpa: boolean) => Promise<HasilMassal>): Promise<HasilMassal | null> {
    try {
      return await kirim(false)
    } catch (e) {
      if (!(e instanceof GalatApi && e.status === 409)) throw e
      const ya = await konfirmasi({ judul: 'Timpa jadwal?', pesan: e.message, tombol: 'Timpa', nada: 'peringatan' })
      return ya ? kirim(true) : null
    }
  }

  async function atur(p: PetugasJadwal, tanggal: string, shiftId: number | null) {
    setTerbuka(null)
    setMenyimpan(kunci(p.id, tanggal))
    setPesan(null)
    try {
      const hasil = await api<{ kotak: KotakJadwal | null; tukarDibatalkan: number }>('/api/shift/jadwal', 'PUT', {
        petugasId: p.id,
        tanggal,
        shiftId,
      })
      jadwal.setData(
        (d) =>
          d && {
            ...d,
            kotak: [
              ...d.kotak.filter((k) => !(k.petugasId === p.id && k.tanggal === tanggal)),
              ...(hasil.kotak ? [hasil.kotak] : []),
            ],
          },
      )
      if (hasil.tukarDibatalkan) {
        setPesan({
          nada: 'baik',
          teks: `${hasil.tukarDibatalkan} permintaan tukar shift dibatalkan otomatis karena jadwalnya diubah.`,
        })
        void jadwal.muat()
      }
    } catch (e) {
      setPesan({ nada: 'buruk', teks: pesanGalat(e) })
    } finally {
      setMenyimpan(null)
    }
  }

  async function salin() {
    const lalu = periodeDari(mode, geserPeriode(mode, acuan, -1))
    const ya = await konfirmasi({
      judul: `Salin jadwal ${mode === 'Minggu' ? 'minggu' : 'bulan'} sebelumnya?`,
      pesan: `Jadwal ${lalu.label} disalin ke ${periode.label}${
        jabatan === 'Semua' ? '' : ` untuk ${JABATAN_PANJANG[jabatan]}`
      }. Kotak yang kosong di periode sebelumnya tidak mengosongkan kotak di periode ini.`,
      tombol: 'Salin',
    })
    if (!ya) return
    setSibuk(true)
    setPesan(null)
    try {
      const hasil = await denganTimpa((timpa) =>
        api<HasilMassal>('/api/shift/jadwal/salin', 'POST', {
          mode: mode === 'Minggu' ? 'minggu' : 'bulan',
          dari: periode.dari,
          sampai: periode.sampai,
          jabatan: jabatan === 'Semua' ? null : jabatan,
          timpa,
        }),
      )
      if (hasil) {
        lapor(hasil)
        void jadwal.muat()
      }
    } catch (e) {
      setPesan({ nada: 'buruk', teks: pesanGalat(e) })
    } finally {
      setSibuk(false)
    }
  }

  async function kirimMassal(isi: IsianMassal): Promise<HasilMassal | null> {
    const hasil = await denganTimpa((timpa) =>
      api<HasilMassal>('/api/shift/jadwal/massal', 'POST', { ...isi, timpa }),
    )
    if (hasil) {
      lapor(hasil)
      void jadwal.muat()
    }
    return hasil
  }

  function unduh() {
    if (!jadwal.data) return
    const saringan = [jabatan === 'Semua' ? '' : JABATAN_PANJANG[jabatan], cari.trim() && `nama memuat "${cari.trim()}"`]
      .filter(Boolean)
      .join(', ')
    unduhJadwal(jadwal.data, periode, petaShift, new Set(terlihat.map((p) => p.id)), saringan)
  }

  function bukaKotak(p: PetugasJadwal, tanggal: string, jangkar: HTMLElement) {
    setTerbuka((t) => (t && t.petugas.id === p.id && t.tanggal === tanggal ? null : { petugas: p, tanggal, jangkar }))
  }

  const kotakTerbuka = terbuka ? petaKotak.get(kunci(terbuka.petugas.id, terbuka.tanggal)) : undefined
  const hariHp =
    tanggalHp && periode.tanggal.includes(tanggalHp)
      ? tanggalHp
      : periode.tanggal.includes(hariIni)
        ? hariIni
        : periode.dari
  const lebarKolom = mode === 'Minggu' ? 'min-w-[92px]' : 'min-w-[42px]'

  /** Satu kotak jadwal yang bisa diklik. Fungsi biasa, bukan komponen, supaya tidak dibuat ulang tiap render. */
  function sel(p: PetugasJadwal, t: string) {
    const k = petaKotak.get(kunci(p.id, t))
    const s = k ? petaShift.get(k.shiftId) : undefined
    const memuat = menyimpan === kunci(p.id, t)
    return (
      <button
        type="button"
        disabled={memuat}
        aria-label={`${p.nama}, ${formatTanggal(t).tanggal}: ${s ? s.nama : 'belum dijadwalkan'}`}
        title={s ? `${s.nama}${s.rentang ? ` · ${s.rentang}` : ''}${k?.tukar ? ' · hasil tukar shift' : ''}` : undefined}
        onClick={(e) => bukaKotak(p, t, e.currentTarget)}
        className={cn(
          'relative mx-auto flex flex-col items-center gap-0.5 rounded-lg p-0.5 transition hover:ring-2 hover:ring-hijau/40',
          memuat && 'animate-pulse',
          terbuka?.petugas.id === p.id && terbuka.tanggal === t && 'ring-2 ring-hijau',
        )}
      >
        {s ? (
          <KodeShift shift={s} ukuran={30} />
        ) : (
          <span className="grid h-[30px] w-[30px] place-items-center rounded-lg border border-dashed border-garis-kuat bg-white/70 text-teks-samar">
            –
          </span>
        )}
        {mode === 'Minggu' && (
          <span className="max-w-[80px] truncate text-[10.5px] leading-tight text-teks-lembut">{s?.nama ?? ' '}</span>
        )}
        {k?.tukar && (
          <span className="absolute -right-1 -top-1 grid h-[15px] w-[15px] place-items-center rounded-full bg-white text-ink shadow ring-1 ring-garis-kuat">
            <Ikon.Tukar size={10} />
          </span>
        )}
        {k?.diajukanTukar && (
          <span
            title="Sedang diajukan tukar"
            className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emas ring-2 ring-white"
          />
        )}
      </button>
    )
  }

  return (
    <div className="grid gap-4.5">
      <Kartu>
        {/* ------------------------------------------------------------ toolbar */}
        {/* HP: tiga baris — segmen, navigasi periode, lalu jabatan + cari berdampingan. */}
        <div className="flex flex-wrap items-center gap-2.5 border-b border-garis px-5 py-4 max-sm:flex-col max-sm:items-stretch max-sm:gap-2 max-sm:px-3.5 max-sm:py-3">
          <div className="max-sm:[&>div]:flex max-sm:[&>div]:w-full max-sm:[&_button]:flex-1">
            <Segmen opsi={['Minggu', 'Bulan']} nilai={mode} onPilih={(v) => setMode(v as ModePeriode)} />
          </div>
          {/* sm:contents — di layar besar pembungkus ini hilang, susunan tetap seperti semula. */}
          <div className="flex items-center gap-2 sm:contents">
            <div className="flex items-center gap-1.5 max-sm:min-w-0 max-sm:flex-1">
              <TombolIkon label="Periode sebelumnya" onClick={() => setAcuan((a) => geserPeriode(mode, a, -1))}>
                <Ikon.Chevron size={15} className="rotate-180" />
              </TombolIkon>
              <b className="num min-w-[132px] text-center text-[13.5px] font-bold text-ink max-sm:min-w-0 max-sm:flex-1">
                {periode.label}
              </b>
              <TombolIkon label="Periode berikutnya" onClick={() => setAcuan((a) => geserPeriode(mode, a, 1))}>
                <Ikon.Chevron size={15} />
              </TombolIkon>
            </div>
            <Tombol
              varian="hantu"
              kecil
              onClick={() => setAcuan(new Date())}
              disabled={periode.tanggal.includes(hariIni)}
              className="max-sm:flex-none"
            >
              Hari ini
            </Tombol>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:ml-auto max-sm:grid max-sm:grid-cols-2">
            <PilihRapi
              aria-label="Jabatan"
              value={jabatan}
              onChange={(e) => setJabatan(e.target.value as Jabatan | 'Semua')}
              className="max-sm:w-full max-sm:min-w-0"
            >
              <option value="Semua">Semua jabatan</option>
              {DAFTAR_JABATAN.map((j) => (
                <option key={j} value={j}>
                  {JABATAN_PANJANG[j]}
                </option>
              ))}
            </PilihRapi>
            <InputRapi
              type="search"
              aria-label="Cari nama"
              placeholder="Cari nama…"
              className="w-[160px] max-sm:w-full max-sm:min-w-0"
              value={cari}
              onChange={(e) => setCari(e.target.value)}
            />
          </div>
        </div>

        {/* HP: "Isi massal" selebar penuh, salin + export berdampingan sama lebar. */}
        <div className="flex flex-wrap items-center gap-2 border-b border-garis bg-[#FAFCFB] px-5 py-3 max-sm:grid max-sm:grid-cols-2 max-sm:px-3.5">
          <Tombol
            kecil
            onClick={() => setMassal(true)}
            disabled={!jadwal.data || !jenis.data.length}
            className="max-sm:col-span-2 max-sm:w-full"
          >
            <Ikon.Tambah size={14} /> Isi massal
          </Tombol>
          <Tombol
            varian="hantu"
            kecil
            onClick={salin}
            disabled={sibuk || !jadwal.data}
            className="max-sm:w-full max-sm:min-w-0"
          >
            <Ikon.Putar size={14} />
            <span className="max-sm:hidden">Salin {mode === 'Minggu' ? 'minggu' : 'bulan'} sebelumnya</span>
            <span className="sm:hidden">Salin {mode === 'Minggu' ? 'minggu' : 'bulan'} lalu</span>
          </Tombol>
          <Tombol
            varian="hantu"
            kecil
            onClick={unduh}
            disabled={!jadwal.data || !terlihat.length}
            className="max-sm:w-full max-sm:min-w-0"
          >
            <Ikon.Unduh size={14} /> Export Excel
          </Tombol>
          {jadwal.memuat && jadwal.data && (
            <span className="text-[12px] text-teks-samar max-sm:col-span-2">Memuat…</span>
          )}
        </div>

        {pesan && (
          <div
            className={cn(
              'mx-5 mt-3 flex items-start gap-2 rounded-xl border px-3.5 py-2.5 text-[12.5px]',
              pesan.nada === 'baik'
                ? 'border-hijau/30 bg-hijau-lembut text-hijau-tua'
                : 'border-merah/30 bg-merah-lembut text-merah-teks',
            )}
          >
            <span className="flex-1">{pesan.teks}</span>
            <button type="button" aria-label="Tutup" onClick={() => setPesan(null)} className="opacity-70 hover:opacity-100">
              <Ikon.Silang size={14} />
            </button>
          </div>
        )}

        <StatusData memuat={jadwal.memuat && !jadwal.data} galat={jadwal.galat ?? jenis.galat} onUlang={jadwal.muat} />

        {jadwal.data && !terlihat.length && (
          <p className="m-0 px-5 py-10 text-center text-[13px] text-teks-samar">
            {jadwal.data.petugas.length ? 'Tidak ada petugas yang cocok dengan saringan.' : 'Belum ada petugas aktif.'}
          </p>
        )}

        {/* ------------------------------------------------- tabel (layar lebar) */}
        {jadwal.data && terlihat.length > 0 && (
          <div className="scrollbar-lembut hidden max-h-[640px] overflow-auto overscroll-contain md:block">
            <table className="border-separate border-spacing-0 text-[12.5px]">
              <thead>
                <tr>
                  <th className="sticky left-0 top-0 z-[4] min-w-[220px] border-b border-r border-garis bg-[#FAFCFB] px-4 py-2.5 text-left text-[11.5px] font-semibold text-teks-samar">
                    Petugas
                  </th>
                  {periode.tanggal.map((t) => {
                    const h = infoHari(t)
                    const kini = t === hariIni
                    return (
                      <th
                        key={t}
                        className={cn(
                          'sticky top-0 z-[2] border-b border-garis px-1 py-2 text-center',
                          lebarKolom,
                          kini ? 'bg-hijau-lembut' : 'bg-[#FAFCFB]',
                        )}
                        style={arsir(h.akhirPekan && !kini)}
                      >
                        <span className={cn('block text-[10.5px] font-semibold', kini ? 'text-hijau-tua' : 'text-teks-samar')}>
                          {h.hari}
                        </span>
                        <span className={cn('num block text-[13px] font-bold', kini ? 'text-hijau-tua' : 'text-ink')}>
                          {h.tanggal}
                        </span>
                      </th>
                    )
                  })}
                </tr>
              </thead>

              <tbody>
                {kelompok.map((g) => (
                  <Fragment key={g.jabatan}>
                    <tr>
                      <td
                        colSpan={periode.tanggal.length + 1}
                        className="border-b border-garis bg-kertas px-4 py-1.5 text-[11.5px] font-bold uppercase tracking-wide text-teks-lembut"
                      >
                        <span className="sticky left-4">
                          {JABATAN_PANJANG[g.jabatan]} · {g.petugas.length} petugas
                        </span>
                      </td>
                    </tr>
                    {g.petugas.map((p) => (
                      <tr key={p.id}>
                        <td className="sticky left-0 z-[1] min-w-[220px] border-b border-r border-garis bg-white px-4 py-1.5">
                          <div className="flex items-center gap-2.5">
                            <Avatar nama={p.nama} jabatan={p.jabatan} foto={p.fotoProfil} ukuran={28} />
                            <b className="truncate text-[13px] font-semibold text-ink">{p.nama}</b>
                            {p.status === 'Cuti' && (
                              <span className="flex-none rounded-full bg-emas-lembut px-2 py-0.5 text-[10.5px] font-semibold text-emas-teks">
                                Cuti
                              </span>
                            )}
                          </div>
                        </td>
                        {periode.tanggal.map((t) => {
                          const h = infoHari(t)
                          const kini = t === hariIni
                          return (
                            <td
                              key={t}
                              className={cn('border-b border-garis px-0.5 py-1 text-center', kini && 'bg-hijau-lembut/50')}
                              style={arsir(h.akhirPekan && !kini)}
                            >
                              {sel(p, t)}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>

              {/* Ringkasan: hanya informasi, tidak ada aturan jumlah minimal. */}
              <tfoot>
                <tr>
                  <td
                    colSpan={periode.tanggal.length + 1}
                    className="border-b border-garis bg-kertas px-4 py-1.5 text-[11.5px] font-bold uppercase tracking-wide text-teks-lembut"
                  >
                    <span className="sticky left-4">Jumlah petugas per shift</span>
                  </td>
                </tr>
                {[...shiftTerpakai, null].map((s) => (
                  <tr key={s?.id ?? 'kosong'}>
                    <td className="sticky left-0 z-[1] border-b border-r border-garis bg-[#FAFCFB] px-4 py-1.5">
                      <div className="flex items-center gap-2">
                        {s ? (
                          <KodeShift shift={s} ukuran={20} />
                        ) : (
                          <span className="grid h-5 w-5 place-items-center rounded-md border border-dashed border-garis-kuat text-[10px] text-teks-samar">
                            –
                          </span>
                        )}
                        <span className="text-[12px] text-teks-lembut">{s?.nama ?? 'Belum dijadwalkan'}</span>
                      </div>
                    </td>
                    {periode.tanggal.map((t) => {
                      const n = terlihat.filter((p) => {
                        const k = petaKotak.get(kunci(p.id, t))
                        return s ? k?.shiftId === s.id : !k
                      }).length
                      return (
                        <td
                          key={t}
                          className={cn(
                            'num border-b border-garis bg-[#FAFCFB] px-1 py-1.5 text-center text-[12px]',
                            n ? 'font-semibold text-ink' : 'text-teks-samar/60',
                          )}
                        >
                          {n || '·'}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tfoot>
            </table>
          </div>
        )}

        {/* ------------------------------------------------------ daftar (HP) */}
        {jadwal.data && terlihat.length > 0 && (
          <div className="md:hidden">
            {/* Minggu: 7 hari muat tanpa digeser (grid). Bulan: tetap bisa digeser ke samping. */}
            <div
              className={cn(
                'border-b border-garis py-3',
                mode === 'Minggu'
                  ? 'grid grid-cols-7 gap-1 px-3.5'
                  : 'scrollbar-lembut flex gap-1.5 overflow-x-auto px-4',
              )}
            >
              {periode.tanggal.map((t) => {
                const h = infoHari(t)
                const pilih = t === hariHp
                return (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={pilih}
                    onClick={() => setTanggalHp(t)}
                    className={cn(
                      'flex flex-col items-center rounded-xl border py-1.5 transition',
                      mode === 'Minggu' ? 'min-w-0 gap-0.5 px-0' : 'min-w-[46px] flex-none px-2',
                      pilih ? 'border-hijau bg-hijau text-white' : 'border-garis bg-white text-ink',
                      !pilih && t === hariIni && 'border-hijau text-hijau-tua',
                    )}
                    style={arsir(h.akhirPekan && !pilih)}
                  >
                    <span className={cn('text-[10.5px] font-semibold', pilih ? 'text-white/85' : 'text-teks-samar')}>
                      {h.hari}
                    </span>
                    <span className="num text-[15px] font-bold">{h.tanggal}</span>
                  </button>
                )
              })}
            </div>
            <div className="flex flex-wrap gap-1.5 px-4 pt-3">
              {shiftTerpakai.map((s) => {
                const n = terlihat.filter((p) => petaKotak.get(kunci(p.id, hariHp))?.shiftId === s.id).length
                return n ? (
                  <span
                    key={s.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-garis bg-white py-0.5 pl-0.5 pr-2.5 text-[11.5px] text-teks-lembut"
                  >
                    <KodeShift shift={s} ukuran={20} className="rounded-full" />
                    <b className="num text-ink">{n}</b>
                  </span>
                ) : null
              })}
            </div>
            {kelompok.map((g) => (
              <div key={g.jabatan} className="px-4 pb-1 pt-3">
                <p className="m-0 mb-1.5 text-[11px] font-bold uppercase tracking-wide text-teks-samar">
                  {JABATAN_PANJANG[g.jabatan]}
                </p>
                <div className="overflow-hidden rounded-xl border border-garis">
                  {g.petugas.map((p) => {
                    const k = petaKotak.get(kunci(p.id, hariHp))
                    const s = k ? petaShift.get(k.shiftId) : undefined
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={(e) => bukaKotak(p, hariHp, e.currentTarget)}
                        className="flex w-full items-center gap-2.5 border-b border-garis bg-white px-3 py-2.5 text-left last:border-b-0 active:bg-kertas"
                      >
                        <Avatar nama={p.nama} jabatan={p.jabatan} foto={p.fotoProfil} ukuran={30} />
                        <span className="min-w-0 flex-1">
                          <b className="block truncate text-[13px] font-semibold text-ink">{p.nama}</b>
                          <span className="block truncate text-[11.5px] text-teks-samar">
                            {s ? `${s.nama}${s.rentang ? ` · ${s.rentang}` : ''}` : 'Belum dijadwalkan'}
                            {k?.tukar && ' · ⇄ hasil tukar'}
                            {p.status === 'Cuti' && ' · Cuti'}
                          </span>
                        </span>
                        {s ? (
                          <KodeShift shift={s} ukuran={30} />
                        ) : (
                          <span className="grid h-[30px] w-[30px] place-items-center rounded-lg border border-dashed border-garis-kuat text-teks-samar">
                            –
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
            <div className="h-3" />
          </div>
        )}

        {/* --------------------------------------------------------- legenda */}
        {legenda.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-garis px-5 py-3.5 text-[11.5px] text-teks-lembut">
            {legenda.map((s) => (
              <span key={s.id} className="inline-flex items-center gap-1.5">
                <KodeShift shift={s} ukuran={20} />
                <span>
                  <b className="font-semibold text-ink">{s.nama}</b>
                  {s.rentang && ` ${s.rentang}`}
                  {labelJam(s) && ` (${labelJam(s)})`}
                  {!s.aktif && ' · nonaktif'}
                </span>
              </span>
            ))}
            <span className="inline-flex items-center gap-1.5">
              <span className="grid h-[15px] w-[15px] place-items-center rounded-full bg-white text-ink ring-1 ring-garis-kuat">
                <Ikon.Tukar size={10} />
              </span>
              hasil tukar shift
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emas" /> sedang diajukan tukar
            </span>
            <span className="hidden items-center gap-1.5 md:inline-flex">
              <span className="h-4 w-5 rounded border border-garis" style={{ backgroundImage: ARSIR_AKHIR_PEKAN }} />
              Sabtu–Minggu
            </span>
          </div>
        )}
      </Kartu>

      {terbuka && (
        <PilihShiftKotak
          jangkar={terbuka.jangkar}
          petugas={terbuka.petugas}
          tanggal={terbuka.tanggal}
          pilihan={pilihanUntuk(terbuka.petugas)}
          sekarang={kotakTerbuka ? (petaShift.get(kotakTerbuka.shiftId) ?? null) : null}
          diajukanTukar={!!kotakTerbuka?.diajukanTukar}
          onPilih={(id) => void atur(terbuka.petugas, terbuka.tanggal, id)}
          onTutup={() => setTerbuka(null)}
        />
      )}

      {massal && jadwal.data && (
        <IsiMassal
          petugas={jadwal.data.petugas}
          shift={jenis.data}
          jabatanAwal={jabatan === 'Semua' ? 'Security' : jabatan}
          dari={periode.dari}
          sampai={periode.sampai}
          onKirim={kirimMassal}
          onTutup={() => setMassal(false)}
        />
      )}
    </div>
  )
}
