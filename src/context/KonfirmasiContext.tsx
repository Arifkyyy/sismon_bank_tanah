import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Tombol } from '@/components/ui'
import { Ikon } from '@/lib/ikon'
import { cn } from '@/lib/util'

type Nada = 'utama' | 'peringatan' | 'bahaya'

export interface IsiKonfirmasi {
  judul: string
  pesan: ReactNode
  /** label tombol setuju, mis. 'Buka kunci' */
  tombol: string
  /** 'bahaya' untuk tindakan yang tidak bisa dibatalkan */
  nada?: Nada
  ikon?: ReactNode
}

type Tanya = (isi: IsiKonfirmasi) => Promise<boolean>

const Konteks = createContext<Tanya | null>(null)

const GAYA: Record<Nada, { lencana: string; ikon: ReactNode }> = {
  utama: { lencana: 'bg-hijau-lembut text-hijau-tua ring-hijau/10', ikon: <Ikon.Info size={22} /> },
  peringatan: { lencana: 'bg-emas-lembut text-emas-teks ring-emas/15', ikon: <Ikon.Awas size={22} /> },
  bahaya: { lencana: 'bg-merah-lembut text-merah ring-merah/10', ikon: <Ikon.Sampah size={22} /> },
}

/**
 * Pengganti window.confirm yang mengikuti desain aplikasi:
 *
 *   const konfirmasi = useKonfirmasi()
 *   if (!(await konfirmasi({ judul: 'Hapus foto?', pesan: '…', tombol: 'Hapus', nada: 'bahaya' }))) return
 */
export function KonfirmasiProvider({ children }: { children: ReactNode }) {
  const [isi, setIsi] = useState<IsiKonfirmasi | null>(null)
  const jawab = useRef<(ya: boolean) => void>(() => {})

  const tanya = useCallback<Tanya>(
    (baru) =>
      new Promise<boolean>((selesai) => {
        // Dialog yang masih terbuka dianggap dibatalkan.
        jawab.current(false)
        jawab.current = selesai
        setIsi(baru)
      }),
    [],
  )

  const tutup = useCallback((ya: boolean) => {
    jawab.current(ya)
    jawab.current = () => {}
    setIsi(null)
  }, [])

  useEffect(() => {
    if (!isi) return
    function tombol(e: KeyboardEvent) {
      if (e.key === 'Escape') tutup(false)
    }
    document.addEventListener('keydown', tombol)
    const semula = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', tombol)
      document.body.style.overflow = semula
    }
  }, [isi, tutup])

  const nada = isi?.nada ?? 'utama'

  return (
    <Konteks.Provider value={tanya}>
      {children}
      {isi &&
        createPortal(
          <div
            className="fixed inset-0 z-[90] grid place-items-center overflow-y-auto bg-ink-deep/50 p-4 backdrop-blur-sm"
            onClick={() => tutup(false)}
          >
            <div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="konfirmasi-judul"
              aria-describedby="konfirmasi-pesan"
              onClick={(e) => e.stopPropagation()}
              className="masuk-halus w-full max-w-[400px] overflow-hidden rounded-kartu border border-garis bg-white text-center shadow-naik"
            >
              <div className="px-6 pb-5 pt-6.5">
                <span
                  className={cn(
                    'mx-auto mb-3.5 grid h-13 w-13 place-items-center rounded-full ring-8',
                    GAYA[nada].lencana,
                  )}
                >
                  {isi.ikon ?? GAYA[nada].ikon}
                </span>
                <b id="konfirmasi-judul" className="block text-[16px] font-bold tracking-[-0.01em] text-ink">
                  {isi.judul}
                </b>
                <p id="konfirmasi-pesan" className="m-0 mt-1.5 text-[13px] leading-relaxed text-teks-lembut">
                  {isi.pesan}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2.5 border-t border-garis bg-[#FAFCFB] px-5 py-4">
                <Tombol varian="hantu" onClick={() => tutup(false)}>
                  Batal
                </Tombol>
                <Tombol autoFocus varian={nada === 'bahaya' ? 'bahaya' : 'utama'} onClick={() => tutup(true)}>
                  {isi.tombol}
                </Tombol>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </Konteks.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useKonfirmasi(): Tanya {
  const tanya = useContext(Konteks)
  if (!tanya) throw new Error('useKonfirmasi harus dipakai di dalam <KonfirmasiProvider>')
  return tanya
}
