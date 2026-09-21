import { useState } from 'react'
import { KartuDataPending, type Draf } from '@/components/Draf'
import { FotoBukti, MAKS_FOTO } from '@/components/FotoBukti'
import { LinimasaRiwayat, type PosRiwayat } from '@/components/Riwayat'
import {
  AreaTeks, Input, IsiKartu, KakiForm, Kartu, Kolom, KopKartu, Pil, Pilihan, Tombol,
} from '@/components/ui'
import { LOGBOOK, PETUGAS } from '@/data/mock'
import { Ikon } from '@/lib/ikon'
import { formatJam, formatTanggal } from '@/lib/tanggal'
import type { Jabatan } from '@/types'

const FORM_KOSONG = {
  nama: '',
  jabatan: '' as Jabatan | '',
  tanggal: '2026-09-15',
  jam: '',
  keterangan: '',
  foto: [] as string[],
}

export function LogbookUser() {
  const [form, setForm] = useState(FORM_KOSONG)
  const [kameraTerbuka, setKameraTerbuka] = useState(false)
  const [pending, setPending] = useState<Draf[]>([])
  const [editId, setEditId] = useState<string | null>(null)
  const [terkirim, setTerkirim] = useState<typeof LOGBOOK>([])

  const riwayat: PosRiwayat[] = [...terkirim, ...LOGBOOK].slice(0, 7).map((l, i) => ({
    id: `${l.tanggal}-${l.jam}-${i}`,
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
        nama: p.nama || 'Tanpa nama',
        jabatan: (p.jabatan || 'Security') as Jabatan,
        tanggal,
        hari,
        jam: formatJam(p.jam),
        keterangan: p.keterangan || '—',
        foto: 'a',
        fotoUrl: p.foto,
        lembur: '—',
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
                  capWaktu={`${formatTanggal(form.tanggal).tanggal} · ${formatJam(form.jam)}`}
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

        <KartuDataPending
          daftar={pending}
          editId={editId}
          onEdit={editDraf}
          onKirim={kirimDraf}
          onHapus={hapusDraf}
        />
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
        <LinimasaRiwayat pos={riwayat} kosong="Belum ada catatan yang dikirim." />
      </Kartu>
    </>
  )
}
