import { useEffect, useMemo, useState } from 'react'
import { KartuDataPending, type Draf } from '@/components/Draf'
import { FotoBukti, MAKS_FOTO } from '@/components/FotoBukti'
import { LinimasaRiwayat, type PosRiwayat } from '@/components/Riwayat'
import {
  AreaTeks, Input, IsiKartu, KakiForm, Kartu, Kolom, KopKartu, Pil, Pilihan, Segmen, Tombol,
} from '@/components/ui'
import { StatusData } from '@/components/StatusData'
import { useAuth } from '@/context/AuthContext'
import { Ikon } from '@/lib/ikon'
import { api, pesanGalat } from '@/lib/api'
import { useApi } from '@/lib/useApi'
import { keIso } from '@/lib/tanggal'
import { DAFTAR_JABATAN, JABATAN_PANJANG, jabatanDariLabel } from '@/lib/util'
import type { Jabatan, Logbook, Petugas } from '@/types'

/** Formulir kosong; tanggalnya hari ini karena catatan diisi di hari yang sama. */
function formKosong() {
  return {
    jabatan: 'Security' as Jabatan,
    nama: '',
    tanggal: keIso(new Date()),
    jam: '',
    keterangan: '',
    foto: [] as string[],
  }
}

export function LogbookUser() {
  const { akun } = useAuth()
  const [form, setForm] = useState(formKosong)
  const [kameraTerbuka, setKameraTerbuka] = useState(false)
  const [pending, setPending] = useState<Draf[]>([])
  const [editId, setEditId] = useState<string | null>(null)
  const [galatKirim, setGalatKirim] = useState<string | null>(null)

  // Backend hanya mengembalikan catatan milik petugas yang sedang masuk.
  const { data: petugas } = useApi<Petugas[]>('/api/petugas', [])
  const { data: catatan, memuat, galat, muat } = useApi<Logbook[]>('/api/logbook?batas=7', [])

  const riwayat: PosRiwayat[] = catatan.map((l) => ({
    id: String(l.id),
    tanggal: l.tanggal,
    hari: l.hari,
    jam: l.jam,
    keterangan: l.keterangan,
    status: 'Selesai',
    foto: l.fotoUrl,
    fotoVarian: l.foto,
    tanda:
      l.lembur === '—' ? undefined : (
        <span className="inline-flex items-center gap-1 rounded-full bg-emas-lembut px-2 py-1 text-[11.5px] font-semibold text-emas-teks">
          <Ikon.Jam size={11} />
          <span className="num">{l.lembur}</span> lembur
        </span>
      ),
  }))

  /**
   * Nama yang muncul hanya dari jabatan yang sedang dipilih — daftarnya jadi
   * pendek dan petugas tidak perlu mencari namanya di antara semua jabatan.
   * Petugas nonaktif disembunyikan, kecuali ia memang nama pada draf yang
   * sedang dikoreksi, supaya pilihan tidak berubah diam-diam saat draf dibuka.
   */
  const kandidat = useMemo(() => {
    const cocok = petugas.filter((p) => p.jabatan === form.jabatan && p.status !== 'Nonaktif')
    const terpilih = petugas.find((p) => p.nama === form.nama && p.jabatan === form.jabatan)
    return terpilih && !cocok.includes(terpilih) ? [...cocok, terpilih] : cocok
  }, [petugas, form.jabatan, form.nama])

  /**
   * Begitu daftar petugas tiba, formulir langsung diarahkan ke akun yang sedang
   * masuk — petugas tidak perlu mencari namanya sendiri.
   */
  useEffect(() => {
    const saya = petugas.find((p) => p.nama === akun?.nama)
    if (!saya) return
    setForm((f) => (f.nama === '' ? { ...f, nama: saya.nama, jabatan: saya.jabatan } : f))
  }, [petugas, akun?.nama])

  /** Ganti jabatan selalu mengosongkan nama: daftar namanya sudah berbeda. */
  function gantiJabatan(label: string) {
    setForm((f) => ({ ...f, jabatan: jabatanDariLabel(label), nama: '' }))
  }

  function tambahFoto(foto: string) {
    setForm((f) => ({ ...f, foto: [...f.foto, foto].slice(0, MAKS_FOTO) }))
  }

  function hapusFoto(indeks: number) {
    setForm((f) => ({ ...f, foto: f.foto.filter((_, i) => i !== indeks) }))
  }

  function simpanDraf() {
    if (editId) {
      setPending((list) => list.map((p) => (p.id === editId ? { ...p, ...form } : p)))
    } else {
      setPending((list) => [...list, { id: crypto.randomUUID(), ...form }])
    }
    setEditId(null)
    setForm(formKosong())
    setKameraTerbuka(false)
  }

  function editDraf(p: Draf) {
    setEditId(p.id)
    setForm({
      jabatan: p.jabatan || 'Security',
      nama: p.nama,
      tanggal: p.tanggal,
      jam: p.jam,
      keterangan: p.keterangan,
      foto: p.foto,
    })
    setKameraTerbuka(false)
  }

  function hapusDraf(id: string) {
    setPending((list) => list.filter((p) => p.id !== id))
    if (editId === id) {
      setEditId(null)
      setForm(formKosong())
    }
  }

  /**
   * Draf baru dibuang setelah server menerimanya. Kalau gagal — jaringan mati,
   * keterangan kurang panjang, jam di masa depan — drafnya tetap di layar
   * lengkap dengan fotonya supaya tidak perlu difoto ulang.
   */
  async function kirimDraf(id: string) {
    const p = pending.find((x) => x.id === id)
    if (!p) return
    const orang = petugas.find((x) => x.nama === p.nama)
    if (!orang) {
      setGalatKirim(`Petugas "${p.nama}" tidak ada di data petugas.`)
      return
    }
    setGalatKirim(null)
    try {
      await api('/api/logbook', 'POST', {
        petugasId: orang.id,
        tanggal: p.tanggal,
        jam: p.jam,
        keterangan: p.keterangan,
        foto: p.foto,
      })
      hapusDraf(id)
      muat()
    } catch (e) {
      setGalatKirim(pesanGalat(e))
    }
  }

  function batalEdit() {
    setEditId(null)
    setForm(formKosong())
    setKameraTerbuka(false)
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4.5 xl:grid-cols-[1.3fr_1fr]">
        <Kartu className="self-start">
          <KopKartu
            judul="Catatan Aktivitas"
            sub="Isi setiap selesai melakukan tugas"
            aksi={editId ? <Pil status="Diproses">Mengedit draf</Pil> : undefined}
          />
          <IsiKartu>
            <div className="flex flex-col gap-4">
              <Kolom label="Jabatan" wajib>
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
                    </option>
                  ))}
                  {kandidat.length === 0 && (
                    <option disabled value="">
                      Tidak ada petugas {JABATAN_PANJANG[form.jabatan]} yang aktif
                    </option>
                  )}
                </Pilihan>
              </Kolom>
              <Kolom label="Tanggal" wajib>
                <Input
                  type="date"
                  value={form.tanggal}
                  onChange={(e) => setForm((f) => ({ ...f, tanggal: e.target.value }))}
                />
              </Kolom>
              <Kolom label="Jam" wajib>
                <Input
                  type="time"
                  value={form.jam}
                  onChange={(e) => setForm((f) => ({ ...f, jam: e.target.value }))}
                />
              </Kolom>

              <Kolom label="Bukti foto" wajib bantu={`Bisa lebih dari satu, maksimal ${MAKS_FOTO} foto.`}>
                <FotoBukti
                  foto={form.foto}
                  kameraTerbuka={kameraTerbuka}
                  onBuka={() => setKameraTerbuka(true)}
                  onTutup={() => setKameraTerbuka(false)}
                  onAmbil={tambahFoto}
                  onHapus={hapusFoto}
                />
              </Kolom>

              <Kolom
                label="Keterangan Aktivitas"
                wajib
                bantu="Minimal 20 karakter. Tulis kondisi nyata di lapangan, bukan salinan catatan sebelumnya."
              >
                <AreaTeks
                  value={form.keterangan}
                  onChange={(e) => setForm((f) => ({ ...f, keterangan: e.target.value }))}
                  placeholder="Tulis apa yang Anda kerjakan, di mana, dan kondisi yang Anda temukan."
                  className="min-h-[120px]"
                />
              </Kolom>
            </div>
          </IsiKartu>
          <KakiForm>
            {editId && (
              <Tombol varian="hantu" onClick={batalEdit}>
                Batal
              </Tombol>
            )}
            <Tombol onClick={simpanDraf}>{editId ? 'Simpan perubahan' : 'Draft'}</Tombol>
          </KakiForm>
        </Kartu>

        <div className="grid content-start gap-4.5">
          {galatKirim && (
            <div className="flex items-start gap-2 rounded-xl border border-merah/30 bg-merah-lembut px-3.5 py-2.5 text-[12px] leading-relaxed text-merah-teks">
              <Ikon.Awas size={14} className="mt-px flex-none" />
              <span>{galatKirim}</span>
            </div>
          )}
          <KartuDataPending
            daftar={pending}
            editId={editId}
            onEdit={editDraf}
            onKirim={kirimDraf}
            onHapus={hapusDraf}
          />
        </div>
      </div>

      <Kartu className="mt-4.5">
        <KopKartu
          judul="Catatan saya sebelumnya"
          sub="Tujuh hari terakhir"
          aksi={
            <span className="num inline-flex items-center gap-1.5 rounded-full bg-hijau-lembut px-2.5 py-1 text-[11.5px] font-semibold text-hijau-tua">
              {riwayat.length} catatan terkirim
            </span>
          }
        />
        <StatusData memuat={memuat} galat={galat} onUlang={muat} />
        <LinimasaRiwayat pos={riwayat} kosong="Belum ada catatan yang dikirim." />
      </Kartu>
    </>
  )
}
