import { useState } from 'react'
import { BaganTujuhHari } from '@/components/Bagan'
import { StatCard } from '@/components/StatCard'
import {
  Baris, FotoKecil, IsiKartu, Kartu, KopKartu, Pil, PilihRapi, Segmen, Tabel, Tombol,
} from '@/components/ui'
import { Ikon } from '@/lib/ikon'
import { cn } from '@/lib/util'

/** Penanda jenis catatan: logbook, kendala, atau slot yang belum diisi. */
function TagJenis({ jenis }: { jenis: 'Logbook' | 'Kendala' | 'Terjadwal' }) {
  const warna = {
    Logbook: 'border-[#CFE3D6] bg-[#EDF6F0] text-hijau-tua',
    Kendala: 'border-[#F0DCAE] bg-[#FDF6E4] text-tanah-teks',
    Terjadwal: 'border-garis-kuat bg-white text-teks-samar',
  }[jenis]
  return (
    <span className={cn('inline-flex items-center rounded-[7px] border px-2 py-0.5 text-[11.5px] font-semibold', warna)}>
      {jenis}
    </span>
  )
}

export function RekapHarian() {
  const [periode, setPeriode] = useState('Harian')

  return (
    <>
      <div className="mb-4.5 flex flex-wrap items-center gap-2">
        <Segmen opsi={['Harian', 'Mingguan', 'Bulanan']} nilai={periode} onPilih={setPeriode} />
        <input
          type="date"
          defaultValue="2026-09-15"
          className="rounded-[10px] border border-garis-kuat bg-white px-3 py-2.5 text-[13px] focus:border-hijau focus:outline-none"
        />
        <PilihRapi defaultValue="Logbook dan kendala">
          <option>Logbook dan kendala</option>
          <option>Logbook saja</option>
          <option>Kendala saja</option>
        </PilihRapi>
        <Tombol varian="hantu" kecil className="ml-auto">
          <Ikon.Unduh size={15} /> Unduh PDF
        </Tombol>
      </div>

      <div className="grid grid-cols-1 gap-4.5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard nama="Catatan hari ini" angka="2" ikon={<Ikon.Buku size={17} />} ket="Target 4 catatan per hari" />
        <StatCard nama="Kendala dilaporkan" angka="1" nada="tanah" ikon={<Ikon.Awas size={17} />} ket="Sedang diproses admin" />
        <StatCard nama="Jam kerja tercatat" angka="8" satuan="jam" nada="ink" ikon={<Ikon.Jam size={17} />} ket="Shift pagi 07.00–15.00" />
        <StatCard nama="Jam lembur" angka="0" satuan="jam" nada="emas" ikon={<Ikon.Jam size={17} />} ket="Belum ada lembur hari ini" />
      </div>

      <div className="mt-4.5 grid grid-cols-1 gap-4.5 xl:grid-cols-[1.62fr_1fr]">
        <Kartu>
          <KopKartu judul={`Rincian ${periode.toLowerCase()}`} sub="Logbook dan kendala digabung berurutan" />
          <Tabel kepala={['Jam', 'Jenis', 'Foto', 'Keterangan', 'Status']}>
            <Baris>
              <td className="num">07.02</td>
              <td>
                <TagJenis jenis="Logbook" />
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
            <BaganTujuhHari />
          </IsiKartu>
        </Kartu>
      </div>
    </>
  )
}
