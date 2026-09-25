import { useMemo, useState } from 'react'
import { PratinjauFoto } from '@/components/Foto'
import { Modal } from '@/components/Modal'
import type { Rentang } from '@/components/RentangTanggal'
import { RentangTanggal } from '@/components/RentangTanggal'
import { StatCard } from '@/components/StatCard'
import {
  AksiBaris, Baris, FotoKecil, InputRapi, IsiKartu, Kartu, Kolom, KopKartu, Pil, Pilihan, PilihRapi,
  SelOrang, Segmen, Tabel, TagJabatan, Tombol, TombolIkon,
} from '@/components/ui'
import { StatusData } from '@/components/StatusData'
import { Ikon } from '@/lib/ikon'
import { api, pesanGalat, query } from '@/lib/api'
import { unduhExcel } from '@/lib/excel'
import { jendelaPeriode } from '@/lib/periode'
import type { Periode } from '@/lib/periode'
import { useApi } from '@/lib/useApi'
import { daftarBulan, formatRentang, formatTanggal, keIso } from '@/lib/tanggal'
import { DAFTAR_JABATAN, JABATAN_PANJANG } from '@/lib/util'
import type { Jabatan, Kendala, Status } from '@/types'

const BULAN_PILIHAN = daftarBulan()

/** Status yang mungkin dimiliki satu laporan kendala. */
const STATUS_KENDALA: Status[] = ['Baru', 'Diproses', 'Selesai']

/** Pilihan di pop-up ubah status; 'Baru' hanya diberikan sistem saat laporan masuk. */
const STATUS_TINDAK: Status[] = ['Diproses', 'Selesai']

export function LaporanKendalaAdmin() {
  const [pratinjau, setPratinjau] = useState<{ foto: string[]; judul: string } | null>(null)
  const [periode, setPeriode] = useState<Periode>('Harian')
  const [tanggal, setTanggal] = useState(() => keIso(new Date()))
  const [bulan, setBulan] = useState(BULAN_PILIHAN[0].kunci)
  const [rentang, setRentang] = useState<Rentang | null>(null)
  const [jabatan, setJabatan] = useState<Jabatan | 'Semua'>('Semua')
  const [status, setStatus] = useState<Status | 'Semua'>('Semua')

  const [sibuk, setSibuk] = useState<number | null>(null)
  const [galatAksi, setGalatAksi] = useState<string | null>(null)
  const [diubah, setDiubah] = useState<Kendala | null>(null)
  const [statusBaru, setStatusBaru] = useState<Status>('Diproses')

  const jendela = useMemo(
    () => jendelaPeriode(periode, tanggal, bulan, rentang),
    [periode, tanggal, bulan, rentang],
  )
  const dasar = jendela ? { ...jendela, jabatan: jabatan === 'Semua' ? '' : jabatan } : null

  /**
   * Dua pengambilan dengan sengaja: yang pertama tanpa saringan status, dipakai
   * menghitung ketiga kartu statistik; yang kedua memakai saringan status untuk
   * isi tabel. Semua saringan tetap dikirim sebagai parameter alamat.
   */
  const periodeUrl = dasar ? `/api/kendala${query(dasar)}` : null
  const { data: sePeriode, muat: muatPeriode } = useApi<Kendala[]>(periodeUrl, [])

  const alamat = dasar
    ? `/api/kendala${query({ ...dasar, status: status === 'Semua' ? '' : status })}`
    : null
  const { data: terlihat, memuat, galat, muat } = useApi<Kendala[]>(alamat, [])

  const jumlah = (s: Status) => sePeriode.filter((k) => k.status === s).length

  /** Tombol pena: buka pop-up pilihan status. */
  function bukaUbah(k: Kendala) {
    setDiubah(k)
    // Laporan baru biasanya langsung diteruskan, jadi 'Diproses' yang dipilih lebih dulu.
    setStatusBaru(k.status === 'Baru' ? 'Diproses' : k.status)
    setGalatAksi(null)
  }

  function tutupUbah() {
    if (sibuk !== null) return
    setDiubah(null)
    setGalatAksi(null)
  }

  async function simpanStatus() {
    if (!diubah?.id || statusBaru === diubah.status) return
    setSibuk(diubah.id)
    setGalatAksi(null)
    try {
      await api(`/api/kendala/${diubah.id}/status`, 'PATCH', { status: statusBaru })
      setDiubah(null)
      muat()
      muatPeriode()
    } catch (e) {
      setGalatAksi(pesanGalat(e))
    } finally {
      setSibuk(null)
    }
  }

  function bukaFoto(k: Kendala) {
    if (k.fotoUrl?.length) setPratinjau({ foto: k.fotoUrl, judul: `Foto kendala · ${k.nama}` })
  }

  function unduh() {
    unduhExcel({
      namaBerkas: `laporan-kendala-${jendela?.dari ?? 'semua'}`,
      judul: 'Laporan Kendala',
      keterangan: [
        `Periode: ${labelPeriode}`,
        jabatan === 'Semua' ? 'Semua jabatan' : JABATAN_PANJANG[jabatan],
        status === 'Semua' ? 'Semua status' : `Status ${status}`,
        `${terlihat.length} laporan`,
      ].join(' · '),
      namaLembar: 'Laporan kendala',
      kepala: ['Pelapor', 'Jabatan', 'Tanggal', 'Hari', 'Jam', 'Keterangan', 'Status'],
      baris: terlihat.map((k) => [
        k.nama, JABATAN_PANJANG[k.jabatan], k.tanggal, k.hari, k.jam, k.keterangan, k.status,
      ]),
    })
  }

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
      <div className="grid grid-cols-1 gap-4.5 sm:grid-cols-3">
        <StatCard nama="Laporan baru" angka={String(jumlah('Baru'))} nada="tanah" ikon={<Ikon.Awas size={17} />} ket="Belum ditinjau admin" />
        <StatCard nama="Sedang diproses" angka={String(jumlah('Diproses'))} nada="emas" ikon={<Ikon.Jam size={17} />} ket="Sudah diteruskan ke teknisi" />
        <StatCard nama="Selesai" angka={String(jumlah('Selesai'))} ikon={<Ikon.Centang size={17} />} ket="Pada periode yang dipilih" />
      </div>

      <Kartu className="mt-4.5">
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
                aria-label="Tanggal laporan"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
              />
            )}
            {periode === 'Bulanan' && (
              <PilihRapi
                aria-label="Bulan laporan"
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
                Seluruh laporan tanpa batas tanggal
              </span>
            )}

            <PilihRapi
              aria-label="Jabatan pelapor"
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
            <PilihRapi
              aria-label="Status laporan"
              value={status}
              onChange={(e) => setStatus(e.target.value as Status | 'Semua')}
            >
              <option value="Semua">Semua status</option>
              {STATUS_KENDALA.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </PilihRapi>
            <Tombol varian="hantu" kecil onClick={unduh} disabled={terlihat.length === 0}>
              <Ikon.Unduh size={15} /> Unduh Excel
            </Tombol>
          </div>
        </IsiKartu>
      </Kartu>

      <Kartu className="mt-4.5">
        <KopKartu
          judul="Laporan kendala masuk"
          sub={`Ubah status setelah kendala ditindaklanjuti · ${labelPeriode}${jabatan === 'Semua' ? '' : ` · ${JABATAN_PANJANG[jabatan]}`}`}
          aksi={
            <span className="num whitespace-nowrap text-[12.5px] text-teks-lembut">
              {terlihat.length} laporan
            </span>
          }
        />
        <StatusData memuat={memuat} galat={galat ?? (diubah ? null : galatAksi)} onUlang={muat} />
        <Tabel kepala={['Pelapor', 'Jabatan', 'Tanggal', 'Hari', 'Jam', 'Foto', 'Keterangan', 'Status', 'Aksi']} maksTinggi={560}>
          {terlihat.length === 0 ? (
            <tr>
              <td colSpan={9} className="px-5 py-12 text-center">
                <span className="mx-auto mb-2.5 grid h-11 w-11 place-items-center rounded-full bg-[#F3F7F4] text-teks-samar">
                  <Ikon.Awas size={19} />
                </span>
                <b className="block text-[13.5px] font-semibold text-ink">
                  {memuat ? 'Memuat laporan…' : 'Tidak ada laporan pada saringan ini'}
                </b>
                <span className="mt-0.5 block text-[12px] text-teks-lembut">
                  {alamat === null
                    ? 'Pilih rentang tanggal dulu.'
                    : 'Ganti periode, jabatan, atau status laporan.'}
                </span>
              </td>
            </tr>
          ) : (
            terlihat.map((k) => (
              <Baris key={k.id}>
                <td>
                  <SelOrang nama={k.nama} jabatan={k.jabatan} />
                </td>
                <td>
                  <TagJabatan jabatan={k.jabatan} />
                </td>
                <td className="num whitespace-nowrap">{k.tanggal}</td>
                <td className="text-teks-lembut">{k.hari}</td>
                <td className="num">{k.jam}</td>
                <td>
                  <FotoKecil varian={k.foto} url={k.fotoUrl?.[0]} onClick={() => bukaFoto(k)} />
                </td>
                <td className="max-w-[300px] whitespace-normal text-teks-lembut">{k.keterangan}</td>
                <td>
                  <Pil status={k.status} />
                </td>
                <td>
                  <AksiBaris>
                    <TombolIkon
                      label="Lihat foto bukti"
                      onClick={() => bukaFoto(k)}
                      disabled={!k.fotoUrl?.length}
                    >
                      <Ikon.Mata size={15} />
                    </TombolIkon>
                    <TombolIkon label="Ubah status" onClick={() => bukaUbah(k)} disabled={sibuk === k.id}>
                      <Ikon.Pena size={15} />
                    </TombolIkon>
                  </AksiBaris>
                </td>
              </Baris>
            ))
          )}
        </Tabel>
      </Kartu>
      {diubah && (
        <Modal
          judul="Ubah status laporan"
          sub={`${diubah.nama} · ${diubah.tanggal} · ${diubah.jam}`}
          onTutup={tutupUbah}
          aksi={
            <>
              <Tombol varian="hantu" onClick={tutupUbah} disabled={sibuk !== null}>
                Batal
              </Tombol>
              <Tombol onClick={simpanStatus} disabled={statusBaru === diubah.status || sibuk !== null}>
                <Ikon.Centang size={15} /> {sibuk !== null ? 'Menyimpan…' : 'Simpan status'}
              </Tombol>
            </>
          }
        >
          <div className="mb-4 rounded-xl border border-garis bg-[#F7FAF8] px-3.5 py-3">
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <span className="text-[11px] text-teks-samar">Keterangan kendala</span>
              <Pil status={diubah.status} />
            </div>
            <p className="m-0 text-[12.5px] leading-relaxed text-ink">{diubah.keterangan}</p>
          </div>
          <Kolom
            label="Status baru"
            wajib
            bantu={
              statusBaru === diubah.status
                ? `Laporan ini sudah berstatus ${diubah.status}.`
                : statusBaru === 'Selesai'
                  ? 'Pilih Selesai bila kendala sudah benar-benar tertangani.'
                  : 'Kendala sedang ditangani atau diteruskan ke teknisi.'
            }
          >
            <Pilihan autoFocus value={statusBaru} onChange={(e) => setStatusBaru(e.target.value as Status)}>
              {STATUS_TINDAK.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Pilihan>
          </Kolom>
          {galatAksi && (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-merah/30 bg-merah-lembut px-3.5 py-2.5 text-[12px] leading-relaxed text-merah-teks">
              <Ikon.Awas size={14} className="mt-px flex-none" />
              <span>{galatAksi}</span>
            </div>
          )}
        </Modal>
      )}
      {pratinjau && (
        <PratinjauFoto foto={pratinjau.foto} judul={pratinjau.judul} onTutup={() => setPratinjau(null)} />
      )}
    </>
  )
}
