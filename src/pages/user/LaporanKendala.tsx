import { useState } from 'react'
import { KartuDataPending, type Draf } from '@/components/Draf'
import { FotoBukti, MAKS_FOTO } from '@/components/FotoBukti'
import { LinimasaRiwayat, type PosRiwayat } from '@/components/Riwayat'
import {
  AreaTeks, GridForm, Input, IsiKartu, KakiForm, Kartu, Kolom, KopKartu, Pil, Pilihan, Segmen,
  Tombol,
} from '@/components/ui'
import { StatusData } from '@/components/StatusData'
import { useAuth } from '@/context/AuthContext'
import { Ikon } from '@/lib/ikon'
import { api, pesanGalat } from '@/lib/api'
import { useApi } from '@/lib/useApi'
import { formatTanggal, keIso } from '@/lib/tanggal'
import { DAFTAR_JABATAN, JABATAN_PANJANG } from '@/lib/util'
import type { Kendala, Petugas } from '@/types'

/** Formulir kosong; tanggalnya hari ini karena kendala dilaporkan saat terjadi. */
function formKosong() {
  return {
    tanggal: keIso(new Date()),
    jam: '',
    keterangan: '',
    foto: [] as string[],
  }
}

export function LaporanKendalaUser() {
  const { akun } = useAuth()
  const [form, setForm] = useState(formKosong)
  const [kameraTerbuka, setKameraTerbuka] = useState(false)
  const [pending, setPending] = useState<Draf[]>([])
  const [editId, setEditId] = useState<string | null>(null)
  const [galatKirim, setGalatKirim] = useState<string | null>(null)

  // Backend hanya mengembalikan laporan milik petugas yang sedang masuk.
  const { data: petugas } = useApi<Petugas[]>('/api/petugas', [])
  const { data: laporan, memuat, galat, muat } = useApi<Kendala[]>('/api/kendala?batas=7', [])

  const riwayat: PosRiwayat[] = laporan.map((k) => ({
    id: String(k.id),
    tanggal: k.tanggal,
    hari: k.hari,
    jam: k.jam,
    keterangan: k.keterangan,
    status: k.status,
    foto: k.fotoUrl,
    fotoVarian: k.foto,
  }))

  /**
   * Nama dan jabatan selalu milik akun yang sedang masuk — sama seperti di
   * halaman Aktivitas. Backend menolak laporan atas nama orang lain.
   */
  const saya = petugas.find((p) => p.id === akun?.id)

  function tambahFoto(foto: string) {
    setForm((f) => ({ ...f, foto: [...f.foto, foto].slice(0, MAKS_FOTO) }))
  }

  function hapusFoto(indeks: number) {
    setForm((f) => ({ ...f, foto: f.foto.filter((_, i) => i !== indeks) }))
  }

  function simpanDraf() {
    const pemilik = { nama: saya?.nama ?? '', jabatan: saya?.jabatan ?? ('' as const) }
    if (editId) {
      setPending((list) => list.map((p) => (p.id === editId ? { ...p, ...form, ...pemilik } : p)))
    } else {
      setPending((list) => [...list, { id: crypto.randomUUID(), ...form, ...pemilik }])
    }
    setEditId(null)
    setForm(formKosong())
    setKameraTerbuka(false)
  }

  function editDraf(p: Draf) {
    setEditId(p.id)
    setForm({
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
   * Draf baru dibuang setelah server menerimanya, supaya foto dan keterangan
   * tidak hilang kalau pengirimannya gagal.
   */
  async function kirimDraf(id: string) {
    const p = pending.find((x) => x.id === id)
    if (!p) return
    if (!saya) {
      setGalatKirim('Akun Anda tidak ditemukan di data petugas. Hubungi admin.')
      return
    }
    setGalatKirim(null)
    try {
      await api('/api/kendala', 'POST', {
        petugasId: saya.id,
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

  const { hari } = formatTanggal(form.tanggal)

  return (
    <>
      <div className="grid grid-cols-1 gap-4.5 xl:grid-cols-[1.3fr_1fr]">
        <Kartu className="self-start">
          <KopKartu
            judul="Laporkan kendala"
            sub="Simpan sebagai draf dulu, kirim setelah datanya lengkap"
            aksi={editId ? <Pil status="Diproses">Mengedit draf</Pil> : undefined}
          />
          <IsiKartu>
            <GridForm>
              <Kolom label="Jabatan" wajib penuh>
                <Segmen
                  lebar
                  terkunci
                  opsi={DAFTAR_JABATAN.map((j) => JABATAN_PANJANG[j])}
                  nilai={saya ? JABATAN_PANJANG[saya.jabatan] : ''}
                />
              </Kolom>
              <Kolom label="Nama petugas" wajib penuh bantu="Terisi otomatis sesuai akun yang sedang masuk.">
                <Pilihan disabled value={saya?.nama ?? ''}>
                  <option value={saya?.nama ?? ''}>{saya?.nama ?? 'Memuat data akun…'}</option>
                </Pilihan>
              </Kolom>
              <Kolom label="Hari">
                <Input readOnly value={hari} />
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
              <Kolom
                label="Keterangan kendala"
                wajib
                penuh
                bantu="Jelaskan kendalanya, lokasinya, dan sejak kapan terjadi."
              >
                <AreaTeks
                  value={form.keterangan}
                  onChange={(e) => setForm((f) => ({ ...f, keterangan: e.target.value }))}
                  placeholder="Jelaskan kendalanya, lokasinya, dan sejak kapan terjadi."
                  className="min-h-[120px]"
                />
              </Kolom>
              <Kolom
                label="Foto kendala"
                wajib
                penuh
                bantu={`Ambil dari beberapa sudut bila perlu, maksimal ${MAKS_FOTO} foto.`}
              >
                <FotoBukti
                  foto={form.foto}
                  kameraTerbuka={kameraTerbuka}
                  maks={MAKS_FOTO}
                  pesan="Ambil foto kendala"
                  sub="Pastikan objek terlihat jelas"
                  rasio="aspect-video"
                  hadapAwal="environment"
                  catatan="Hanya menerima foto dari kamera. Unggah dari galeri dimatikan agar laporan tidak bisa diulang dari foto lama."
                  onBuka={() => setKameraTerbuka(true)}
                  onTutup={() => setKameraTerbuka(false)}
                  onAmbil={tambahFoto}
                  onHapus={hapusFoto}
                />
              </Kolom>
            </GridForm>
          </IsiKartu>
          <KakiForm>
            <Tombol varian="hantu" onClick={batalEdit}>
              {editId ? 'Batal' : 'Kosongkan'}
            </Tombol>
            <Tombol onClick={simpanDraf}>{editId ? 'Simpan perubahan' : 'Draft'}</Tombol>
          </KakiForm>
        </Kartu>

        <KartuDataPending
          daftar={pending}
          editId={editId}
          sub="Laporan yang belum dikirim"
          kosongJudul="Belum ada laporan pending"
          kosongPesan={
            <>
              Simpan laporan sebagai <b className="font-semibold text-teks-lembut">Draft</b> — laporan
              menunggu di sini sampai Anda kirim ke admin.
            </>
          }
          onEdit={editDraf}
          onKirim={kirimDraf}
          onHapus={hapusDraf}
        />
      </div>

      <Kartu className="mt-4.5">
        <KopKartu
          judul="Laporan saya"
          sub="Pantau status penanganannya di sini"
          aksi={
            <span className="num inline-flex items-center gap-1.5 rounded-full bg-tanah-lembut px-2.5 py-1 text-[11.5px] font-semibold text-tanah-teks">
              <Ikon.Awas size={12} />
              {riwayat.length} laporan
            </span>
          }
        />
        <StatusData memuat={memuat} galat={galat ?? galatKirim} onUlang={muat} />
        <LinimasaRiwayat pos={riwayat} kosong="Belum ada laporan yang dikirim." />
      </Kartu>
    </>
  )
}
