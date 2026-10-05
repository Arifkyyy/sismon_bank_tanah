import { useMemo, useState } from 'react'
import { KartuAntreanLembur, kekuranganDraf, MAKS_JAM_LEMBUR } from '@/components/AntreanLembur'
import type { Rentang } from '@/components/RentangTanggal'
import { RentangTanggal } from '@/components/RentangTanggal'
import {
  AreaTeks, Baris, GridForm, Input, InputRapi, IsiKartu, KakiForm, Kartu, Kolom,
  KopKartu, Pil, Pilihan, PilihRapi, Segmen, SelOrang, Tabel, Tombol,
} from '@/components/ui'
import { cetakRekapLembur, ModalJamAktual, SelUangLembur } from '@/components/LemburSelesai'
import { StatusData } from '@/components/StatusData'
import { TombolTarifLembur } from '@/components/TarifLembur'
import { useKonfirmasi } from '@/context/KonfirmasiContext'
import { useLembur } from '@/context/LemburContext'
import { api, pesanGalat, query } from '@/lib/api'
import { Ikon } from '@/lib/ikon'
import { daftarBulan, formatRentang, formatTanggal, keIso, lamaLembur, menitLembur } from '@/lib/tanggal'
import { useApi } from '@/lib/useApi'
import { DAFTAR_JABATAN, JABATAN_PANJANG, jabatanDariLabel } from '@/lib/util'
import type { DrafLembur, Jabatan, Lembur, Status } from '@/types'

/** Formulir kosong; tanggalnya hari ini supaya tidak pernah basi. */
function formKosong() {
  return {
    jabatan: 'Security' as Jabatan,
    nama: '',
    tanggal: keIso(new Date()),
    mulai: '18:00',
    selesai: '22:00',
    keterangan: '',
  }
}

const BULAN_PILIHAN = daftarBulan()

type Periode = 'Harian' | 'Bulanan' | 'Custom'

/** Keterangan status di belakang nama, supaya admin tahu sebelum memilih. */
const KET_STATUS: Partial<Record<Status, string>> = {
  Cuti: 'sedang cuti',
  Nonaktif: 'akun nonaktif',
}

export function PengajuanLembur() {
  const {
    daftar, menunggu, pending, petugas, memuat, galat, muat, galatAksi,
    tambahPending, ubahPending, hapusPending, kirimPending,
  } = useLembur()
  const [form, setForm] = useState(formKosong)
  const [editId, setEditId] = useState<string | null>(null)
  const [periode, setPeriode] = useState<Periode>('Harian')
  const [tanggal, setTanggal] = useState(() => keIso(new Date()))
  const [bulan, setBulan] = useState(BULAN_PILIHAN[0].kunci)
  const [rentang, setRentang] = useState<Rentang | null>(null)
  const [jabatanSaring, setJabatanSaring] = useState<Jabatan | 'Semua'>('Semua')
  const [dikoreksi, setDikoreksi] = useState<Lembur | null>(null)
  const [galatTabel, setGalatTabel] = useState<string | null>(null)
  const [sibukId, setSibukId] = useState<string | null>(null)
  const konfirmasi = useKonfirmasi()

  /**
   * Nama petugas hanya boleh berasal dari jabatan yang dipilih — Security tidak
   * pernah muncul di daftar OB dan sebaliknya. Petugas nonaktif disembunyikan,
   * kecuali ia memang nama yang sedang dipilih pada draf yang sedang dikoreksi,
   * supaya nilai pilihan tidak berubah diam-diam saat draf lama dibuka.
   */
  const kandidat = useMemo(() => {
    const cocok = petugas.filter((p) => p.jabatan === form.jabatan && p.status !== 'Nonaktif')
    const terpilih = petugas.find((p) => p.nama === form.nama && p.jabatan === form.jabatan)
    return terpilih && !cocok.includes(terpilih) ? [...cocok, terpilih] : cocok
  }, [petugas, form.jabatan, form.nama])

  const terlaluLama = menitLembur(form.mulai, form.selesai) > MAKS_JAM_LEMBUR * 60

  /** Ganti jabatan selalu mengosongkan nama: daftar namanya sudah berbeda. */
  function gantiJabatan(label: string) {
    setForm((f) => ({ ...f, jabatan: jabatanDariLabel(label), nama: '' }))
  }

  /** Formulir hanya dikosongkan kalau server benar-benar menerima drafnya. */
  async function simpanDraf() {
    const isi: Omit<DrafLembur, 'id'> = { ...form }
    const berhasil = editId ? await ubahPending(editId, isi) : await tambahPending(isi)
    if (!berhasil) return
    setEditId(null)
    setForm(formKosong())
  }

  function editDraf(d: DrafLembur) {
    setEditId(d.id)
    setForm({
      jabatan: d.jabatan,
      nama: d.nama,
      tanggal: d.tanggal,
      mulai: d.mulai,
      selesai: d.selesai,
      keterangan: d.keterangan,
    })
  }

  async function hapusDraf(id: string) {
    if (!(await hapusPending(id))) return
    if (editId === id) batalEdit()
  }

  async function kirimDraf(id: string) {
    const draf = pending.find((p) => p.id === id)
    if (!(await kirimPending(id))) return
    void tersaring.muat()

    if (draf) {
      setPeriode('Harian')
      setTanggal(draf.tanggal)
      setJabatanSaring(draf.jabatan)
    }
    if (editId === id) batalEdit()
  }

  
  async function kirimSemuaDraf() {
    const siap = pending.filter((d) => kekuranganDraf(d).length === 0)
    
    for (const d of siap) {
      if (!(await kirimPending(d.id))) break
    }
    void tersaring.muat()
    if (editId && siap.some((d) => d.id === editId)) batalEdit()
  }

  function batalEdit() {
    setEditId(null)
    setForm(formKosong())
  }

  
  let dari: string | null = null
  let sampai: string | null = null
  if (periode === 'Harian') {
    dari = sampai = tanggal
  } else if (periode === 'Bulanan') {
    const [y, m] = bulan.split('-').map(Number)
    dari = `${bulan}-01`
    sampai = keIso(new Date(y, m, 0)) 
  } else if (rentang) {
    dari = rentang.mulai
    sampai = rentang.sampai
  }
  const tersaring = useApi<Lembur[]>(
    dari && sampai
      ? `/api/lembur${query({ dari, sampai, jabatan: jabatanSaring === 'Semua' ? undefined : jabatanSaring })}`
      : null,
    [],
  )
  
  const terlihat = useMemo(
    () => (dari ? [...tersaring.data].sort((a, b) => b.tanggalIso.localeCompare(a.tanggalIso)) : []),
    [dari, tersaring.data],
  )
  const totalUpah = terlihat.reduce(
    (n, l) => n + (l.status === 'Diterima' || l.status === 'Selesai' ? (l.upah ?? 0) : 0),
    0,
  )

  
  async function aksiBaris(l: Lembur, jalan: () => Promise<unknown>): Promise<string | null> {
    setGalatTabel(null)
    setSibukId(l.id)
    try {
      await jalan()
      void tersaring.muat()
      muat()
      return null
    } catch (e) {
      const g = pesanGalat(e)
      setGalatTabel(g)
      return g
    } finally {
      setSibukId(null)
    }
  }

  async function bayar(l: Lembur) {
    const ya = await konfirmasi({
      judul: 'Tandai lembur sudah dibayar?',
      pesan: `${l.nama} · ${l.tanggal} · ${l.total} · Rp ${(l.upah ?? 0).toLocaleString('id-ID')}. Jam lembur tidak bisa dikoreksi lagi sampai tanda bayar dibatalkan.`,
      tombol: 'Tandai dibayar',
    })
    if (ya) await aksiBaris(l, () => api(`/api/lembur/${l.id}/bayar`, 'POST'))
  }

  async function batalBayar(l: Lembur) {
    const ya = await konfirmasi({
      judul: 'Batalkan tanda bayar?',
      pesan: `Lembur ${l.nama} tanggal ${l.tanggal} akan kembali tercatat belum dibayar.`,
      tombol: 'Batalkan tanda bayar',
      nada: 'bahaya',
    })
    if (ya) await aksiBaris(l, () => api(`/api/lembur/${l.id}/bayar`, 'DELETE'))
  }

 
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
    default:
      labelPeriode = rentang
        ? formatRentang(rentang.mulai, rentang.sampai)
        : 'Rentang tanggal belum dipilih'
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4.5 xl:grid-cols-[1.3fr_1fr]">
        <Kartu className="self-start">
          <KopKartu
            judul="Buat penugasan lembur"
            sub="Disimpan ke Cek Laporan dulu — petugas belum menerima apa pun"
            aksi={
              <>
                {editId && <Pil status="Diproses">Mengedit draf</Pil>}
                <TombolTarifLembur />
              </>
            }
          />
          <IsiKartu>
            <GridForm>
              <Kolom label="Jabatan yang ditugaskan" wajib penuh>
                <Segmen
                  lebar
                  opsi={DAFTAR_JABATAN.map((j) => JABATAN_PANJANG[j])}
                  nilai={JABATAN_PANJANG[form.jabatan]}
                  onPilih={gantiJabatan}
                />
              </Kolom>

              <Kolom
                label="Nama petugas"
                wajib
                penuh
                bantu={`Hanya petugas berjabatan ${JABATAN_PANJANG[form.jabatan]} yang muncul di daftar ini.`}
              >
                <Pilihan
                  value={form.nama}
                  onChange={(e) => setForm((f) => ({ ...f, nama: e.target.value }))}
                >
                  <option value="">Pilih nama petugas</option>
                  {kandidat.map((p) => (
                    <option key={p.nama} value={p.nama}>
                      {p.nama}
                      {KET_STATUS[p.status] ? ` — ${KET_STATUS[p.status]}` : ''}
                    </option>
                  ))}
                  {kandidat.length === 0 && (
                    <option disabled value="">
                      Tidak ada petugas {JABATAN_PANJANG[form.jabatan]} yang aktif
                    </option>
                  )}
                </Pilihan>
              </Kolom>

              <Kolom label="Tanggal lembur" wajib>
                <Input
                  type="date"
                  min={keIso(new Date())}
                  value={form.tanggal}
                  onChange={(e) => setForm((f) => ({ ...f, tanggal: e.target.value }))}
                />
              </Kolom>

              <Kolom
                label="Total lama lembur"
                bantu={
                  terlaluLama
                    ? `Melebihi batas ${MAKS_JAM_LEMBUR} jam. Periksa jam mulai dan jam selesai.`
                    : 'Terisi otomatis dari rentang jam.'
                }
              >
                <Input readOnly value={lamaLembur(form.mulai, form.selesai)} />
              </Kolom>

              <Kolom label="Jam mulai" wajib>
                <Input
                  type="time"
                  value={form.mulai}
                  onChange={(e) => setForm((f) => ({ ...f, mulai: e.target.value }))}
                />
              </Kolom>

              <Kolom label="Jam selesai" wajib>
                <Input
                  type="time"
                  value={form.selesai}
                  onChange={(e) => setForm((f) => ({ ...f, selesai: e.target.value }))}
                />
              </Kolom>

              <Kolom
                label="Keterangan tugas"
                wajib
                penuh
                bantu="Tulis tugas nyatanya supaya petugas tahu apa yang dikerjakan."
              >
                <AreaTeks
                  value={form.keterangan}
                  onChange={(e) => setForm((f) => ({ ...f, keterangan: e.target.value }))}
                  placeholder="Contoh: pengamanan rapat koordinasi direksi di Ruang Serbaguna lantai 5."
                />
              </Kolom>
            </GridForm>
          </IsiKartu>
          {galatAksi && (
            <div className="mx-5 mb-4 flex items-start gap-2 rounded-xl border border-merah/30 bg-merah-lembut px-3 py-2 text-[11.5px] leading-relaxed text-merah-teks">
              <Ikon.Awas size={14} className="mt-px flex-none" />
              <span>{galatAksi}</span>
            </div>
          )}
          <KakiForm>
            <Tombol varian="hantu" onClick={batalEdit}>
              {editId ? 'Batal' : 'Kosongkan'}
            </Tombol>
            <Tombol onClick={simpanDraf}>
              <Ikon.Tambah size={15} />
              {editId ? 'Simpan perubahan' : 'Simpan ke Cek Laporan'}
            </Tombol>
          </KakiForm>
        </Kartu>

        <div className="grid content-start gap-4.5">
          <KartuAntreanLembur
            daftar={pending}
            petugas={petugas}
            editId={editId}
            onEdit={editDraf}
            onKirim={kirimDraf}
            onKirimSemua={kirimSemuaDraf}
            onHapus={hapusDraf}
          />

          
        </div>
      </div>

      <Kartu className="mt-4.5">
        <KopKartu
          judul="Penugasan yang sudah dikirim"
          sub={`${labelPeriode}${jabatanSaring === 'Semua' ? '' : ` · ${JABATAN_PANJANG[jabatanSaring]}`} · jawaban petugas muncul di kolom status`}
          aksi={
            <>
              <Pil status="Menunggu">{menunggu.length} belum dijawab</Pil>
              <Tombol
                varian="hantu"
                kecil
                disabled={tersaring.memuat || terlihat.length === 0}
                onClick={() =>
                  cetakRekapLembur(
                    terlihat,
                    [
                      `Periode: ${labelPeriode}`,
                      `Jabatan: ${jabatanSaring === 'Semua' ? 'Semua jabatan' : JABATAN_PANJANG[jabatanSaring]}`,
                    ],
                    true,
                  )
                }
              >
                <Ikon.Unduh size={15} /> Unduh PDF
              </Tombol>
            </>
          }
        />

        <IsiKartu className="flex flex-wrap items-center gap-2 border-b border-garis py-4">
          <Segmen
            opsi={['Harian', 'Bulanan', 'Custom']}
            nilai={periode}
            onPilih={(v) => setPeriode(v as Periode)}
          />

          {periode === 'Harian' && (
            <InputRapi
              type="date"
              aria-label="Tanggal penugasan"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
            />
          )}
          {periode === 'Bulanan' && (
            <PilihRapi
              aria-label="Bulan penugasan"
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
          {periode === 'Custom' && (
            <RentangTanggal nilai={rentang} onPilih={setRentang} className="w-[260px]" />
          )}

          <PilihRapi
            aria-label="Jabatan petugas"
            value={jabatanSaring}
            onChange={(e) => setJabatanSaring(e.target.value as Jabatan | 'Semua')}
            className="ml-auto"
          >
            <option value="Semua">Semua jabatan</option>
            {DAFTAR_JABATAN.map((j) => (
              <option key={j} value={j}>
                {JABATAN_PANJANG[j]}
              </option>
            ))}
          </PilihRapi>

          <span className="num whitespace-nowrap text-[12.5px] text-teks-lembut">
            {terlihat.length} penugasan · Rp {totalUpah.toLocaleString('id-ID')}
          </span>
        </IsiKartu>

        {galatTabel && (
          <div className="mx-5 mt-3 flex items-start gap-2 rounded-xl border border-merah/30 bg-merah-lembut px-3 py-2 text-[11.5px] leading-relaxed text-merah-teks">
            <Ikon.Awas size={14} className="mt-px flex-none" />
            <span>{galatTabel}</span>
          </div>
        )}
        <StatusData
          memuat={memuat || tersaring.memuat}
          galat={galat ?? tersaring.galat}
          onUlang={() => {
            muat()
            void tersaring.muat()
          }}
        />
        <Tabel kepala={['Petugas', 'Tanggal', 'Rentang jam', 'Total', 'Keterangan', 'Status', 'Uang lembur']} maksTinggi={560}>
          {terlihat.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-5 py-12 text-center">
                <span className="mx-auto mb-2.5 grid h-11 w-11 place-items-center rounded-full bg-[#F3F7F4] text-teks-samar">
                  <Ikon.Kalender size={19} />
                </span>
                <b className="block text-[13.5px] font-semibold text-ink">
                  Tidak ada penugasan pada periode ini
                </b>
                <span className="mt-0.5 block text-[12px] text-teks-lembut">
                  {daftar.length > 0
                    ? `Ganti periode atau jabatan di atas — ada ${daftar.length} penugasan tercatat seluruhnya.`
                    : 'Belum ada penugasan yang dikirim ke petugas.'}
                </span>
              </td>
            </tr>
          ) : (
            terlihat.map((l) => (
              <Baris key={l.id}>
                <td>
                  <SelOrang nama={l.nama} jabatan={l.jabatan} foto={l.fotoProfil} />
                </td>
                <td className="num whitespace-nowrap">{l.tanggal}</td>
                <td className="num whitespace-nowrap">
                  {l.rentangAktual ?? l.rentang}
                  {l.rentangAktual && (
                    <span className="mt-0.5 block text-[11px] text-teks-samar">Rencana {l.rentang}</span>
                  )}
                </td>
                <td className="num whitespace-nowrap">{l.total}</td>
                <td className="max-w-[420px] whitespace-normal text-teks-lembut">
                  {l.keterangan}
                  {l.status === 'Ditolak' && l.alasan && (
                    <span className="mt-1.5 block rounded-lg border border-tanah/30 bg-tanah-lembut px-2.5 py-1.5 text-[11.5px] leading-relaxed text-tanah-teks">
                      <b className="font-semibold">Alasan penolakan:</b> {l.alasan}
                    </span>
                  )}
                </td>
                <td>
                  <Pil status={l.status} />
                  {l.dijawabPada && (
                    <span className="num mt-1 block whitespace-nowrap text-[11px] text-teks-samar">
                      {l.dijawabPada}
                    </span>
                  )}
                </td>
                <td>
                  <SelUangLembur
                    lembur={l}
                    sibuk={sibukId === l.id}
                    onKoreksi={setDikoreksi}
                    onBayar={bayar}
                    onBatalBayar={batalBayar}
                  />
                </td>
              </Baris>
            ))
          )}
        </Tabel>
      </Kartu>

      {dikoreksi && (
        <ModalJamAktual
          lembur={dikoreksi}
          onTutup={() => setDikoreksi(null)}
          onSimpan={(mulai, selesai) =>
            aksiBaris(dikoreksi, () => api(`/api/lembur/${dikoreksi.id}/jam-aktual`, 'PUT', { mulai, selesai }))
          }
        />
      )}
    </>
  )
}
