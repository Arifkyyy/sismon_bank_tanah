import { Link } from 'react-router-dom'
import { Linimasa } from '@/components/Linimasa'
import { StatCard } from '@/components/StatCard'
import { IsiKartu, Kartu, KopKartu, Tombol } from '@/components/ui'
import { KartuLembur } from '@/pages/user/Lembur'
import { StatusData } from '@/components/StatusData'
import { AKAR } from '@/config/menu'
import { useAuth } from '@/context/AuthContext'
import { useLemburSaya } from '@/context/LemburContext'
import { Ikon } from '@/lib/ikon'
import { query } from '@/lib/api'
import { useApi } from '@/lib/useApi'
import { formatTanggal, keIso } from '@/lib/tanggal'
import type { Kendala, Logbook } from '@/types'

/** Mengambil angka jam dari teks seperti '4 jam'. */
function jamDari(total: string): number {
  return Number.parseFloat(total.replace(',', '.')) || 0
}

export function DashboardUser() {
  const akar = AKAR.user
  const { akun } = useAuth()
  const { menunggu, riwayat } = useLemburSaya()

  const hariIniIso = keIso(new Date())
  const awalBulan = `${hariIniIso.slice(0, 7)}-01`
  const HARI_INI = (() => {
    const t = formatTanggal(hariIniIso)
    return `${t.hari}, ${t.tanggal}`
  })()

  // Backend membatasi sendiri ke akun yang sedang masuk.
  const hariIni = useApi<Logbook[]>(`/api/logbook${query({ tanggal: hariIniIso })}`, [])
  const bulanIni = useApi<Logbook[]>(
    `/api/logbook${query({ dari: awalBulan, sampai: hariIniIso })}`,
    [],
  )
  const kendalaBulanIni = useApi<Kendala[]>(
    `/api/kendala${query({ dari: awalBulan, sampai: hariIniIso })}`,
    [],
  )

  // Hari berbeda yang punya minimal satu catatan pada bulan berjalan.
  const hariTercatat = new Set(bulanIni.data.map((l) => l.tanggalIso)).size
  const jamLemburBulanIni = riwayat
    .filter((l) => l.status === 'Diterima' || l.status === 'Selesai')
    .filter((l) => l.tanggalIso >= awalBulan && l.tanggalIso <= hariIniIso)
    .reduce((n, l) => n + jamDari(l.total), 0)
  const kendalaBelumSelesai = kendalaBulanIni.data.filter((k) => k.status !== 'Selesai').length

  const namaDepan = akun?.nama.split(' ')[0] ?? ''

  /** Linimasa hari ini: catatan yang sudah dikirim, terbaru di bawah. */
  const pos = [...hariIni.data]
    .reverse()
    .map((l) => ({
      jam: `${l.jam} · Aktivitas`,
      judul: l.keterangan.split('.')[0].slice(0, 60) || 'Catatan aktivitas',
      isi: l.keterangan,
    }))
  // Penugasan yang paling perlu dilihat: yang belum dijawab, kalau tidak ada
  // tampilkan jawaban terakhir.
  const lembur = menunggu[0] ?? riwayat[0]

  return (
    <>
      {/* Hero: status shift hari ini + dua tindakan utama */}
      <div className="relative overflow-hidden rounded-kartu bg-[linear-gradient(135deg,#0F4657,#0B3747_55%,#145D31)] px-7 py-6 text-white">
        <div className="tekstur-kontur absolute inset-0 opacity-50" />
        <div className="tekstur-petak absolute inset-0" />
        <div className="relative z-[2] flex flex-wrap items-center gap-6">
          <div className="min-w-[250px] flex-1">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/15 px-3 py-1.5 text-[11.5px] font-semibold">
              <Ikon.Lokasi size={13} /> {akun?.unit || 'Unit belum ditetapkan'}
            </div>
            <h2 className="m-0 mb-1.5 text-[25px] font-extrabold tracking-[-0.03em]">
              Selamat datang, {namaDepan}.
            </h2>
            <p className="m-0 max-w-[52ch] text-[13.5px] text-white/75">
              {hariIni.data.length === 0
                ? 'Anda belum mengisi catatan hari ini.'
                : `Anda sudah mengisi ${hariIni.data.length} catatan hari ini.`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Link to={`${akar}/logbook`}>
              <Tombol>
                <Ikon.Kamera size={16} /> Isi aktivitas
              </Tombol>
            </Link>
            <Link to={`${akar}/laporan-kendala`}>
              <Tombol className="border border-white/25 bg-white/15 text-white shadow-none hover:bg-white/25">
                Laporkan kendala
              </Tombol>
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-4.5 grid grid-cols-1 gap-4.5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard gaya="pekat" nama="Catatan hari ini" angka={String(hariIni.data.length)} ikon={<Ikon.Buku size={17} />} ket={HARI_INI} />
        <StatCard gaya="pekat" nama="Hari tercatat bulan ini" angka={String(hariTercatat)} satuan="hari" ikon={<Ikon.Centang size={17} />} ket="Hari yang punya catatan" />
        <StatCard gaya="pekat" nama="Jam lembur bulan ini" angka={String(jamLemburBulanIni)} satuan="jam" ikon={<Ikon.Jam size={17} />} ket="Lembur yang Anda terima" />
        <StatCard gaya="pekat" nama="Kendala saya" angka={String(kendalaBulanIni.data.length)} ikon={<Ikon.Awas size={17} />} ket={`${kendalaBelumSelesai} belum selesai`} />
      </div>

      <div className="mt-4.5 grid grid-cols-1 gap-4.5 xl:grid-cols-[1fr_1.62fr]">
        <Kartu>
          <KopKartu
            judul="Catatan saya hari ini"
            sub={HARI_INI}
            aksi={
              <Link to={`${akar}/rekap-harian`}>
                <Tombol varian="hantu" kecil>
                  Rekap
                </Tombol>
              </Link>
            }
          />
          <StatusData memuat={hariIni.memuat} galat={hariIni.galat} onUlang={hariIni.muat} />
          <IsiKartu>
            {pos.length === 0 ? (
              <p className="m-0 py-6 text-center text-[12.5px] text-teks-lembut">
                Belum ada catatan hari ini.
              </p>
            ) : (
              <Linimasa pos={pos} />
            )}
            <Link to={`${akar}/logbook`} className="mt-4.5 block">
              <Tombol lebar>
                <Ikon.Kamera size={16} /> Isi catatan
              </Tombol>
            </Link>
          </IsiKartu>
        </Kartu>

        <div className="grid content-start gap-4.5">
          {lembur && <KartuLembur lembur={lembur} />}
          <Kartu>
            <KopKartu judul="Pengumuman" sub="Dari Bagian Umum" />
            <IsiKartu className="text-[13px] leading-relaxed text-teks-lembut">
              Mulai 20 September, foto aktivitas wajib menampilkan wajah dan latar lokasi pos. Foto dari
              galeri tidak lagi diterima sistem.
            </IsiKartu>
          </Kartu>
        </div>
      </div>
    </>
  )
}
