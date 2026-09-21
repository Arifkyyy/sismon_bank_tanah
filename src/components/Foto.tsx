import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Ikon } from '@/lib/ikon'
import { cn } from '@/lib/util'

/* ------------------------------------------------------------- Pratinjau */

/**
 * Penampil foto layar penuh. Dipasang lewat portal supaya tidak ikut
 * terpotong kartu induk yang memakai overflow-hidden atau transform.
 */
export function PratinjauFoto({
  foto,
  mulai = 0,
  judul,
  onTutup,
}: {
  foto: string[]
  mulai?: number
  judul?: string
  onTutup: () => void
}) {
  const [i, setI] = useState(Math.min(mulai, foto.length - 1))

  const maju = useCallback(() => setI((n) => (n + 1) % foto.length), [foto.length])
  const mundur = useCallback(() => setI((n) => (n - 1 + foto.length) % foto.length), [foto.length])

  useEffect(() => {
    function tombol(e: KeyboardEvent) {
      if (e.key === 'Escape') onTutup()
      if (e.key === 'ArrowRight') maju()
      if (e.key === 'ArrowLeft') mundur()
    }
    document.addEventListener('keydown', tombol)
    const semula = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', tombol)
      document.body.style.overflow = semula
    }
  }, [maju, mundur, onTutup])

  if (foto.length === 0) return null

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={judul ?? 'Pratinjau foto'}
      className="fixed inset-0 z-[80] grid grid-rows-[auto_1fr_auto] bg-ink-deep/85 backdrop-blur-sm"
      onClick={onTutup}
    >
      <div className="flex items-center gap-3 px-4 py-3.5 text-white sm:px-6">
        <div className="min-w-0">
          <b className="block truncate text-[13.5px] font-semibold">{judul ?? 'Foto bukti'}</b>
          <span className="num block text-[11.5px] text-white/60">
            Foto {i + 1} dari {foto.length}
          </span>
        </div>
        <button
          type="button"
          aria-label="Tutup pratinjau"
          onClick={onTutup}
          className="ml-auto grid h-9 w-9 flex-none place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
        >
          <Ikon.Silang size={17} />
        </button>
      </div>

      <div className="relative grid min-h-0 place-items-center px-4 sm:px-6">
        <img
          src={foto[i]}
          alt={`${judul ?? 'Foto bukti'} ${i + 1}`}
          onClick={(e) => e.stopPropagation()}
          className="max-h-full max-w-full rounded-xl object-contain shadow-naik"
        />
        {foto.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Foto sebelumnya"
              onClick={(e) => {
                e.stopPropagation()
                mundur()
              }}
              className="absolute left-2 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/25 sm:left-5"
            >
              <span className="block rotate-180">
                <Ikon.Chevron size={19} />
              </span>
            </button>
            <button
              type="button"
              aria-label="Foto berikutnya"
              onClick={(e) => {
                e.stopPropagation()
                maju()
              }}
              className="absolute right-2 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/25 sm:right-5"
            >
              <Ikon.Chevron size={19} />
            </button>
          </>
        )}
      </div>

      <div className="flex justify-center gap-2 overflow-x-auto px-4 py-4 sm:px-6">
        {foto.length > 1 &&
          foto.map((f, n) => (
            <button
              key={f.slice(-24) + n}
              type="button"
              aria-label={`Lihat foto ${n + 1}`}
              aria-current={n === i}
              onClick={(e) => {
                e.stopPropagation()
                setI(n)
              }}
              className={cn(
                'h-12 w-16 flex-none overflow-hidden rounded-lg border-2 transition',
                n === i ? 'border-hijau-terang' : 'border-white/20 opacity-60 hover:opacity-100',
              )}
            >
              <img src={f} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
      </div>
    </div>,
    document.body,
  )
}

/* ---------------------------------------------------------------- Galeri */

/** Deretan foto yang masih bisa dihapus — dipakai di dalam formulir. */
export function GaleriFoto({
  foto,
  judul = 'Foto bukti',
  onHapus,
}: {
  foto: string[]
  judul?: string
  onHapus?: (indeks: number) => void
}) {
  const [buka, setBuka] = useState<number | null>(null)
  if (foto.length === 0) return null

  return (
    <>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(88px,1fr))] gap-2">
        {foto.map((f, i) => (
          <div
            key={f.slice(-24) + i}
            className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-garis-kuat bg-ink-deep/5"
          >
            <button
              type="button"
              aria-label={`Lihat foto ${i + 1}`}
              onClick={() => setBuka(i)}
              className="block h-full w-full"
            >
              <img src={f} alt="" className="h-full w-full object-cover" />
            </button>
            <span className="num pointer-events-none absolute bottom-1 left-1 rounded-md bg-ink-deep/65 px-1.5 py-0.5 text-[10px] font-semibold text-white">
              {i + 1}
            </span>
            {onHapus && (
              <button
                type="button"
                aria-label={`Hapus foto ${i + 1}`}
                onClick={() => onHapus(i)}
                className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-md bg-ink-deep/65 text-white opacity-0 transition hover:bg-merah focus-visible:opacity-100 group-hover:opacity-100"
              >
                <Ikon.Silang size={13} />
              </button>
            )}
          </div>
        ))}
      </div>
      {buka !== null && (
        <PratinjauFoto foto={foto} mulai={buka} judul={judul} onTutup={() => setBuka(null)} />
      )}
    </>
  )
}

/* -------------------------------------------------------------- Tumpukan */

/** Ringkasan foto yang rapat untuk kartu draf dan baris riwayat. */
export function TumpukanFoto({
  foto,
  judul = 'Foto bukti',
  maksTampil = 3,
}: {
  foto: string[]
  judul?: string
  maksTampil?: number
}) {
  const [buka, setBuka] = useState<number | null>(null)
  if (foto.length === 0) return null

  const tampil = foto.slice(0, maksTampil)
  const sisa = foto.length - tampil.length

  return (
    <>
      <div className="flex items-center gap-1.5">
        {tampil.map((f, i) => (
          <button
            key={f.slice(-24) + i}
            type="button"
            aria-label={`Lihat ${judul.toLowerCase()} ${i + 1}`}
            onClick={() => setBuka(i)}
            className="h-[34px] w-11 flex-none overflow-hidden rounded-md border border-garis-kuat transition hover:border-hijau hover:shadow-kartu"
          >
            <img src={f} alt="" className="h-full w-full object-cover" />
          </button>
        ))}
        {sisa > 0 && (
          <button
            type="button"
            aria-label={`Lihat ${sisa} foto lainnya`}
            onClick={() => setBuka(maksTampil)}
            className="num grid h-[34px] w-9 flex-none place-items-center rounded-md border border-garis-kuat bg-[#F3F7F4] text-[11.5px] font-semibold text-teks-lembut transition hover:border-hijau hover:text-hijau"
          >
            +{sisa}
          </button>
        )}
      </div>
      {buka !== null && (
        <PratinjauFoto foto={foto} mulai={buka} judul={judul} onTutup={() => setBuka(null)} />
      )}
    </>
  )
}
