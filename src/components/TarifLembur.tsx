import { useState } from 'react'
import { Modal } from '@/components/Modal'
import { InputRapi, Kolom, Tombol } from '@/components/ui'
import { Ikon } from '@/lib/ikon'
import { api, pesanGalat } from '@/lib/api'
import { useApi } from '@/lib/useApi'
import type { TarifLembur } from '@/types'

const rupiah = (n: number) => `Rp ${n.toLocaleString('id-ID')}`

/**
 * Tombol "Tarif per jam" beserta pop-up untuk mengubahnya. Tarif baru hanya
 * berlaku untuk penugasan yang dikirim sesudahnya — yang sudah terkirim
 * menyimpan tarifnya sendiri di backend.
 */
export function TombolTarifLembur() {
  const tarif = useApi<TarifLembur | null>('/api/pengaturan/tarif-lembur', null)
  const [buka, setBuka] = useState(false)
  const [isian, setIsian] = useState('')
  const [galat, setGalat] = useState('')
  const [menyimpan, setMenyimpan] = useState(false)

  function bukaModal() {
    setIsian(tarif.data ? String(tarif.data.tarifPerJam) : '')
    setGalat('')
    setBuka(true)
  }

  async function simpan() {
    const angka = Number(isian)
    if (!Number.isInteger(angka) || angka < 1000 || angka > 1_000_000) {
      setGalat('Isi tarif antara Rp 1.000 dan Rp 1.000.000 per jam, tanpa titik atau koma.')
      return
    }
    setMenyimpan(true)
    try {
      tarif.setData(await api<TarifLembur>('/api/pengaturan/tarif-lembur', 'PUT', { tarifPerJam: angka }))
      setBuka(false)
    } catch (e) {
      setGalat(pesanGalat(e))
    } finally {
      setMenyimpan(false)
    }
  }

  return (
    <>
      <Tombol varian="hantu" kecil onClick={bukaModal} disabled={!tarif.data}>
        <Ikon.Rekap size={14} /> {tarif.data ? `${rupiah(tarif.data.tarifPerJam)}/jam` : 'Tarif per jam'}
      </Tombol>

      {buka && tarif.data && (
        <Modal
          judul="Tarif lembur per jam"
          sub={
            tarif.data.diubahOleh
              ? `Terakhir diubah ${tarif.data.diubahOleh} · ${tarif.data.diubahPada}`
              : 'Belum pernah diubah sejak aplikasi dipasang'
          }
          onTutup={() => setBuka(false)}
          aksi={
            <>
              <Tombol varian="hantu" onClick={() => setBuka(false)}>
                Batal
              </Tombol>
              <Tombol onClick={simpan} disabled={menyimpan}>
                <Ikon.Centang size={15} /> Simpan tarif
              </Tombol>
            </>
          }
        >
          <Kolom
            label="Tarif per jam (Rp)"
            wajib
            bantu="Hanya berlaku untuk penugasan yang dikirim setelah ini. Penugasan yang sudah terkirim tetap memakai tarif lamanya."
          >
            <InputRapi
              autoFocus
              type="number"
              inputMode="numeric"
              min={1000}
              step={500}
              className="w-full"
              value={isian}
              onChange={(e) => {
                setIsian(e.target.value)
                if (galat) setGalat('')
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void simpan()
              }}
            />
          </Kolom>
          {galat && (
            <div className="mt-2.5 flex items-start gap-2 rounded-xl border border-merah/30 bg-merah-lembut px-3 py-2 text-[11.5px] leading-relaxed text-merah-teks">
              <Ikon.Awas size={14} className="mt-px flex-none" />
              <span>{galat}</span>
            </div>
          )}
        </Modal>
      )}
    </>
  )
}
