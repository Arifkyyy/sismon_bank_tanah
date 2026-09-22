import { useMemo, useState } from 'react'
import type { Rentang } from '@/components/RentangTanggal'
import { RentangTanggal } from '@/components/RentangTanggal'
import {
  Baris, FotoKecil, InputRapi, IsiKartu, Kartu, KopKartu, PilihRapi, SelOrang,
  Segmen, Tabel, TagJabatan, Tombol,
} from '@/components/ui'
import { ISO_HARI_INI, LOGBOOK } from '@/data/mock'
import { Ikon } from '@/lib/ikon'
import { daftarBulan, formatRentang, formatTanggal, isoDariTampilan } from '@/lib/tanggal'
import { DAFTAR_JABATAN, JABATAN_PANJANG } from '@/lib/util'
import type { Jabatan } from '@/types'

const BULAN_PILIHAN = daftarBulan()

type Periode = 'Harian' | 'Bulanan' | 'Custom' | 'All Time'

export function LogAktivitas() {
  const [periode, setPeriode] = useState<Periode>('Harian')
  const [tanggal, setTanggal] = useState(ISO_HARI_INI)
  const [bulan, setBulan] = useState(BULAN_PILIHAN[0].kunci)
  const [rentang, setRentang] = useState<Rentang | null>(null)
  const [jabatan, setJabatan] = useState<Jabatan | 'Semua'>('Semua')

  /**
   * Catatan disaring per periode dan jabatan. Tanggal logbook disimpan siap
   * tampil ('15 Sep 2026'), jadi diubah dulu ke ISO supaya bisa dibandingkan
   * sebagai teks.
   */
  const terlihat = useMemo(() => {
    function dalamPeriode(iso: string): boolean {
      switch (periode) {
        case 'Harian':
          return iso === tanggal
        case 'Bulanan':
          return iso.startsWith(bulan)
        case 'Custom':
          return !!rentang && iso >= rentang.mulai && iso <= rentang.sampai
        default:
          return true
      }
    }

    return LOGBOOK.filter(
      (l) =>
        dalamPeriode(isoDariTampilan(l.tanggal)) &&
        (jabatan === 'Semua' || l.jabatan === jabatan),
    )
  }, [periode, tanggal, bulan, rentang, jabatan])

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
                aria-label="Tanggal catatan"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
              />
            )}
            {periode === 'Bulanan' && (
              <PilihRapi
                aria-label="Bulan catatan"
                value={bulan}
                onChange={(e) => setBulan(e.target.value)}
                className="min-w-[180px]"
              >
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
              <Ikon.Unduh size={15} /> Unduh Excel
            </Tombol>
          </div>
        </IsiKartu>
      </Kartu>

      <Kartu>
        <KopKartu
          judul="Log aktivitas petugas"
          sub={`Setiap catatan wajib disertai foto dari kamera · ${labelPeriode}${jabatan === 'Semua' ? '' : ` · ${JABATAN_PANJANG[jabatan]}`}`}
          aksi={
            <span className="num whitespace-nowrap text-[12.5px] text-teks-lembut">
              {terlihat.length} catatan
            </span>
          }
        />
        <Tabel kepala={['Nama', 'Jabatan', 'Tanggal', 'Hari', 'Jam', 'Foto', 'Keterangan', 'Lembur']} maksTinggi={560}>
          {terlihat.length === 0 ? (
            <tr>
              <td colSpan={8} className="px-5 py-12 text-center">
                <span className="mx-auto mb-2.5 grid h-11 w-11 place-items-center rounded-full bg-[#F3F7F4] text-teks-samar">
                  <Ikon.Buku size={19} />
                </span>
                <b className="block text-[13.5px] font-semibold text-ink">
                  Tidak ada catatan pada saringan ini
                </b>
                <span className="mt-0.5 block text-[12px] text-teks-lembut">
                  Ganti periode atau pilih jabatan lain.
                </span>
              </td>
            </tr>
          ) : (
            terlihat.map((l) => (
              <Baris key={l.nama + l.tanggal + l.jam}>
                <td>
                  <SelOrang nama={l.nama} jabatan={l.jabatan} />
                </td>
                <td>
                  <TagJabatan jabatan={l.jabatan} />
                </td>
                <td className="num whitespace-nowrap">{l.tanggal}</td>
                <td className="text-teks-lembut">{l.hari}</td>
                <td className="num">{l.jam}</td>
                <td>
                  <FotoKecil varian={l.foto} />
                </td>
                <td className="max-w-[330px] whitespace-normal text-teks-lembut">{l.keterangan}</td>
                <td className="num">
                  {l.lembur === '—' ? (
                    <span className="text-teks-samar">—</span>
                  ) : (
                    <span className="rounded-full bg-emas-lembut px-2.5 py-1 text-[11.5px] font-semibold text-emas-teks">
                      {l.lembur}
                    </span>
                  )}
                </td>
              </Baris>
            ))
          )}
        </Tabel>
      </Kartu>
    </>
  )
}
