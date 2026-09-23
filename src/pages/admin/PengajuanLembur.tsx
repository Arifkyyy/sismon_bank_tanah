import { useMemo, useState } from 'react'
import { KartuAntreanLembur, kekuranganDraf } from '@/components/AntreanLembur'
import type { Rentang } from '@/components/RentangTanggal'
import { RentangTanggal } from '@/components/RentangTanggal'
import {
  AreaTeks, Baris, GridForm, Input, InputRapi, IsiKartu, KakiForm, Kartu, Kolom,
  KopKartu, Pil, Pilihan, PilihRapi, Segmen, SelOrang, Tabel, Tombol,
} from '@/components/ui'
import { StatusData } from '@/components/StatusData'
import { useLembur } from '@/context/LemburContext'
import { Ikon } from '@/lib/ikon'
import { daftarBulan, formatRentang, formatTanggal, keIso, lamaLembur } from '@/lib/tanggal'
import { DAFTAR_JABATAN, JABATAN_PANJANG, jabatanDariLabel } from '@/lib/util'
import type { DrafLembur, Jabatan, Status } from '@/types'

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
    // Penyaring ikut pindah ke tanggal dan jabatan penugasannya: tabel disaring
    // harian per jabatan, jadi tanpa ini penugasan yang baru dikirim seolah hilang.
    if (draf) {
      setPeriode('Harian')
      setTanggal(draf.tanggal)
      setJabatanSaring(draf.jabatan)
    }
    if (editId === id) batalEdit()
  }

  /**
   * Mengirim seluruh draf yang sudah lengkap; yang masih kurang ditinggal.
   * Penyaring tidak digeser di sini karena draf bisa jatuh di beberapa tanggal
   * sekaligus — tidak ada satu hari yang benar untuk ditampilkan.
   */
  async function kirimSemuaDraf() {
    const siap = pending.filter((d) => kekuranganDraf(d).length === 0)
    // Berurutan, bukan paralel: kalau satu ditolak server, sisanya tidak ikut
    // terkirim diam-diam dan pesan galatnya tetap terbaca.
    for (const d of siap) {
      if (!(await kirimPending(d.id))) break
    }
    if (editId && siap.some((d) => d.id === editId)) batalEdit()
  }

  function batalEdit() {
    setEditId(null)
    setForm(formKosong())
  }

  /**
   * Tabel penugasan disaring per periode dan jabatan — bawaannya harian, jadi
   * admin tidak langsung dihadapkan seluruh riwayat. Perbandingan tanggal
   * memakai `tanggalIso` ('2026-09-16') supaya aman diurutkan sebagai teks.
   */
  const terlihat = useMemo(() => {
    function dalamPeriode(iso: string): boolean {
      switch (periode) {
        case 'Harian':
          return iso === tanggal
        case 'Bulanan':
          return iso.startsWith(bulan)
        default:
          return !!rentang && iso >= rentang.mulai && iso <= rentang.sampai
      }
    }

    const cocok = daftar.filter(
      (l) =>
        dalamPeriode(l.tanggalIso) &&
        (jabatanSaring === 'Semua' || l.jabatan === jabatanSaring),
    )
    // Terbaru di atas; penugasan pada tanggal sama tetap berurutan seperti aslinya.
    return [...cocok].sort((a, b) => b.tanggalIso.localeCompare(a.tanggalIso))
  }, [daftar, periode, tanggal, bulan, rentang, jabatanSaring])

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
            sub="Disimpan ke Data Pending dulu — petugas belum menerima apa pun"
            aksi={editId ? <Pil status="Diproses">Mengedit draf</Pil> : undefined}
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
                  value={form.tanggal}
                  onChange={(e) => setForm((f) => ({ ...f, tanggal: e.target.value }))}
                />
              </Kolom>

              <Kolom label="Total lama lembur" bantu="Terisi otomatis dari rentang jam.">
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
                bantu="Minimal 20 karakter. Tulis tugas nyatanya supaya petugas tahu apa yang dikerjakan."
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
              {editId ? 'Simpan perubahan' : 'Simpan ke Data Pending'}
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
          aksi={<Pil status="Menunggu">{menunggu.length} belum dijawab</Pil>}
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
            {terlihat.length} penugasan
          </span>
        </IsiKartu>

        <StatusData memuat={memuat} galat={galat} onUlang={muat} />
        <Tabel kepala={['Petugas', 'Tanggal', 'Rentang jam', 'Total', 'Keterangan', 'Status']} maksTinggi={560}>
          {terlihat.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-5 py-12 text-center">
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
                  <SelOrang nama={l.nama} jabatan={l.jabatan} />
                </td>
                <td className="num whitespace-nowrap">{l.tanggal}</td>
                <td className="num whitespace-nowrap">{l.rentang}</td>
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
              </Baris>
            ))
          )}
        </Tabel>
      </Kartu>
    </>
  )
}
