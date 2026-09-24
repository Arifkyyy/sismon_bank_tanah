import { useMemo, useState } from 'react'
import { PratinjauFoto } from '@/components/Foto'
import type { Rentang } from '@/components/RentangTanggal'
import { RentangTanggal } from '@/components/RentangTanggal'
import { StatCard } from '@/components/StatCard'
import {
  Baris, FotoKecil, InputRapi, IsiKartu, Kartu, KopKartu, Pil, PilihRapi, Segmen, Tabel, Tombol,
} from '@/components/ui'
import { StatusData } from '@/components/StatusData'
import { useLemburSaya } from '@/context/LemburContext'
import { Ikon } from '@/lib/ikon'
import { query } from '@/lib/api'
import { jendelaPeriode } from '@/lib/periode'
import type { Periode } from '@/lib/periode'
import { useApi } from '@/lib/useApi'
import { daftarBulan, formatRentang, formatTanggal, keIso } from '@/lib/tanggal'
import { cn } from '@/lib/util'
import type { Kendala, Logbook, Status } from '@/types'

/** Penanda jenis catatan: aktivitas, kendala, atau slot yang belum diisi. */
function TagJenis({ jenis }: { jenis: 'Aktivitas' | 'Kendala' }) {
  const warna = {
    Aktivitas: 'border-[#CFE3D6] bg-[#EDF6F0] text-hijau-tua',
    Kendala: 'border-[#F0DCAE] bg-[#FDF6E4] text-tanah-teks',
  }[jenis]
  return (
    <span className={cn('inline-flex items-center rounded-[7px] border px-2 py-0.5 text-[11.5px] font-semibold', warna)}>
      {jenis}
    </span>
  )
}

const BULAN_PILIHAN = daftarBulan()

type Saringan = 'Aktivitas dan kendala' | 'Aktivitas saja' | 'Kendala saja'

/** Satu baris tabel rincian, hasil gabungan logbook dan kendala. */
interface Rincian {
  id: string
  tanggalIso: string
  jam: string
  jenis: 'Aktivitas' | 'Kendala'
  keterangan: string
  status: Status
  foto: 'a' | 'b' | 'c'
  fotoUrl?: string[]
}

/** '07.02' → menit sejak tengah malam; dipakai mengurutkan dan menghitung jam kerja. */
function keMenit(jam: string): number {
  const [j, m] = jam.split(/[.:]/).map(Number)
  return (j || 0) * 60 + (m || 0)
}

/** Mengambil angka jam dari teks seperti '4 jam'. */
function jamDari(total: string): number {
  return Number.parseFloat(total.replace(',', '.')) || 0
}

export function RekapHarian() {
  const [pratinjau, setPratinjau] = useState<{ foto: string[]; judul: string } | null>(null)
  const [periode, setPeriode] = useState<Periode>('Harian')
  const [tanggal, setTanggal] = useState(() => keIso(new Date()))
  const [bulan, setBulan] = useState(BULAN_PILIHAN[0].kunci)
  const [rentang, setRentang] = useState<Rentang | null>(null)
  const [saringan, setSaringan] = useState<Saringan>('Aktivitas dan kendala')

  // Periode dikirim ke backend; backend sendiri sudah membatasi ke akun ini.
  const jendela = useMemo(
    () => jendelaPeriode(periode, tanggal, bulan, rentang),
    [periode, tanggal, bulan, rentang],
  )
  const params = jendela ? query({ dari: jendela.dari, sampai: jendela.sampai }) : null
  const pakaiAktivitas = saringan !== 'Kendala saja'
  const pakaiKendala = saringan !== 'Aktivitas saja'

  const catatan = useApi<Logbook[]>(params !== null && pakaiAktivitas ? `/api/logbook${params}` : null, [])
  const laporan = useApi<Kendala[]>(params !== null && pakaiKendala ? `/api/kendala${params}` : null, [])

  const memuat = catatan.memuat || laporan.memuat
  const galat = catatan.galat ?? laporan.galat
  const muatUlang = () => {
    catatan.muat()
    laporan.muat()
  }

  /** Logbook dan kendala digabung lalu diurutkan menaik seperti jalannya hari. */
  const rincian = useMemo<Rincian[]>(() => {
    const dariLogbook: Rincian[] = catatan.data.map((l) => ({
      id: `l-${l.id}`,
      tanggalIso: l.tanggalIso ?? '',
      jam: l.jam,
      jenis: 'Aktivitas',
      keterangan: l.keterangan,
      status: 'Selesai',
      foto: l.foto,
      fotoUrl: l.fotoUrl,
    }))
    const dariKendala: Rincian[] = laporan.data.map((k) => ({
      id: `k-${k.id}`,
      tanggalIso: k.tanggalIso ?? '',
      jam: k.jam,
      jenis: 'Kendala',
      keterangan: k.keterangan,
      status: k.status,
      foto: k.foto,
      fotoUrl: k.fotoUrl,
    }))
    return [...dariLogbook, ...dariKendala].sort(
      (a, b) => a.tanggalIso.localeCompare(b.tanggalIso) || keMenit(a.jam) - keMenit(b.jam),
    )
  }, [catatan.data, laporan.data])

  // Semua angka kartu berasal dari data yang sama dengan tabel di bawahnya.
  const jumlahCatatan = catatan.data.length
  const jumlahKendala = laporan.data.length

  /**
   * Jam kerja tercatat = jarak antara catatan pertama dan terakhir pada hari
   * yang sama. Backend tidak menyimpan jam masuk/pulang, jadi ini rentang nyata
   * yang terlihat dari logbook, bukan jadwal shift.
   */
  const jamKerja = useMemo(() => {
    const perHari = new Map<string, number[]>()
    for (const l of catatan.data) {
      const kunci = l.tanggalIso ?? ''
      perHari.set(kunci, [...(perHari.get(kunci) ?? []), keMenit(l.jam)])
    }
    let menit = 0
    for (const daftarMenit of perHari.values()) {
      if (daftarMenit.length < 2) continue
      menit += Math.max(...daftarMenit) - Math.min(...daftarMenit)
    }
    return Math.round((menit / 60) * 10) / 10
  }, [catatan.data])

  // Lembur yang sudah disetujui dan jatuh di dalam periode yang dipilih.
  const { riwayat } = useLemburSaya()
  const jamLembur = riwayat
    .filter((l) => l.status === 'Diterima' || l.status === 'Selesai')
    .filter((l) => !jendela?.dari || (l.tanggalIso >= jendela.dari && l.tanggalIso <= (jendela.sampai ?? '9999')))
    .reduce((n, l) => n + jamDari(l.total), 0)

  // Keterangan periode aktif, dipakai ulang di subjudul kartu.
  let labelPeriode: string
  switch (periode) {
    case 'Harian': {
      const t = formatTanggal(tanggal)
      labelPeriode = `${t.hari}, ${t.tanggal}`
      break
    }
    case 'Bulanan':
      labelPeriode = BULAN_PILIHAN.find((b) => b.kunci === bulan)?.label ?? bulan
      break
    case 'Custom':
      labelPeriode = rentang ? formatRentang(rentang.mulai, rentang.sampai) : 'Rentang tanggal belum dipilih'
      break
    default:
      labelPeriode = 'Seluruh periode'
  }

  return (
    <>
      <Kartu className="mb-4.5">
        <IsiKartu className="p-4">
          <Segmen
            lebar
            opsi={['Harian', 'Bulanan', 'Custom', 'All Time']}
            nilai={periode}
            onPilih={(v) => setPeriode(v as Periode)}
          />

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {periode === 'Harian' && (
              <InputRapi
                type="date"
                aria-label="Tanggal rekap"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
              />
            )}
            {periode === 'Bulanan' && (
              <PilihRapi value={bulan} onChange={(e) => setBulan(e.target.value)} className="min-w-[180px]">
                {BULAN_PILIHAN.map((b) => (
                  <option key={b.kunci} value={b.kunci}>
                    {b.label}
                  </option>
                ))}
              </PilihRapi>
            )}
            {periode === 'Custom' && <RentangTanggal nilai={rentang} onPilih={setRentang} className="w-[260px]" />}
            {periode === 'All Time' && (
              <span className="rounded-[10px] border border-garis bg-[#FAFCFB] px-3 py-2.5 text-[13px] text-teks-lembut">
                Seluruh catatan tanpa batas tanggal
              </span>
            )}

            <PilihRapi
              value={saringan}
              onChange={(e) => setSaringan(e.target.value as Saringan)}
              className="ml-auto"
            >
              <option>Aktivitas dan kendala</option>
              <option>Aktivitas saja</option>
              <option>Kendala saja</option>
            </PilihRapi>
            <Tombol varian="hantu" kecil>
              <Ikon.Unduh size={15} /> Unduh PDF
            </Tombol>
          </div>
        </IsiKartu>
      </Kartu>

      <div className="grid grid-cols-1 gap-4.5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard gaya="pekat" nama="Catatan" angka={String(jumlahCatatan)} ikon={<Ikon.Buku size={17} />} ket={labelPeriode} />
        <StatCard gaya="pekat" nama="Kendala dilaporkan" angka={String(jumlahKendala)} ikon={<Ikon.Awas size={17} />} ket={labelPeriode} />
        <StatCard gaya="pekat" nama="Jam kerja tercatat" angka={String(jamKerja)} satuan="jam" ikon={<Ikon.Jam size={17} />} ket="Dari catatan pertama sampai terakhir" />
        <StatCard gaya="pekat" nama="Jam lembur" angka={String(jamLembur)} satuan="jam" ikon={<Ikon.Jam size={17} />} ket="Lembur yang Anda terima" />
      </div>

      <div className="mt-4.5 grid grid-cols-1 gap-4.5 ">
        <Kartu>
          <KopKartu judul="Rincian catatan" sub={`Aktivitas dan kendala digabung berurutan · ${labelPeriode}`} />
          <StatusData memuat={memuat} galat={galat} onUlang={muatUlang} />
          <Tabel kepala={['Jam', 'Jenis', 'Foto', 'Keterangan', 'Status']}>
            {rincian.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center">
                  <span className="mx-auto mb-2.5 grid h-11 w-11 place-items-center rounded-full bg-[#F3F7F4] text-teks-samar">
                    <Ikon.Buku size={19} />
                  </span>
                  <b className="block text-[13.5px] font-semibold text-ink">
                    {memuat ? 'Memuat rincian…' : 'Belum ada catatan pada periode ini'}
                  </b>
                  <span className="mt-0.5 block text-[12px] text-teks-lembut">
                    {params === null
                      ? 'Pilih rentang tanggal dulu.'
                      : 'Catatan dan kendala yang Anda kirim akan muncul di sini.'}
                  </span>
                </td>
              </tr>
            ) : (
              rincian.map((r) => (
                <Baris key={r.id}>
                  <td className="num">{r.jam}</td>
                  <td>
                    <TagJenis jenis={r.jenis} />
                  </td>
                  <td>
                    <FotoKecil
                      varian={r.foto}
                      url={r.fotoUrl?.[0]}
                      onClick={() =>
                        r.fotoUrl?.length &&
                        setPratinjau({ foto: r.fotoUrl, judul: `Foto ${r.jenis.toLowerCase()} · ${r.jam}` })
                      }
                    />
                  </td>
                  <td className="whitespace-normal text-teks-lembut">{r.keterangan}</td>
                  <td>
                    <Pil status={r.status} />
                  </td>
                </Baris>
              ))
            )}
          </Tabel>
        </Kartu>

        
      </div>
      {pratinjau && (
        <PratinjauFoto foto={pratinjau.foto} judul={pratinjau.judul} onTutup={() => setPratinjau(null)} />
      )}
    </>
  )
}
