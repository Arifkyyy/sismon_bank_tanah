import { useMemo, useState } from 'react'
import type { Rentang } from '@/components/RentangTanggal'
import { RentangTanggal } from '@/components/RentangTanggal'
import { StatCard } from '@/components/StatCard'
import {
  Baris, IsiKartu, Kartu, KopKartu, Pil, PilihRapi, SelOrang, Segmen, Tabel, TagJabatan, Tombol,
} from '@/components/ui'
import { StatusData } from '@/components/StatusData'
import { Ikon } from '@/lib/ikon'
import { query } from '@/lib/api'
import { unduhExcel } from '@/lib/excel'
import { jendelaPeriode } from '@/lib/periode'
import { useApi } from '@/lib/useApi'
import { daftarBulan, formatRentang } from '@/lib/tanggal'
import { DAFTAR_JABATAN, JABATAN_PANJANG } from '@/lib/util'
import type { Jabatan, RekapPetugas } from '@/types'

/** Kepatuhan di bawah 70% ditandai merah, 70–95% emas, sisanya hijau. */
function statusPatuh(patuh: string) {
  const n = Number.parseInt(patuh, 10)
  if (n >= 96) return 'Selesai' as const
  if (n >= 70) return 'Diproses' as const
  return 'Ditolak' as const
}

const BULAN_PILIHAN = daftarBulan()

type Periode = 'Bulanan' | 'Custom' | 'All Time'

/** Mengambil angka jam dari teks seperti '12 jam'. */
function jamDari(teks: string): number {
  return Number.parseFloat(teks.replace(',', '.')) || 0
}

export function Rekapitulasi() {
  const [periode, setPeriode] = useState<Periode>('Bulanan')
  const [bulan, setBulan] = useState(BULAN_PILIHAN[0].kunci)
  const [rentang, setRentang] = useState<Rentang | null>(null)
  const [jabatan, setJabatan] = useState<Jabatan | 'Semua'>('Semua')

  // Periode dan jabatan dikirim ke backend; tidak ada penyaringan di browser.
  const jendela = useMemo(
    () => jendelaPeriode(periode, '', bulan, rentang),
    [periode, bulan, rentang],
  )
  const alamat = jendela
    ? `/api/statistik/rekap${query({ ...jendela, jabatan: jabatan === 'Semua' ? '' : jabatan })}`
    : null
  const { data: terlihat, memuat, galat, muat } = useApi<RekapPetugas[]>(alamat, [])

  // Seluruh angka kartu statistik dijumlahkan dari baris rekap yang sama.
  const totalLogbook = terlihat.reduce((n, r) => n + r.logbook, 0)
  const totalKendala = terlihat.reduce((n, r) => n + r.kendala, 0)
  const totalJam = terlihat.reduce((n, r) => n + jamDari(r.lembur), 0)
  const rataPatuh = terlihat.length
    ? Math.round(terlihat.reduce((n, r) => n + (Number.parseInt(r.patuh, 10) || 0), 0) / terlihat.length)
    : 0

  // Dipakai sebagai keterangan periode di kartu dan kartu statistik.
  const labelPeriode =
    periode === 'Bulanan'
      ? (BULAN_PILIHAN.find((b) => b.kunci === bulan)?.label ?? bulan)
      : periode === 'Custom'
        ? rentang
          ? formatRentang(rentang.mulai, rentang.sampai)
          : 'Rentang tanggal belum dipilih'
        : 'Seluruh periode'

  function unduh() {
    unduhExcel({
      namaBerkas: `rekapitulasi-${jendela?.dari ?? 'semua'}`,
      judul: 'Rekapitulasi Petugas',
      keterangan: [
        `Periode: ${labelPeriode}`,
        jabatan === 'Semua' ? 'Semua jabatan' : JABATAN_PANJANG[jabatan],
        `${terlihat.length} petugas`,
      ].join(' · '),
      namaLembar: 'Rekapitulasi',
      kepala: ['Nama', 'Jabatan', 'Hari tercatat', 'Logbook', 'Kendala', 'Jam lembur', 'Kepatuhan', 'Checklist'],
      baris: terlihat.map((r) => [
        r.nama, JABATAN_PANJANG[r.jabatan], r.hari, r.logbook, r.kendala, r.lembur, r.patuh, r.checklist,
      ]),
    })
  }

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
            <Tombol varian="hantu" kecil onClick={unduh} disabled={terlihat.length === 0}>
              <Ikon.Unduh size={15} /> Unduh rekap
            </Tombol>
          </div>
        </IsiKartu>
      </Kartu>

      <div className="grid grid-cols-1 gap-4.5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard nama="Total logbook" angka={totalLogbook.toLocaleString('id-ID')} ikon={<Ikon.Buku size={17} />} ket={labelPeriode} />
        <StatCard nama="Kehadiran tercatat" angka={String(rataPatuh)} satuan="%" ikon={<Ikon.Centang size={17} />} ket="Rata-rata kepatuhan petugas" />
        <StatCard nama="Total jam lembur" angka={String(totalJam)} satuan="jam" nada="emas" ikon={<Ikon.Jam size={17} />} ket={labelPeriode} />
        <StatCard nama="Kendala dilaporkan" angka={String(totalKendala)} nada="tanah" ikon={<Ikon.Awas size={17} />} ket={`Dari ${terlihat.length} petugas`} />
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
        <StatusData memuat={memuat} galat={galat} onUlang={muat} />
        <Tabel kepala={['Nama', 'Jabatan', 'Hari tercatat', 'Logbook', 'Kendala', 'Jam lembur', 'Kepatuhan']} maksTinggi={560}>
          {terlihat.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-5 py-12 text-center">
                <span className="mx-auto mb-2.5 grid h-11 w-11 place-items-center rounded-full bg-[#F3F7F4] text-teks-samar">
                  <Ikon.Orang size={19} />
                </span>
                <b className="block text-[13.5px] font-semibold text-ink">
                  {memuat ? 'Memuat rekap…' : 'Tidak ada petugas pada saringan ini'}
                </b>
                <span className="mt-0.5 block text-[12px] text-teks-lembut">
                  {alamat === null
                    ? 'Pilih rentang tanggal dulu.'
                    : 'Pilih jabatan lain atau kembali ke Semua jabatan.'}
                </span>
              </td>
            </tr>
          ) : (
            terlihat.map((r) => (
              <Baris key={r.petugasId}>
                <td>
                  <SelOrang nama={r.nama} jabatan={r.jabatan} foto={r.fotoProfil} />
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
