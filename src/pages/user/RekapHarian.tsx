import { useState } from 'react'
import { BaganTujuhHari } from '@/components/Bagan'
import type { Rentang } from '@/components/RentangTanggal'
import { RentangTanggal } from '@/components/RentangTanggal'
import { StatCard } from '@/components/StatCard'
import {
  Baris, FotoKecil, InputRapi, IsiKartu, Kartu, KopKartu, Pil, PilihRapi, Segmen, Tabel, Tombol,
} from '@/components/ui'
import { ISO_HARI_INI } from '@/data/mock'
import { Ikon } from '@/lib/ikon'
import { daftarBulan, formatRentang, formatTanggal } from '@/lib/tanggal'
import { cn } from '@/lib/util'

/** Penanda jenis catatan: aktivitas, kendala, atau slot yang belum diisi. */
function TagJenis({ jenis }: { jenis: 'Aktivitas' | 'Kendala' | 'Terjadwal' }) {
  const warna = {
    Aktivitas: 'border-[#CFE3D6] bg-[#EDF6F0] text-hijau-tua',
    Kendala: 'border-[#F0DCAE] bg-[#FDF6E4] text-tanah-teks',
    Terjadwal: 'border-garis-kuat bg-white text-teks-samar',
  }[jenis]
  return (
    <span className={cn('inline-flex items-center rounded-[7px] border px-2 py-0.5 text-[11.5px] font-semibold', warna)}>
      {jenis}
    </span>
  )
}

const DAFTAR_BULAN = daftarBulan().map((b) => b.label)

type Periode = 'Harian' | 'Bulanan' | 'Custom' | 'All Time'

export function RekapHarian() {
  const [periode, setPeriode] = useState<Periode>('Harian')
  const [tanggal, setTanggal] = useState(ISO_HARI_INI)
  const [bulan, setBulan] = useState(DAFTAR_BULAN[0])
  const [rentang, setRentang] = useState<Rentang | null>(null)

  // Keterangan periode aktif, dipakai ulang di subjudul kartu.
  let labelPeriode: string
  switch (periode) {
    case 'Harian': {
      const t = formatTanggal(tanggal)
      labelPeriode = `${t.hari}, ${t.tanggal}`
      break
    }
    case 'Bulanan':
      labelPeriode = bulan
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
                {DAFTAR_BULAN.map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </PilihRapi>
            )}
            {periode === 'Custom' && <RentangTanggal nilai={rentang} onPilih={setRentang} className="w-[260px]" />}
            {periode === 'All Time' && (
              <span className="rounded-[10px] border border-garis bg-[#FAFCFB] px-3 py-2.5 text-[13px] text-teks-lembut">
                Seluruh catatan tanpa batas tanggal
              </span>
            )}

            <PilihRapi defaultValue="Aktivitas dan kendala" className="ml-auto">
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
        <StatCard gaya="pekat" nama="Catatan hari ini" angka="2" ikon={<Ikon.Buku size={17} />} ket="Target 4 catatan per hari" />
        <StatCard gaya="pekat" nama="Kendala dilaporkan" angka="1" ikon={<Ikon.Awas size={17} />} ket="Sedang diproses admin" />
        <StatCard gaya="pekat" nama="Jam kerja tercatat" angka="8" satuan="jam" ikon={<Ikon.Jam size={17} />} ket="Shift pagi 07.00–15.00" />
        <StatCard gaya="pekat" nama="Jam lembur" angka="0" satuan="jam" ikon={<Ikon.Jam size={17} />} ket="Belum ada lembur hari ini" />
      </div>

      <div className="mt-4.5 grid grid-cols-1 gap-4.5 xl:grid-cols-[1.62fr_1fr]">
        <Kartu>
          <KopKartu judul="Rincian catatan" sub={`Aktivitas dan kendala digabung berurutan · ${labelPeriode}`} />
          <Tabel kepala={['Jam', 'Jenis', 'Foto', 'Keterangan', 'Status']}>
            <Baris>
              <td className="num">07.02</td>
              <td>
                <TagJenis jenis="Aktivitas" />
              </td>
              <td>
                <FotoKecil varian="a" />
              </td>
              <td className="whitespace-normal text-teks-lembut">
                Serah terima shift pagi di Pos Utama. Kondisi area aman.
              </td>
              <td>
                <Pil status="Selesai" />
              </td>
            </Baris>
            <Baris>
              <td className="num">09.40</td>
              <td>
                <TagJenis jenis="Kendala" />
              </td>
              <td>
                <FotoKecil varian="b" />
              </td>
              <td className="whitespace-normal text-teks-lembut">
                Palang parkir sisi timur macet saat dibuka.
              </td>
              <td>
                <Pil status="Diproses" />
              </td>
            </Baris>
            <Baris>
              <td className="num">11.00</td>
              <td>
                <TagJenis jenis="Terjadwal" />
              </td>
              <td>
                <span className="text-teks-samar">—</span>
              </td>
              <td className="whitespace-normal text-teks-samar">Catatan patroli siang belum diisi.</td>
              <td>
                <Pil status="Menunggu" />
              </td>
            </Baris>
          </Tabel>
        </Kartu>

        <Kartu>
          <KopKartu judul="Tujuh hari terakhir" sub="Jumlah catatan per hari" />
          <IsiKartu>
            <BaganTujuhHari labelCatatan="Aktivitas masuk" />
          </IsiKartu>
        </Kartu>
      </div>
    </>
  )
}
