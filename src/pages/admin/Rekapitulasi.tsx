import { useMemo, useState } from 'react'
import type { Rentang } from '@/components/RentangTanggal'
import { RentangTanggal } from '@/components/RentangTanggal'
import { StatCard } from '@/components/StatCard'
import {
  Baris, IsiKartu, Kartu, KopKartu, Pil, PilihRapi, SelOrang, Segmen, Tabel, TagJabatan, Tombol,
} from '@/components/ui'
import { REKAP } from '@/data/mock'
import { Ikon } from '@/lib/ikon'
import { daftarBulan, formatRentang } from '@/lib/tanggal'
import { DAFTAR_JABATAN, JABATAN_PANJANG } from '@/lib/util'
import type { Jabatan } from '@/types'

/** Kepatuhan di bawah 70% ditandai merah, 70–95% emas, sisanya hijau. */
function statusPatuh(patuh: string) {
  const n = Number.parseInt(patuh, 10)
  if (n >= 96) return 'Selesai' as const
  if (n >= 70) return 'Diproses' as const
  return 'Ditolak' as const
}

const DAFTAR_BULAN = daftarBulan().map((b) => b.label)

type Periode = 'Bulanan' | 'Custom' | 'All Time'

export function Rekapitulasi() {
  const [periode, setPeriode] = useState<Periode>('Bulanan')
  const [bulan, setBulan] = useState(DAFTAR_BULAN[0])
  const [rentang, setRentang] = useState<Rentang | null>(null)
  const [jabatan, setJabatan] = useState<Jabatan | 'Semua'>('Semua')

  // Rekap dipersempit per jabatan supaya admin bisa memeriksa satu regu saja.
  const terlihat = useMemo(
    () => (jabatan === 'Semua' ? REKAP : REKAP.filter((r) => r.jabatan === jabatan)),
    [jabatan],
  )

  // Dipakai sebagai keterangan periode di kartu dan kartu statistik.
  const labelPeriode =
    periode === 'Bulanan'
      ? bulan
      : periode === 'Custom'
        ? rentang
          ? formatRentang(rentang.mulai, rentang.sampai)
          : 'Rentang tanggal belum dipilih'
        : 'Seluruh periode'

  return (
    <>
      <Kartu className="mb-4.5">
        <IsiKartu className="p-4">
          <Segmen
            lebar
            opsi={['Bulanan', 'Custom', 'All Time']}
            nilai={periode}
            onPilih={(v) => setPeriode(v as Periode)}
          />

          <div className="mt-3 flex flex-wrap items-center gap-2">
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
                Seluruh data tanpa batas tanggal
              </span>
            )}

            <PilihRapi
              aria-label="Jabatan petugas"
              value={jabatan}
              onChange={(e) => setJabatan(e.target.value as Jabatan | 'Semua')}
              className="ml-auto"
            >
              <option value="Semua">Semua jabatan</option>
              {DAFTAR_JABATAN.map((j) => (
                <option key={j} value={j}>
                  {JABATAN_PANJANG[j]}
                </option>
              ))}
            </PilihRapi>
            <Tombol varian="hantu" kecil>
              <Ikon.Unduh size={15} /> Unduh rekap
            </Tombol>
          </div>
        </IsiKartu>
      </Kartu>

      <div className="grid grid-cols-1 gap-4.5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard nama="Total logbook" angka="1.204" ikon={<Ikon.Buku size={17} />} ket={labelPeriode} />
        <StatCard nama="Kehadiran tercatat" angka="96,4" satuan="%" ikon={<Ikon.Centang size={17} />} ket="Dihitung dari jadwal shift" />
        <StatCard nama="Total jam lembur" angka="186" satuan="jam" nada="emas" ikon={<Ikon.Jam size={17} />} ket="Dari 34 penugasan" />
        <StatCard nama="Kendala dilaporkan" angka="19" nada="tanah" ikon={<Ikon.Awas size={17} />} ket="17 sudah selesai" />
      </div>

      <Kartu className="mt-4.5">
        <KopKartu
          judul="Rekap per petugas"
          sub={`Gabungan logbook dan lembur · ${labelPeriode}${jabatan === 'Semua' ? '' : ` · ${JABATAN_PANJANG[jabatan]}`}`}
          aksi={
            <span className="num whitespace-nowrap text-[12.5px] text-teks-lembut">
              {terlihat.length} petugas
            </span>
          }
        />
        <Tabel kepala={['Nama', 'Jabatan', 'Hari tercatat', 'Logbook', 'Kendala', 'Jam lembur', 'Kepatuhan']} maksTinggi={560}>
          {terlihat.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-5 py-12 text-center">
                <span className="mx-auto mb-2.5 grid h-11 w-11 place-items-center rounded-full bg-[#F3F7F4] text-teks-samar">
                  <Ikon.Orang size={19} />
                </span>
                <b className="block text-[13.5px] font-semibold text-ink">
                  Tidak ada petugas pada saringan ini
                </b>
                <span className="mt-0.5 block text-[12px] text-teks-lembut">
                  Pilih jabatan lain atau kembali ke Semua jabatan.
                </span>
              </td>
            </tr>
          ) : (
            terlihat.map((r) => (
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
            ))
          )}
        </Tabel>
       
      </Kartu>
    </>
  )
}
