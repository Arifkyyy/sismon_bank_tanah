import type { ReactNode } from 'react'
import { Ikon } from '@/lib/ikon'
import { cn } from '@/lib/util'

type Nada = 'hijau' | 'emas' | 'tanah' | 'ink'
type Gaya = 'terang' | 'pekat'

const GARIS: Record<Nada, string> = {
  hijau: 'bg-hijau',
  emas: 'bg-emas',
  tanah: 'bg-tanah',
  ink: 'bg-ink',
}

const GLIF: Record<Nada, string> = {
  hijau: 'bg-hijau-lembut text-hijau-tua',
  emas: 'bg-emas-lembut text-[#9A7508]',
  tanah: 'bg-tanah-lembut text-[#A8541A]',
  ink: 'bg-[#E8EFF1] text-ink',
}

export interface PropsStat {
  nama: string
  angka: string
  satuan?: string
  ikon: ReactNode
  ket: string
  /** arah tren kecil di bawah angka */
  arah?: 'naik' | 'turun'
  nada?: Nada
  /** 'terang' = kartu putih bergaris warna; 'pekat' = kartu hijau penuh */
  gaya?: Gaya
  /** di layar HP kartu dibuat lebih kecil, untuk deretan 2 kolom */
  ringkas?: boolean
}

/**
 * Kartu statistik. Dua gaya:
 * - terang: kartu putih, pembeda berupa garis vertikal berwarna di sisi kiri.
 * - pekat : kartu gradasi hijau dengan teks putih, dipakai pada dasbor petugas
 *   supaya deretan angka utama langsung terbaca sebagai satu blok.
 */
export function StatCard({ nama, angka, satuan, ikon, ket, arah, nada = 'hijau', gaya = 'terang', ringkas }: PropsStat) {
  const pekat = gaya === 'pekat'

  return (
    <div
      className={cn(
        'relative min-w-0 overflow-hidden rounded-kartu px-5 pb-4 pt-4.5',
        ringkas && 'max-sm:rounded-2xl max-sm:px-3.5 max-sm:pb-3 max-sm:pt-3',
        pekat
          ? 'bg-[linear-gradient(140deg,#1A9E48,#12824D_45%,#09381A)] text-white shadow-naik'
          : 'border border-garis bg-white shadow-kartu',
      )}
    >
      {pekat ? (
        <span className="pointer-events-none absolute -right-10 -top-14 h-36 w-36 rounded-full bg-white/10 blur-xl" />
      ) : (
        <span className={cn('absolute bottom-4 left-0 top-4 w-[3px] rounded-r', GARIS[nada])} />
      )}
      <div className="relative z-[1] flex items-start justify-between gap-2.5">
        <div
          className={cn(
            'text-[12.5px] font-medium',
            ringkas && 'max-sm:text-[11.5px] max-sm:leading-snug',
            pekat ? 'text-white/85' : 'text-teks-lembut',
          )}
        >
          {nama}
        </div>
        <div
          className={cn(
            'grid h-[34px] w-[34px] flex-none place-items-center rounded-[10px]',
            ringkas && 'max-sm:h-7 max-sm:w-7 max-sm:rounded-lg max-sm:[&>svg]:h-[14px] max-sm:[&>svg]:w-[14px]',
            pekat ? 'border border-white/20 bg-white/15 text-white' : GLIF[nada],
          )}
        >
          {ikon}
        </div>
      </div>
      <div
        className={cn(
          'num relative z-[1] my-1 text-[31px] font-extrabold leading-tight tracking-[-0.035em]',
          ringkas && 'max-sm:my-0.5 max-sm:text-[24px]',
          pekat ? 'text-white' : 'text-ink',
        )}
      >
        {angka}
        {satuan && (
          <small
            className={cn(
              'ml-1 text-sm font-semibold tracking-normal',
              ringkas && 'max-sm:text-[12px]',
              pekat ? 'text-white/70' : 'text-teks-samar',
            )}
          >
            {satuan}
          </small>
        )}
      </div>
      <div
        className={cn(
          'relative z-[1] flex items-center gap-1.5 text-[11.5px]',
          ringkas && 'max-sm:text-[10.5px] max-sm:leading-snug',
          pekat ? 'text-white/70' : 'text-teks-lembut',
        )}
      >
        {arah === 'naik' && (
          <span className={pekat ? 'text-white' : 'text-hijau'}>
            <Ikon.Naik size={13} />
          </span>
        )}
        {arah === 'turun' && (
          <span className={pekat ? 'text-white' : 'text-merah'}>
            <Ikon.Turun size={13} />
          </span>
        )}
        {ket}
      </div>
    </div>
  )
}
