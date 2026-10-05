import { useMemo, useState } from 'react'
import { Modal } from '@/components/Modal'
import { KodeShift } from '@/components/shift/KodeShift'
import { Avatar, GridForm, Input, Kolom, Segmen, Tombol } from '@/components/ui'
import { Ikon } from '@/lib/ikon'
import { cn, DAFTAR_JABATAN, JABATAN_PANJANG, jabatanDariLabel } from '@/lib/util'
import type { HasilMassal, Jabatan, PetugasJadwal, Shift } from '@/types'

export interface IsianMassal {
  petugasIds: number[]
  dari: string
  sampai: string
  shiftId: number
}

/**
 * Pop-up isi massal: satu shift untuk banyak petugas × rentang tanggal.
 * Pengiriman (termasuk konfirmasi timpa) diurus pemanggil lewat `onKirim`.
 */
export function IsiMassal({
  petugas,
  shift,
  jabatanAwal,
  dari,
  sampai,
  onKirim,
  onTutup,
}: {
  petugas: PetugasJadwal[]
  /** semua jenis shift; yang dipakai hanya yang aktif dan cocok jabatan */
  shift: Shift[]
  jabatanAwal: Jabatan
  dari: string
  sampai: string
  onKirim: (isi: IsianMassal) => Promise<HasilMassal | null>
  onTutup: () => void
}) {
  const [jabatan, setJabatan] = useState<Jabatan>(jabatanAwal)
  const [shiftId, setShiftId] = useState<number | null>(null)
  const [dipilih, setDipilih] = useState<Set<number>>(new Set())
  const [rentang, setRentang] = useState({ dari, sampai })
  const [galat, setGalat] = useState('')
  const [mengirim, setMengirim] = useState(false)

  const calon = useMemo(() => petugas.filter((p) => p.jabatan === jabatan), [petugas, jabatan])
  const pilihan = useMemo(
    () => shift.filter((s) => s.aktif && (s.sistem || s.jabatan.includes(jabatan))),
    [shift, jabatan],
  )
  const semua = calon.length > 0 && calon.every((p) => dipilih.has(p.id))

  function gantiJabatan(j: Jabatan) {
    setJabatan(j)
    setDipilih(new Set())
    setShiftId(null)
    setGalat('')
  }

  function alih(id: number) {
    setDipilih((d) => {
      const baru = new Set(d)
      if (baru.has(id)) baru.delete(id)
      else baru.add(id)
      return baru
    })
    setGalat('')
  }

  async function kirim() {
    if (shiftId === null) return setGalat('Pilih shift yang akan diisikan.')
    if (!dipilih.size) return setGalat('Pilih minimal satu petugas.')
    if (!rentang.dari || !rentang.sampai) return setGalat('Isi rentang tanggal.')
    if (rentang.sampai < rentang.dari) return setGalat('Tanggal akhir tidak boleh sebelum tanggal awal.')
    setMengirim(true)
    setGalat('')
    try {
      const hasil = await onKirim({ petugasIds: [...dipilih], dari: rentang.dari, sampai: rentang.sampai, shiftId })
      if (hasil) onTutup()
    } catch (e) {
      setGalat(e instanceof Error ? e.message : 'Terjadi kesalahan.')
    } finally {
      setMengirim(false)
    }
  }

  return (
    <Modal
      judul="Isi massal"
      sub="Satu shift untuk beberapa petugas sekaligus, pada rentang tanggal yang dipilih"
      lebar="max-w-[560px]"
      onTutup={onTutup}
      aksi={
        <>
          <Tombol varian="hantu" onClick={onTutup}>
            Batal
          </Tombol>
          <Tombol onClick={kirim} disabled={mengirim}>
            <Ikon.Centang size={15} /> {mengirim ? 'Mengisi…' : 'Isi jadwal'}
          </Tombol>
        </>
      }
    >
      <div className="grid gap-4">
        <Kolom label="Jabatan" wajib>
          <div className="scrollbar-lembut overflow-x-auto">
            <Segmen
              opsi={DAFTAR_JABATAN.map((j) => JABATAN_PANJANG[j])}
              nilai={JABATAN_PANJANG[jabatan]}
              onPilih={(v) => gantiJabatan(jabatanDariLabel(v))}
            />
          </div>
        </Kolom>

        <Kolom label="Shift" wajib>
          <div className="flex flex-wrap gap-2">
            {pilihan.map((s) => (
              <button
                key={s.id}
                type="button"
                aria-pressed={shiftId === s.id}
                onClick={() => {
                  setShiftId(s.id)
                  setGalat('')
                }}
                className={cn(
                  'flex items-center gap-2 rounded-[10px] border py-1.5 pl-1.5 pr-3 text-left transition',
                  shiftId === s.id ? 'border-hijau bg-hijau-lembut' : 'border-garis-kuat bg-white hover:border-hijau',
                )}
              >
                <KodeShift shift={s} ukuran={26} />
                <span>
                  <b className="block text-[12.5px] font-semibold text-ink">{s.nama}</b>
                  <span className="block text-[11px] text-teks-samar">{s.rentang ?? 'Tanpa jam kerja'}</span>
                </span>
              </button>
            ))}
          </div>
          {pilihan.length <= 1 && (
            <p className="m-0 mt-1.5 text-[11.5px] text-teks-samar">
              Belum ada shift aktif untuk {JABATAN_PANJANG[jabatan]}. Tambahkan di tab Jenis Shift.
            </p>
          )}
        </Kolom>

        <Kolom label={`Petugas (${dipilih.size} dipilih)`} wajib>
          {calon.length === 0 ? (
            <p className="m-0 text-[12.5px] text-teks-samar">Tidak ada petugas aktif untuk jabatan ini.</p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-garis">
              <label className="flex cursor-pointer items-center gap-2.5 border-b border-garis bg-[#FAFCFB] px-3 py-2 text-[12.5px] font-semibold text-teks-lembut">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-hijau"
                  checked={semua}
                  onChange={() => setDipilih(semua ? new Set() : new Set(calon.map((p) => p.id)))}
                />
                Pilih semua
              </label>
              <div className="scrollbar-lembut max-h-[200px] overflow-y-auto">
                {calon.map((p) => (
                  <label
                    key={p.id}
                    className="flex cursor-pointer items-center gap-2.5 border-b border-garis px-3 py-2 last:border-b-0 hover:bg-[#FAFCFB]"
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-hijau"
                      checked={dipilih.has(p.id)}
                      onChange={() => alih(p.id)}
                    />
                    <Avatar nama={p.nama} jabatan={p.jabatan} foto={p.fotoProfil} ukuran={26} />
                    <span className="flex-1 text-[13px] text-ink">{p.nama}</span>
                    {p.status === 'Cuti' && (
                      <span className="rounded-full bg-emas-lembut px-2 py-0.5 text-[10.5px] font-semibold text-emas-teks">
                        Cuti
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          )}
        </Kolom>

        <GridForm>
          <Kolom label="Dari tanggal" wajib>
            <Input type="date" value={rentang.dari} onChange={(e) => setRentang((r) => ({ ...r, dari: e.target.value }))} />
          </Kolom>
          <Kolom label="Sampai tanggal" wajib bantu="Paling lama 62 hari">
            <Input
              type="date"
              value={rentang.sampai}
              onChange={(e) => setRentang((r) => ({ ...r, sampai: e.target.value }))}
            />
          </Kolom>
        </GridForm>
      </div>

      {galat && (
        <div className="mt-3.5 flex items-start gap-2 rounded-xl border border-merah/30 bg-merah-lembut px-3 py-2 text-[11.5px] leading-relaxed text-merah-teks">
          <Ikon.Awas size={14} className="mt-px flex-none" />
          <span>{galat}</span>
        </div>
      )}
    </Modal>
  )
}
