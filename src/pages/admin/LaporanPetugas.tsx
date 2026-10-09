import { useEffect, useMemo, useState } from 'react'
import { InfoTerpotong } from '@/components/InfoTerpotong'
import { BATAS_DAFTAR, angkaDaftar, terpotong } from '@/lib/batas'
import { useSearchParams } from 'react-router-dom'
import { PratinjauFoto } from '@/components/Foto'
import { ModalBukaLagi, ModalDetailKendala, ModalTugaskan } from '@/components/KendalaAdmin'
import { Modal } from '@/components/Modal'
import { PilihPetugas } from '@/components/PilihPetugas'
import type { Rentang } from '@/components/RentangTanggal'
import { RentangTanggal } from '@/components/RentangTanggal'
import { StatCard } from '@/components/StatCard'
import { StatusData } from '@/components/StatusData'
import { TagAktivitas, TagKendala } from '@/components/TagCatatan'
import {
  Avatar, FotoKecil, InputRapi, IsiKartu, Kartu, Kolom, KopKartu, Pil, PilihRapi, Segmen, Tombol,
} from '@/components/ui'
import { Ikon } from '@/lib/ikon'
import { query } from '@/lib/api'
import { unduhExcel } from '@/lib/excel'
import { jendelaPeriode } from '@/lib/periode'
import type { Periode } from '@/lib/periode'
import { useApi } from '@/lib/useApi'
import { daftarBulan, formatRentang, formatTanggal, hariIniWib } from '@/lib/tanggal'
import { DAFTAR_JABATAN, JABATAN_PANJANG, cn } from '@/lib/util'
import type { Jabatan, Kendala, Logbook, Petugas, Status } from '@/types'

const BULAN_PILIHAN = daftarBulan()
const STATUS_KENDALA: Status[] = ['Baru', 'Diproses', 'Selesai']

type Tab = 'Semua' | 'Aktivitas' | 'Kendala'
const TAB: Tab[] = ['Semua', 'Aktivitas', 'Kendala']

/** ?tab=kendala ↔ 'Kendala' — dipakai pengalihan dari alamat lama dan notifikasi. */
function dariParam(nilai: string | null): Tab {
  if (nilai === 'kendala') return 'Kendala'
  if (nilai === 'aktivitas') return 'Aktivitas'
  return 'Semua'
}

type Butir =
  | { jenis: 'aktivitas'; tanggalIso: string; jam: string; data: Logbook }
  | { jenis: 'kendala'; tanggalIso: string; jam: string; data: Kendala }

/**
 * Gabungan Log aktivitas dan Laporan kendala untuk admin. Tabel logbook dan
 * kendala tetap terpisah di backend; di sini keduanya diambil dengan saringan
 * yang sama lalu digabung dan diurutkan terbaru di atas.
 */
export function LaporanPetugas() {
  const [param, setParam] = useSearchParams()
  const tab = dariParam(param.get('tab'))

  // ?janggal=1 (dari kartu di Dashboard) langsung membuka laporan bertanda bulan ini.
  const [hanyaJanggal, setHanyaJanggal] = useState(() => param.get('janggal') === '1')
  const [periode, setPeriode] = useState<Periode>(() => (param.get('janggal') === '1' ? 'Bulanan' : 'Harian'))
  const [tanggal, setTanggal] = useState(() => hariIniWib())
  const [bulan, setBulan] = useState(BULAN_PILIHAN[0].kunci)
  const [rentang, setRentang] = useState<Rentang | null>(null)
  const [jabatan, setJabatan] = useState<Jabatan | 'Semua'>('Semua')
  const [petugas, setPetugas] = useState<Petugas | null>(null)
  const [status, setStatus] = useState<Status | 'Semua'>('Semua')
  const [ketikan, setKetikan] = useState('')
  const [cari, setCari] = useState('')

  const [pratinjau, setPratinjau] = useState<{ foto: string[]; judul: string } | null>(null)
  const [detailId, setDetailId] = useState<number | null>(null)
  const [ditugaskan, setDitugaskan] = useState<Kendala | null>(null)
  const [dibuka, setDibuka] = useState<Kendala | null>(null)
  const [unduhBuka, setUnduhBuka] = useState(false)

  // Pencarian dikirim ke backend setelah berhenti mengetik sebentar.
  useEffect(() => {
    const t = window.setTimeout(() => setCari(ketikan.trim()), 350)
    return () => window.clearTimeout(t)
  }, [ketikan])

  function pilihTab(t: Tab) {
    setParam(t === 'Semua' ? {} : { tab: t.toLowerCase() }, { replace: true })
  }

  /** Petugas terpilih dilepas bila jabatannya tidak cocok lagi dengan saringan jabatan. */
  function pilihJabatan(j: Jabatan | 'Semua') {
    setJabatan(j)
    if (petugas && j !== 'Semua' && petugas.jabatan !== j) setPetugas(null)
  }

  const jendela = useMemo(
    () => jendelaPeriode(periode, tanggal, bulan, rentang),
    [periode, tanggal, bulan, rentang],
  )
  const dasar = jendela
    ? { ...jendela, jabatan: jabatan === 'Semua' ? '' : jabatan, petugas_id: petugas?.id, cari, batas: BATAS_DAFTAR }
    : null

  const logbook = useApi<Logbook[]>(dasar ? `/api/logbook${query(dasar)}` : null, [])
  // Status disaring di layar supaya kartu statistik tetap menghitung seluruh periode.
  const kendala = useApi<Kendala[]>(dasar ? `/api/kendala${query(dasar)}` : null, [])
  // Angka merah di tab: semua kendala yang belum selesai, dari periode mana pun.
  const terbuka = useApi<Kendala[]>('/api/kendala?terbuka=true&batas=1000', [])

  const memuat = logbook.memuat || kendala.memuat
  const galat = logbook.galat ?? kendala.galat
  function muatUlang() {
    logbook.muat()
    kendala.muat()
    terbuka.muat()
  }

  const bertanda = (x: { tanda?: string[] }) => (x.tanda?.length ?? 0) > 0
  const logbookTerlihat = useMemo(
    () => (hanyaJanggal ? logbook.data.filter(bertanda) : logbook.data),
    [logbook.data, hanyaJanggal],
  )
  const kendalaTerlihat = useMemo(
    () =>
      kendala.data.filter((k) => (status === 'Semua' || k.status === status) && (!hanyaJanggal || bertanda(k))),
    [kendala.data, status, hanyaJanggal],
  )
  // Jumlah di pilihan saringan: laporan bertanda pada tab dan periode yang sedang dilihat.
  const jumlahJanggal =
    (tab !== 'Kendala' ? logbook.data.filter(bertanda).length : 0) +
    (tab !== 'Aktivitas' ? kendala.data.filter(bertanda).length : 0)

  const butir = useMemo<Butir[]>(() => {
    const hasil: Butir[] = []
    if (tab !== 'Kendala') {
      for (const l of logbookTerlihat) hasil.push({ jenis: 'aktivitas', tanggalIso: l.tanggalIso ?? '', jam: l.jam, data: l })
    }
    if (tab !== 'Aktivitas') {
      for (const k of kendalaTerlihat) hasil.push({ jenis: 'kendala', tanggalIso: k.tanggalIso ?? '', jam: k.jam, data: k })
    }
    return hasil.sort((a, b) => b.tanggalIso.localeCompare(a.tanggalIso) || b.jam.localeCompare(a.jam))
  }, [logbookTerlihat, kendalaTerlihat, tab])

  const jumlah = (s: Status) => kendala.data.filter((k) => k.status === s).length
  // Daftar mencapai batas = data lama mungkin tidak ikut; angka kartu jadi angka minimal.
  const potongLogbook = tab !== 'Kendala' && terpotong(logbook.data.length)
  const potongKendala = tab !== 'Aktivitas' && terpotong(kendala.data.length)
  const angkaStatus = (s: Status) => angkaDaftar(jumlah(s), potongKendala)

  const saringan = [jabatan === 'Semua' ? '' : JABATAN_PANJANG[jabatan], petugas?.nama ?? '', cari && `“${cari}”`]
    .filter(Boolean)
    .join(' · ')

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

  function unduh(isi: Tab) {
    const keterangan = (n: number, satuan: string) =>
      [`Periode: ${labelPeriode}`, saringan || 'Semua petugas', `${n} ${satuan}`].join(' · ')
    const kolomKendala = (k: Kendala) => [
      k.status,
      k.penangan?.nama ?? '',
      k.selesaiPada ?? '',
      k.keteranganSelesai ?? '',
    ]
    const akhiran = jendela?.dari ?? 'semua'

    if (isi === 'Aktivitas') {
      unduhExcel({
        namaBerkas: `laporan-aktivitas-${akhiran}`,
        judul: 'Laporan Aktivitas Petugas',
        keterangan: keterangan(logbookTerlihat.length, 'catatan'),
        namaLembar: 'Aktivitas',
        kepala: ['Nama', 'Jabatan', 'Tanggal', 'Hari', 'Jam', 'Keterangan', 'Lembur'],
        baris: logbookTerlihat.map((l) => [l.nama, JABATAN_PANJANG[l.jabatan], l.tanggal, l.hari, l.jam, l.keterangan, l.lembur]),
      })
    } else if (isi === 'Kendala') {
      unduhExcel({
        namaBerkas: `laporan-kendala-${akhiran}`,
        judul: 'Laporan Kendala Petugas',
        keterangan: [keterangan(kendalaTerlihat.length, 'laporan'), status === 'Semua' ? 'Semua status' : `Status ${status}`].join(' · '),
        namaLembar: 'Kendala',
        kepala: [
          'Pelapor', 'Jabatan', 'Tanggal', 'Hari', 'Jam', 'Keterangan', 'Status', 'Penangan', 'Waktu selesai',
          'Keterangan penyelesaian',
        ],
        baris: kendalaTerlihat.map((k) => [
          k.nama, JABATAN_PANJANG[k.jabatan], k.tanggal, k.hari, k.jam, k.keterangan, ...kolomKendala(k),
        ]),
      })
    } else {
      // Urutan sama dengan daftar di layar tab Semua.
      const semua = [
        ...logbookTerlihat.map((l) => ({ t: l.tanggalIso ?? '', j: l.jam, b: ['Aktivitas', l.nama, JABATAN_PANJANG[l.jabatan], l.tanggal, l.hari, l.jam, l.keterangan, l.lembur, '', '', '', ''] })),
        ...kendalaTerlihat.map((k) => ({ t: k.tanggalIso ?? '', j: k.jam, b: ['Kendala', k.nama, JABATAN_PANJANG[k.jabatan], k.tanggal, k.hari, k.jam, k.keterangan, '', ...kolomKendala(k)] })),
      ].sort((a, b) => b.t.localeCompare(a.t) || b.j.localeCompare(a.j))
      unduhExcel({
        namaBerkas: `laporan-petugas-${akhiran}`,
        judul: 'Laporan Petugas',
        keterangan: keterangan(semua.length, 'catatan'),
        namaLembar: 'Laporan petugas',
        kepala: [
          'Jenis', 'Nama / pelapor', 'Jabatan', 'Tanggal', 'Hari', 'Jam', 'Keterangan', 'Lembur', 'Status kendala',
          'Penangan', 'Waktu selesai', 'Keterangan penyelesaian',
        ],
        baris: semua.map((x) => x.b),
      })
    }
    setUnduhBuka(false)
  }

  const nTerbuka = terbuka.data.length

  return (
    <>
      <div className="mb-4.5 flex flex-wrap items-center gap-3">
        <div className="flex w-full gap-1 rounded-xl bg-[#EBF1ED] p-1 sm:inline-flex sm:w-auto sm:gap-0">
          {TAB.map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={t === tab}
              onClick={() => pilihTab(t)}
              className={cn(
                'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[9px] px-4 py-[7px] text-[12.5px] font-semibold transition max-sm:min-w-0 max-sm:flex-1 max-sm:px-2',
                t === tab ? 'bg-white text-ink shadow-sm' : 'text-teks-lembut hover:text-ink',
              )}
            >
              {t}
              {t === 'Kendala' && nTerbuka > 0 && (
                <i
                  title={`${nTerbuka} kendala belum selesai`}
                  className="num grid h-5 min-w-[20px] place-items-center rounded-full bg-merah px-1.5 text-[11px] font-bold not-italic text-white"
                >
                  {nTerbuka > 99 ? '99+' : nTerbuka}
                </i>
              )}
            </button>
          ))}
        </div>
      </div>

      {tab === 'Kendala' && (
        <div className="mb-4.5 grid grid-cols-2 gap-4.5 max-sm:gap-2.5 sm:grid-cols-3">
          <StatCard ringkas nama="Laporan baru" angka={angkaStatus('Baru')} nada="tanah" ikon={<Ikon.Awas size={17} />} ket="Belum mulai ditangani" />
          <StatCard ringkas nama="Sedang diproses" angka={angkaStatus('Diproses')} nada="emas" ikon={<Ikon.Jam size={17} />} ket="Sedang ditangani petugas" />
          <div className="max-sm:col-span-2">
            <StatCard ringkas nama="Selesai" angka={angkaStatus('Selesai')} ikon={<Ikon.Centang size={17} />} ket="Pada periode yang dipilih" />
          </div>
        </div>
      )}

      <Kartu className="mb-4.5">
        <IsiKartu className="p-4">
          <Segmen
            lebar
            opsi={['Harian', 'Bulanan', 'Custom', 'All Time']}
            nilai={periode}
            onPilih={(v) => setPeriode(v as Periode)}
          />
          {/* HP: grid 2 kolom — periode, cari, status, dan unduh selebar penuh; jabatan + petugas berdampingan. */}
          <div className="mt-3 flex flex-wrap items-center gap-2 max-sm:grid max-sm:grid-cols-2">
            {periode === 'Harian' && (
              <InputRapi
                type="date"
                aria-label="Tanggal"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="max-sm:col-span-2 max-sm:w-full"
              />
            )}
            {periode === 'Bulanan' && (
              <PilihRapi
                aria-label="Bulan"
                value={bulan}
                onChange={(e) => setBulan(e.target.value)}
                className="min-w-[180px] max-sm:col-span-2 max-sm:w-full"
              >
                {BULAN_PILIHAN.map((b) => (
                  <option key={b.kunci} value={b.kunci}>
                    {b.label}
                  </option>
                ))}
              </PilihRapi>
            )}
            {periode === 'Custom' && (
              <RentangTanggal
                nilai={rentang}
                onPilih={setRentang}
                className="w-[260px] max-sm:col-span-2 max-sm:w-full"
              />
            )}
            {periode === 'All Time' && (
              <span className="rounded-[10px] border border-garis bg-[#FAFCFB] px-3 py-2.5 text-[13px] text-teks-lembut max-sm:col-span-2">
                Seluruh catatan tanpa batas tanggal
              </span>
            )}

            <div className="relative ml-auto max-sm:col-span-2 max-sm:ml-0">
              <Ikon.Cari size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-teks-samar" />
              <InputRapi
                type="search"
                aria-label="Cari nama petugas"
                placeholder="Cari nama…"
                value={ketikan}
                onChange={(e) => setKetikan(e.target.value)}
                className="w-[180px] pl-8 max-sm:w-full"
              />
            </div>
            <PilihRapi
              aria-label="Jabatan petugas"
              value={jabatan}
              onChange={(e) => pilihJabatan(e.target.value as Jabatan | 'Semua')}
              className="max-sm:w-full"
            >
              <option value="Semua">Semua jabatan</option>
              {DAFTAR_JABATAN.map((j) => (
                <option key={j} value={j}>
                  {JABATAN_PANJANG[j]}
                </option>
              ))}
            </PilihRapi>
            <PilihPetugas
              jabatan={jabatan}
              nilai={petugas}
              onPilih={setPetugas}
              className="max-sm:w-full max-sm:min-w-0"
            />
            {tab !== 'Aktivitas' && (
              <PilihRapi
                aria-label="Status kendala"
                value={status}
                onChange={(e) => setStatus(e.target.value as Status | 'Semua')}
                className="max-sm:col-span-2 max-sm:w-full"
              >
                <option value="Semua">Semua status kendala</option>
                {STATUS_KENDALA.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </PilihRapi>
            )}
            <PilihRapi
              aria-label="Saring laporan yang perlu dicek"
              value={hanyaJanggal ? 'janggal' : 'semua'}
              onChange={(e) => setHanyaJanggal(e.target.value === 'janggal')}
              className="max-sm:col-span-2 max-sm:w-full"
            >
              <option value="semua">Semua laporan</option>
              <option value="janggal">Hanya yang perlu dicek{jumlahJanggal > 0 ? ` (${jumlahJanggal})` : ''}</option>
            </PilihRapi>
            <Tombol
              varian="hantu"
              kecil
              onClick={() => setUnduhBuka(true)}
              disabled={logbookTerlihat.length + kendalaTerlihat.length === 0}
              className="max-sm:col-span-2 max-sm:w-full"
            >
              <Ikon.Unduh size={15} /> Unduh Excel
            </Tombol>
          </div>
        </IsiKartu>
      </Kartu>

      <Kartu>
        <KopKartu
          judul={tab === 'Semua' ? 'Laporan petugas' : tab === 'Aktivitas' ? 'Aktivitas petugas' : 'Laporan kendala'}
          sub={`${labelPeriode}${saringan ? ` · ${saringan}` : ''}`}
          aksi={<span className="num whitespace-nowrap text-[12.5px] text-teks-lembut">{butir.length} catatan</span>}
        />
        <StatusData memuat={memuat} galat={galat} onUlang={muatUlang} />
        {(potongLogbook || potongKendala) && <InfoTerpotong className="mx-5 mt-3" />}
        {butir.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <span className="mx-auto mb-2.5 grid h-11 w-11 place-items-center rounded-full bg-[#F3F7F4] text-teks-samar">
              <Ikon.Buku size={19} />
            </span>
            <b className="block text-[13.5px] font-semibold text-ink">
              {memuat
                ? 'Memuat catatan…'
                : hanyaJanggal
                  ? 'Tidak ada laporan yang perlu dicek'
                  : 'Tidak ada catatan pada saringan ini'}
            </b>
            <span className="mt-0.5 block text-[12px] text-teks-lembut">
              {dasar === null
                ? 'Pilih rentang tanggal dulu.'
                : hanyaJanggal
                  ? 'Semua laporan pada saringan ini terlihat wajar.'
                  : 'Ganti periode, jabatan, nama, atau status.'}
            </span>
          </div>
        ) : (
          <ul className="m-0 list-none divide-y divide-garis p-0">
            {butir.map((b) =>
              b.jenis === 'aktivitas' ? (
                <BarisAktivitas
                  key={`l-${b.data.id}`}
                  l={b.data}
                  onFoto={() =>
                    b.data.fotoUrl?.length &&
                    setPratinjau({ foto: b.data.fotoUrl, judul: `Foto aktivitas · ${b.data.nama}` })
                  }
                />
              ) : (
                <BarisKendala
                  key={`k-${b.data.id}`}
                  k={b.data}
                  onFoto={() =>
                    b.data.fotoSebelum?.length &&
                    setPratinjau({ foto: b.data.fotoSebelum, judul: `Foto kendala · ${b.data.nama}` })
                  }
                  onDetail={() => b.data.id && setDetailId(b.data.id)}
                  onTugaskan={() => setDitugaskan(b.data)}
                  onBukaLagi={() => setDibuka(b.data)}
                />
              ),
            )}
          </ul>
        )}
      </Kartu>

      {detailId !== null && (
        <ModalDetailKendala id={detailId} onTutup={() => setDetailId(null)} onBerubah={muatUlang} />
      )}
      {ditugaskan && (
        <ModalTugaskan
          kendala={ditugaskan}
          onTutup={() => setDitugaskan(null)}
          onBerhasil={() => {
            setDitugaskan(null)
            muatUlang()
          }}
        />
      )}
      {dibuka && (
        <ModalBukaLagi
          kendala={dibuka}
          onTutup={() => setDibuka(null)}
          onBerhasil={() => {
            setDibuka(null)
            muatUlang()
          }}
        />
      )}
      {unduhBuka && <ModalUnduh awal={tab} onTutup={() => setUnduhBuka(false)} onUnduh={unduh} />}
      {pratinjau && <PratinjauFoto foto={pratinjau.foto} judul={pratinjau.judul} onTutup={() => setPratinjau(null)} />}
    </>
  )
}

/* ------------------------------------------------------------------ Baris */

/**
 * Alasan kejanggalan dari sistem (backend app/kejanggalan.py). Hanya penanda
 * untuk dicek admin — bukan tuduhan, jadi bahasanya netral.
 */
function TandaJanggal({ tanda }: { tanda?: string[] }) {
  if (!tanda?.length) return null
  return (
    <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Perlu dicek">
      {tanda.map((t) => (
        <span
          key={t}
          className="inline-flex items-center gap-1 rounded-full border border-emas/50 bg-emas-lembut px-2 py-0.5 text-[11.5px] font-semibold text-emas-teks"
        >
          <Ikon.Awas size={12} /> {t}
        </span>
      ))}
    </div>
  )
}

function Waktu({ tanggal, hari, jam }: { tanggal: string; hari: string; jam: string }) {
  return (
    <span className="num whitespace-nowrap text-[11.5px] text-teks-samar">
      {hari}, {tanggal} · {jam}
    </span>
  )
}

/**
 * Satu orang di baris laporan (pelapor/penangan). Gayanya sama dengan SelOrang,
 * tetapi boleh tanpa jabatan (mis. admin sebagai penangan) dan punya tampilan
 * kosong untuk kendala yang belum punya penangan.
 */
function OrangBaris({
  nama,
  jabatan,
  foto,
  keterangan,
  kosong,
}: {
  nama: string
  jabatan?: Jabatan
  foto?: string | null
  keterangan: string
  kosong?: boolean
}) {
  return (
    <div className="flex items-center gap-3">
      {kosong ? (
        <span className="grid h-[34px] w-[34px] flex-none place-items-center rounded-[10px] border border-dashed border-garis-kuat text-teks-samar">
          <Ikon.Orang size={15} />
        </span>
      ) : (
        <Avatar nama={nama} jabatan={jabatan} foto={foto} />
      )}
      <div>
        <b className="block whitespace-nowrap text-[13px] font-semibold text-ink">{nama}</b>
        <span className="block text-[11.5px] text-teks-samar">{keterangan}</span>
      </div>
    </div>
  )
}

function BarisAktivitas({ l, onFoto }: { l: Logbook; onFoto: () => void }) {
  return (
    <li className="flex items-start gap-3.5 px-5 py-4 hover:bg-[#FAFCFB]">
      <FotoKecil varian={l.foto} url={l.fotoUrl?.[0]} onClick={onFoto} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <TagAktivitas />
          <Waktu tanggal={l.tanggal} hari={l.hari} jam={l.jam} />
        </div>
        <TandaJanggal tanda={l.tanda} />
        <div className="mt-2">
          <OrangBaris nama={l.nama} jabatan={l.jabatan} foto={l.fotoProfil} keterangan={JABATAN_PANJANG[l.jabatan]} />
        </div>
        <p className="m-0 mt-2 text-[12.5px] leading-relaxed text-teks-lembut">{l.keterangan}</p>
      </div>
      {l.lembur !== '—' && (
        <span className="num flex-none rounded-full bg-emas-lembut px-2.5 py-1 text-[11.5px] font-semibold text-emas-teks">
          {l.lembur} lembur
        </span>
      )}
    </li>
  )
}

function BarisKendala({
  k,
  onFoto,
  onDetail,
  onTugaskan,
  onBukaLagi,
}: {
  k: Kendala
  onFoto: () => void
  onDetail: () => void
  onTugaskan: () => void
  onBukaLagi: () => void
}) {
  return (
    <li className={cn('flex items-start gap-3.5 px-5 py-4 hover:bg-[#FAFCFB]', k.status !== 'Selesai' && 'bg-[#FFFCF4]')}>
      <FotoKecil varian={k.foto} url={k.fotoSebelum?.[0] ?? k.fotoUrl?.[0]} onClick={onFoto} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <TagKendala />
          <Pil status={k.status} />
          <Waktu tanggal={k.tanggal} hari={k.hari} jam={k.jam} />
        </div>
        <TandaJanggal tanda={k.tanda} />
        {/* HP: bertumpuk dengan tepi kiri sejajar; laptop: berdampingan. */}
        <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-2 max-sm:flex-col max-sm:items-start max-sm:gap-y-2.5">
          <OrangBaris
            nama={k.nama}
            jabatan={k.jabatan}
            foto={k.fotoProfil}
            keterangan={`Pelapor · ${JABATAN_PANJANG[k.jabatan]}`}
          />
          <OrangBaris
            nama={k.penangan?.nama ?? 'Belum ada'}
            jabatan={k.penangan?.jabatan ?? undefined}
            foto={k.penangan?.fotoProfil}
            keterangan="Penangan"
            kosong={!k.penangan}
          />
        </div>
        <p className="m-0 mt-2 line-clamp-2 text-[12.5px] leading-relaxed text-teks-lembut">{k.keterangan}</p>
        {k.status === 'Selesai' && k.keteranganSelesai && (
          <p className="m-0 mt-1.5 line-clamp-1 text-[12px] text-hijau-tua">
            <b className="font-semibold">Selesai{k.selesaiPada ? ` ${k.selesaiPada}` : ''}:</b> {k.keteranganSelesai}
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <Tombol varian="hantu" kecil onClick={onDetail}>
            <Ikon.Mata size={14} /> Lihat detail
          </Tombol>
          {k.status === 'Selesai' ? (
            <Tombol varian="hantu" kecil onClick={onBukaLagi}>
              <Ikon.Putar size={14} /> Buka lagi
            </Tombol>
          ) : (
            <Tombol varian="hantu" kecil onClick={onTugaskan}>
              <Ikon.Orang size={14} /> Tugaskan ke…
            </Tombol>
          )}
        </div>
      </div>
    </li>
  )
}

/* ------------------------------------------------------------------ Unduh */

function ModalUnduh({ awal, onTutup, onUnduh }: { awal: Tab; onTutup: () => void; onUnduh: (isi: Tab) => void }) {
  const [isi, setIsi] = useState<Tab>(awal)
  const PILIHAN: Record<Tab, string> = { Semua: 'Semua', Aktivitas: 'Hanya aktivitas', Kendala: 'Hanya kendala' }
  return (
    <Modal
      judul="Unduh Excel"
      sub="Mengikuti periode dan saringan yang sedang dipakai"
      onTutup={onTutup}
      aksi={
        <>
          <Tombol varian="hantu" onClick={onTutup}>
            Batal
          </Tombol>
          <Tombol onClick={() => onUnduh(isi)}>
            <Ikon.Unduh size={15} /> Unduh
          </Tombol>
        </>
      }
    >
      <Kolom label="Isi berkas">
        <Segmen
          lebar
          opsi={TAB.map((t) => PILIHAN[t])}
          nilai={PILIHAN[isi]}
          onPilih={(v) => setIsi(TAB.find((t) => PILIHAN[t] === v) ?? 'Semua')}
        />
      </Kolom>
      <p className="m-0 mt-3 text-[11.5px] leading-relaxed text-teks-samar">
        Kolom kendala berisi pelapor, status, penangan, waktu selesai, dan keterangan penyelesaian.
      </p>
    </Modal>
  )
}
