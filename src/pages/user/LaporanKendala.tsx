import { useState } from 'react'
import { KartuDataPending, type Draf } from '@/components/Draf'
import { FotoBukti, MAKS_FOTO } from '@/components/FotoBukti'
import { LinimasaRiwayat, type PosRiwayat } from '@/components/Riwayat'
import {
  AreaTeks, GridForm, Input, IsiKartu, KakiForm, Kartu, Kolom, KopKartu, Pil, Pilihan, Tombol,
} from '@/components/ui'
import { useAuth } from '@/context/AuthContext'
import { KENDALA, PETUGAS } from '@/data/mock'
import { Ikon } from '@/lib/ikon'
import { formatJam, formatTanggal } from '@/lib/tanggal'
import type { Jabatan, Kendala } from '@/types'

const FORM_KOSONG = {
  nama: '',
  jabatan: '' as Jabatan | '',
  tanggal: '2026-09-15',
  jam: '',
  keterangan: '',
  foto: [] as string[],
}

export function LaporanKendalaUser() {
  const { akun } = useAuth()
  // Dipakai sebagai cadangan kalau draf dikirim tanpa nama terpilih.
  const namaAkun = akun?.nama ?? 'Petugas'
  const jabatanAkun: Jabatan = PETUGAS.find((p) => p.nama === namaAkun)?.jabatan ?? 'Security'

  const [form, setForm] = useState(FORM_KOSONG)
  const [kameraTerbuka, setKameraTerbuka] = useState(false)
  const [pending, setPending] = useState<Draf[]>([])
  const [editId, setEditId] = useState<string | null>(null)
  const [terkirim, setTerkirim] = useState<Kendala[]>([])

  const riwayat: PosRiwayat[] = [...terkirim, ...KENDALA].slice(0, 7).map((k, i) => ({
    id: `${k.tanggal}-${k.jam}-${i}`,
    tanggal: k.tanggal,
    hari: k.hari,
    jam: k.jam,
    keterangan: k.keterangan,
    status: k.status,
    foto: k.fotoUrl,
    fotoVarian: k.foto,
  }))

  /** Jabatan mengikuti nama yang dipilih — sama seperti di halaman Aktivitas. */
  function pilihNama(nama: string) {
    const jabatan = PETUGAS.find((p) => p.nama === nama)?.jabatan ?? ''
    setForm((f) => ({ ...f, nama, jabatan }))
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
    setForm(FORM_KOSONG)
    setKameraTerbuka(false)
  }

  function editDraf(p: Draf) {
    setEditId(p.id)
    setForm({
      nama: p.nama,
      jabatan: p.jabatan,
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
      setForm(FORM_KOSONG)
    }
  }

  function kirimDraf(id: string) {
    const p = pending.find((x) => x.id === id)
    if (!p) return
    const { tanggal, hari } = formatTanggal(p.tanggal)
    setTerkirim((list) => [
      {
        nama: p.nama || namaAkun,
        jabatan: (p.jabatan || jabatanAkun) as Jabatan,
        tanggal,
        hari,
        jam: formatJam(p.jam),
        keterangan: p.keterangan || '—',
        status: 'Baru',
        foto: 'a',
        fotoUrl: p.foto,
      },
      ...list,
    ])
    hapusDraf(id)
  }

  function batalEdit() {
    setEditId(null)
    setForm(FORM_KOSONG)
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
              <Kolom label="Nama" wajib>
                <Pilihan value={form.nama} onChange={(e) => pilihNama(e.target.value)}>
                  <option value="">Pilih Nama</option>
                  {PETUGAS.map((p) => (
                    <option key={p.nama} value={p.nama}>
                      {p.nama}
                    </option>
                  ))}
                </Pilihan>
              </Kolom>
              <Kolom label="Jabatan" wajib>
                <Pilihan value={form.jabatan} disabled>
                  <option value=""></option>
                  <option value="Security">Security</option>
                  <option value="OB">OB</option>
                  <option value="CS">CS</option>
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
                bantu="Minimal 20 karakter. Jelaskan kendalanya, lokasinya, dan sejak kapan terjadi."
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
        <LinimasaRiwayat pos={riwayat} kosong="Belum ada laporan yang dikirim." />
      </Kartu>
    </>
  )
}
