import { useState } from 'react'
import { Modal } from '@/components/Modal'
import { KodeShift } from '@/components/shift/KodeShift'
import { GridForm, Input, Kolom, Tombol } from '@/components/ui'
import { api, pesanGalat } from '@/lib/api'
import { Ikon } from '@/lib/ikon'
import { DAFTAR_WARNA_SHIFT, keteranganJam, WARNA_SHIFT } from '@/lib/shift'
import { cn, DAFTAR_JABATAN, JABATAN_PANJANG } from '@/lib/util'
import type { Jabatan, Shift, WarnaShift } from '@/types'

interface Isian {
  nama: string
  kode: string
  mulai: string
  selesai: string
  jabatan: Jabatan[]
  warna: WarnaShift
  aktif: boolean
}

/** Pop-up tambah/ubah jenis shift. `awal` kosong = tambah baru untuk `jabatanAwal`. */
export function FormShift({
  awal,
  jabatanAwal,
  onTutup,
  onTersimpan,
}: {
  awal: Shift | null
  jabatanAwal: Jabatan
  onTutup: () => void
  onTersimpan: (s: Shift) => void
}) {
  const [isi, setIsi] = useState<Isian>(() =>
    awal
      ? {
          nama: awal.nama,
          kode: awal.kode,
          mulai: awal.mulai ?? '',
          selesai: awal.selesai ?? '',
          jabatan: awal.jabatan,
          warna: awal.warna,
          aktif: awal.aktif,
        }
      : { nama: '', kode: '', mulai: '', selesai: '', jabatan: [jabatanAwal], warna: 'hijau', aktif: true },
  )
  const [galat, setGalat] = useState('')
  const [menyimpan, setMenyimpan] = useState(false)

  function ubah<K extends keyof Isian>(k: K, v: Isian[K]) {
    setIsi((s) => ({ ...s, [k]: v }))
    if (galat) setGalat('')
  }

  function ubahJabatan(j: Jabatan) {
    ubah('jabatan', isi.jabatan.includes(j) ? isi.jabatan.filter((x) => x !== j) : [...isi.jabatan, j])
  }

  function periksa(): string {
    if (!isi.nama.trim()) return 'Isi nama shift.'
    if (!/^[A-Za-z0-9]{1,2}$/.test(isi.kode)) return 'Kode shift 1–2 huruf atau angka, mis. P atau M2.'
    if (!isi.mulai || !isi.selesai) return 'Isi jam mulai dan jam selesai.'
    if (!isi.jabatan.length) return 'Pilih minimal satu jabatan.'
    return ''
  }

  async function simpan() {
    const salah = periksa()
    if (salah) {
      setGalat(salah)
      return
    }
    setMenyimpan(true)
    try {
      const badan = { ...isi, nama: isi.nama.trim(), kode: isi.kode.toUpperCase() }
      const hasil = awal
        ? await api<Shift>(`/api/shift/jenis/${awal.id}`, 'PUT', badan)
        : await api<Shift>('/api/shift/jenis', 'POST', badan)
      onTersimpan(hasil)
    } catch (e) {
      setGalat(pesanGalat(e))
    } finally {
      setMenyimpan(false)
    }
  }

  const jam = keteranganJam(isi.mulai, isi.selesai)

  return (
    <Modal
      judul={awal ? `Ubah shift ${awal.nama}` : 'Tambah shift'}
      sub={awal?.dipakai ? 'Shift ini sudah dipakai di jadwal; perubahan jam ikut tampil di jadwal lama.' : undefined}
      lebar="max-w-[520px]"
      onTutup={onTutup}
      aksi={
        <>
          <Tombol varian="hantu" onClick={onTutup}>
            Batal
          </Tombol>
          <Tombol onClick={simpan} disabled={menyimpan}>
            <Ikon.Centang size={15} /> {menyimpan ? 'Menyimpan…' : 'Simpan shift'}
          </Tombol>
        </>
      }
    >
      <GridForm>
        <Kolom label="Nama shift" wajib>
          <Input
            autoFocus
            maxLength={40}
            placeholder="mis. Pagi"
            value={isi.nama}
            onChange={(e) => ubah('nama', e.target.value)}
          />
        </Kolom>
        <Kolom label="Kode" wajib bantu="1–2 huruf, tampil di kotak jadwal">
          <Input
            maxLength={2}
            placeholder="P"
            className="uppercase"
            value={isi.kode}
            onChange={(e) => ubah('kode', e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase())}
          />
        </Kolom>
        <Kolom label="Jam mulai" wajib>
          <Input type="time" value={isi.mulai} onChange={(e) => ubah('mulai', e.target.value)} />
        </Kolom>
        <Kolom label="Jam selesai" wajib bantu={jam || 'Lebih awal dari jam mulai = lintas hari'}>
          <Input type="time" value={isi.selesai} onChange={(e) => ubah('selesai', e.target.value)} />
        </Kolom>

        <Kolom label="Berlaku untuk jabatan" wajib penuh>
          <div className="flex flex-wrap gap-2">
            {DAFTAR_JABATAN.map((j) => {
              const pilih = isi.jabatan.includes(j)
              return (
                <button
                  key={j}
                  type="button"
                  aria-pressed={pilih}
                  onClick={() => ubahJabatan(j)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-[10px] border px-3 py-2 text-[12.5px] font-semibold transition',
                    pilih
                      ? 'border-hijau bg-hijau-lembut text-hijau-tua'
                      : 'border-garis-kuat bg-white text-teks-lembut hover:border-hijau hover:text-hijau',
                  )}
                >
                  {pilih && <Ikon.Centang size={13} />}
                  {JABATAN_PANJANG[j]}
                </button>
              )
            })}
          </div>
        </Kolom>

        <Kolom label="Warna" wajib penuh>
          <div className="flex flex-wrap gap-2">
            {DAFTAR_WARNA_SHIFT.filter((w) => w !== 'abu').map((w) => (
              <button
                key={w}
                type="button"
                aria-pressed={isi.warna === w}
                aria-label={WARNA_SHIFT[w].label}
                title={WARNA_SHIFT[w].label}
                onClick={() => ubah('warna', w)}
                className={cn(
                  'rounded-xl p-[3px] ring-2 transition',
                  isi.warna === w ? 'ring-hijau' : 'ring-transparent hover:ring-garis-kuat',
                )}
              >
                <KodeShift shift={{ kode: isi.kode || 'A', warna: w, nama: WARNA_SHIFT[w].label, aktif: true }} ukuran={34} />
              </button>
            ))}
          </div>
          <p className="m-0 mt-1.5 text-[11.5px] text-teks-samar">Abu-abu dipakai khusus untuk Libur.</p>
        </Kolom>

        <label className="flex cursor-pointer items-center gap-2.5 text-[13px] text-teks sm:col-span-2">
          <input
            type="checkbox"
            className="h-4 w-4 accent-hijau"
            checked={isi.aktif}
            onChange={(e) => ubah('aktif', e.target.checked)}
          />
          Aktif — muncul di pilihan saat menyusun jadwal
        </label>
      </GridForm>

      {galat && (
        <div className="mt-3.5 flex items-start gap-2 rounded-xl border border-merah/30 bg-merah-lembut px-3 py-2 text-[11.5px] leading-relaxed text-merah-teks">
          <Ikon.Awas size={14} className="mt-px flex-none" />
          <span>{galat}</span>
        </div>
      )}
    </Modal>
  )
}
