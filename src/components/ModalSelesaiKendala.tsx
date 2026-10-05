import { useState } from 'react'
import { FotoBukti, MAKS_FOTO } from '@/components/FotoBukti'
import { Modal } from '@/components/Modal'
import { AreaTeks, Kolom, Tombol } from '@/components/ui'
import { Ikon } from '@/lib/ikon'
import { api, pesanGalat } from '@/lib/api'
import type { Kendala } from '@/types'

/**
 * Pop-up Tandai selesai: foto sesudah dari kamera dan keterangan penyelesaian.
 * Petugas penangan wajib memotret hasilnya; admin tidak (mis. dikerjakan vendor),
 * tetapi keterangan tetap wajib. Backend memeriksa aturan yang sama.
 */
export function ModalSelesaiKendala({
  kendala,
  fotoWajib,
  onTutup,
  onSelesai,
}: {
  kendala: Kendala
  fotoWajib: boolean
  onTutup: () => void
  onSelesai: () => void
}) {
  const [foto, setFoto] = useState<string[]>([])
  const [kameraTerbuka, setKameraTerbuka] = useState(fotoWajib)
  const [keterangan, setKeterangan] = useState('')
  const [sibuk, setSibuk] = useState(false)
  const [galat, setGalat] = useState<string | null>(null)

  const lengkap = (!fotoWajib || foto.length > 0) && keterangan.trim().length > 0

  function tutup() {
    if (!sibuk) onTutup()
  }

  async function kirim() {
    if (!lengkap || !kendala.id) return
    setSibuk(true)
    setGalat(null)
    try {
      await api(`/api/kendala/${kendala.id}/selesai`, 'POST', { keterangan: keterangan.trim(), foto })
      onSelesai()
    } catch (e) {
      setGalat(pesanGalat(e))
      setSibuk(false)
    }
  }

  return (
    <Modal
      judul="Tandai kendala selesai"
      sub={`${kendala.nama} · ${kendala.tanggal} · ${kendala.jam}`}
      lebar="max-w-[560px]"
      onTutup={tutup}
      aksi={
        <>
          <Tombol varian="hantu" onClick={tutup} disabled={sibuk}>
            Batal
          </Tombol>
          <Tombol onClick={kirim} disabled={!lengkap || sibuk}>
            <Ikon.Centang size={15} /> {sibuk ? 'Mengirim…' : 'Tandai selesai'}
          </Tombol>
        </>
      }
    >
      <div className="mb-4 rounded-xl border border-garis bg-[#F7FAF8] px-3.5 py-3">
        <span className="mb-1 block text-[11px] text-teks-samar">Kendala yang dilaporkan</span>
        <p className="m-0 text-[12.5px] leading-relaxed text-ink">{kendala.keterangan}</p>
      </div>
      <div className="flex flex-col gap-4">
        <Kolom
          label="Foto sesudah diperbaiki"
          wajib={fotoWajib}
          bantu={fotoWajib ? `Minimal 1, maksimal ${MAKS_FOTO} foto.` : `Tidak wajib, maksimal ${MAKS_FOTO} foto.`}
        >
          <FotoBukti
            foto={foto}
            kameraTerbuka={kameraTerbuka}
            pesan="Foto hasil perbaikan"
            sub="Tunjukkan kondisi setelah diperbaiki"
            rasio="aspect-video"
            hadapAwal="environment"
            onBuka={() => setKameraTerbuka(true)}
            onTutup={() => setKameraTerbuka(false)}
            onAmbil={(f) => setFoto((d) => [...d, f].slice(0, MAKS_FOTO))}
            onHapus={(i) => setFoto((d) => d.filter((_, j) => j !== i))}
          />
        </Kolom>
        <Kolom label="Keterangan penyelesaian" wajib>
          <AreaTeks
            value={keterangan}
            onChange={(e) => setKeterangan(e.target.value)}
            placeholder={
              fotoWajib
                ? 'Apa yang dikerjakan sampai masalahnya beres?'
                : 'Mis. diperbaiki vendor AC, nomor tiket servis, atau tindak lanjut lainnya.'
            }
          />
        </Kolom>
      </div>
      {galat && (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-merah/30 bg-merah-lembut px-3.5 py-2.5 text-[12px] leading-relaxed text-merah-teks">
          <Ikon.Awas size={14} className="mt-px flex-none" />
          <span>{galat}</span>
        </div>
      )}
    </Modal>
  )
}
