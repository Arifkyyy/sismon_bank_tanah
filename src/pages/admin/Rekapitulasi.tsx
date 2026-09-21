import { useState } from 'react'
import { StatCard } from '@/components/StatCard'
import {
  Baris, KakiTabel, Kartu, KopKartu, Pil, PilihRapi, SelOrang, Segmen, Tabel, TagJabatan, Tombol,
} from '@/components/ui'
import { REKAP } from '@/data/mock'
import { Ikon } from '@/lib/ikon'

/** Kepatuhan di bawah 70% ditandai merah, 70–95% emas, sisanya hijau. */
function statusPatuh(patuh: string) {
  const n = Number.parseInt(patuh, 10)
  if (n >= 96) return 'Selesai' as const
  if (n >= 70) return 'Diproses' as const
  return 'Ditolak' as const
}

export function Rekapitulasi() {
  const [periode, setPeriode] = useState('Harian')

  return (
    <>
      <div className="mb-4.5 flex flex-wrap items-center gap-2">
        <Segmen opsi={['Harian', 'Mingguan', 'Bulanan']} nilai={periode} onPilih={setPeriode} />
        <PilihRapi defaultValue="September 2026">
          <option>September 2026</option>
          <option>Agustus 2026</option>
        </PilihRapi>
        <PilihRapi defaultValue="Semua jabatan">
          <option>Semua jabatan</option>
          <option>Security</option>
          <option>OB</option>
          <option>CS</option>
        </PilihRapi>
        <Tombol varian="hantu" kecil className="ml-auto">
          <Ikon.Unduh size={15} /> Unduh rekap
        </Tombol>
      </div>

      <div className="grid grid-cols-1 gap-4.5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard nama="Total logbook" angka="1.204" ikon={<Ikon.Buku size={17} />} ket="Periode 1–15 September" />
        <StatCard nama="Kehadiran tercatat" angka="96,4" satuan="%" ikon={<Ikon.Centang size={17} />} ket="Dihitung dari jadwal shift" />
        <StatCard nama="Total jam lembur" angka="186" satuan="jam" nada="emas" ikon={<Ikon.Jam size={17} />} ket="Dari 34 penugasan" />
        <StatCard nama="Kendala dilaporkan" angka="19" nada="tanah" ikon={<Ikon.Awas size={17} />} ket="17 sudah selesai" />
      </div>

      <Kartu className="mt-4.5">
        <KopKartu judul="Rekap per petugas" sub={`${periode} · gabungan logbook dan lembur, 1–15 September 2026`} />
        <Tabel kepala={['Nama', 'Jabatan', 'Hari tercatat', 'Logbook', 'Kendala', 'Jam lembur', 'Kepatuhan']}>
          {REKAP.map((r) => (
            <Baris key={r.nama}>
              <td>
                <SelOrang nama={r.nama} jabatan={r.jabatan} />
              </td>
              <td>
                <TagJabatan jabatan={r.jabatan} />
              </td>
              <td className="num whitespace-nowrap">{r.hari} hari</td>
              <td className="num">{r.logbook}</td>
              <td className="num">{r.kendala}</td>
              <td className="num whitespace-nowrap">{r.lembur}</td>
              <td>
                <Pil status={statusPatuh(r.patuh)}>{r.patuh}</Pil>
              </td>
            </Baris>
          ))}
        </Tabel>
        <KakiTabel dari={1} ke={7} total={48} />
      </Kartu>
    </>
  )
}
