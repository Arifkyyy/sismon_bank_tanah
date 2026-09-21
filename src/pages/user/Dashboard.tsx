import { Link } from 'react-router-dom'
import { Linimasa } from '@/components/Linimasa'
import { StatCard } from '@/components/StatCard'
import { IsiKartu, Kartu, KopKartu, Tombol } from '@/components/ui'
import { KartuLembur } from '@/pages/user/Lembur'
import { AKAR } from '@/config/menu'
import { HARI_INI, LEMBUR } from '@/data/mock'
import { Ikon } from '@/lib/ikon'

export function DashboardUser() {
  const akar = AKAR.user

  return (
    <>
      {/* Hero: status shift hari ini + dua tindakan utama */}
      <div className="relative overflow-hidden rounded-kartu bg-[linear-gradient(135deg,#0F4657,#0B3747_55%,#145D31)] px-7 py-6 text-white">
        <div className="tekstur-kontur absolute inset-0 opacity-50" />
        <div className="tekstur-petak absolute inset-0" />
        <div className="relative z-[2] flex flex-wrap items-center gap-6">
          <div className="min-w-[250px] flex-1">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/15 px-3 py-1.5 text-[11.5px] font-semibold">
              <Ikon.Lokasi size={13} /> Pos Utama — Gedung A · Shift pagi 07.00–15.00
            </div>
            <h2 className="m-0 mb-1.5 text-[25px] font-extrabold tracking-[-0.03em]">
              Selamat pagi, Bagas.
            </h2>
            <p className="m-0 max-w-[52ch] text-[13.5px] text-white/75">
              Anda sudah mengisi 2 catatan hari ini. Catatan berikutnya dijadwalkan pukul 11.00.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Link to={`${akar}/logbook`}>
              <Tombol>
                <Ikon.Kamera size={16} /> Isi logbook
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
        <StatCard nama="Catatan hari ini" angka="2" satuan="/ 4" ikon={<Ikon.Buku size={17} />} ket="Dua catatan lagi sebelum pukul 15.00" />
        <StatCard nama="Hari tercatat bulan ini" angka="15" satuan="hari" ikon={<Ikon.Centang size={17} />} ket="Kepatuhan 100%" />
        <StatCard nama="Jam lembur bulan ini" angka="12" satuan="jam" nada="emas" ikon={<Ikon.Jam size={17} />} ket="Dari 3 penugasan" />
        <StatCard nama="Kendala saya" angka="2" nada="tanah" ikon={<Ikon.Awas size={17} />} ket="1 masih diproses" />
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
          <IsiKartu>
            <Linimasa
              pos={[
                { jam: '07.02 · Logbook', judul: 'Serah terima shift pagi', isi: 'Kondisi area aman, seluruh akses berfungsi normal.' },
                { jam: '09.40 · Kendala', judul: 'Palang parkir sisi timur macet', isi: 'Sudah diteruskan ke admin, status sedang diproses.', nada: 'tanah' },
                { jam: '11.00 · Terjadwal', judul: 'Catatan patroli siang', isi: 'Belum diisi. Foto wajib diambil langsung dari kamera.', nada: 'emas' },
              ]}
            />
            <Link to={`${akar}/logbook`} className="mt-4.5 block">
              <Tombol lebar>
                <Ikon.Kamera size={16} /> Isi catatan pukul 11.00
              </Tombol>
            </Link>
          </IsiKartu>
        </Kartu>

        <div className="grid content-start gap-4.5">
          <KartuLembur lembur={LEMBUR[0]} />
          <Kartu>
            <KopKartu judul="Pengumuman" sub="Dari Bagian Umum" />
            <IsiKartu className="text-[13px] leading-relaxed text-teks-lembut">
              Mulai 20 September, foto logbook wajib menampilkan wajah dan latar lokasi pos. Foto dari
              galeri tidak lagi diterima sistem.
            </IsiKartu>
          </Kartu>
        </div>
      </div>
    </>
  )
}
