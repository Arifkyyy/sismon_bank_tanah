import { useState } from 'react'
import { Modal } from '@/components/Modal'
import { AreaTeks, Kolom, Tombol } from '@/components/ui'
import { pesanGalat } from '@/lib/api'
import { Ikon } from '@/lib/ikon'

/** Pop-up isian alasan untuk menolak permintaan tukar shift. */
export function ModalAlasan({
  judul,
  sub,
  wajib,
  tombol,
  onKirim,
  onTutup,
}: {
  judul: string
  sub?: string
  wajib: boolean
  tombol: string
  onKirim: (alasan: string) => Promise<void>
  onTutup: () => void
}) {
  const [alasan, setAlasan] = useState('')
  const [galat, setGalat] = useState('')
  const [mengirim, setMengirim] = useState(false)

  async function kirim() {
    if (wajib && !alasan.trim()) {
      setGalat('Alasan wajib diisi.')
      return
    }
    setMengirim(true)
    setGalat('')
    try {
      await onKirim(alasan.trim())
      onTutup()
    } catch (e) {
      setGalat(pesanGalat(e))
    } finally {
      setMengirim(false)
    }
  }

  return (
    <Modal
      judul={judul}
      sub={sub}
      onTutup={onTutup}
      aksi={
        <>
          <Tombol varian="hantu" onClick={onTutup}>
            Batal
          </Tombol>
          <Tombol varian="bahaya" onClick={kirim} disabled={mengirim}>
            <Ikon.Silang size={15} /> {mengirim ? 'Mengirim…' : tombol}
          </Tombol>
        </>
      }
    >
      <Kolom label="Alasan" wajib={wajib} bantu={wajib ? undefined : 'Boleh dikosongkan'}>
        <AreaTeks
          autoFocus
          maxLength={500}
          value={alasan}
          onChange={(e) => {
            setAlasan(e.target.value)
            if (galat) setGalat('')
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
  )
}
