import type { ReactNode } from 'react'
import { Ikon } from '@/lib/ikon'
import { cn } from '@/lib/util'

type Nada = 'hijau' | 'emas' | 'tanah' | 'ink'

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
}

/**
 * Kartu statistik. Pembeda antar kartu adalah garis vertikal berwarna di
 * sisi kiri, bukan kotak ikon besar — supaya deretan kartu tidak terlihat
 * seragam dan berat.
 */
export function StatCard({ nama, angka, satuan, ikon, ket, arah, nada = 'hijau' }: PropsStat) {
  return (
    <div className="relative min-w-0 overflow-hidden rounded-kartu border border-garis bg-white px-5 pb-4 pt-4.5 shadow-kartu">
      <span className={cn('absolute bottom-4 left-0 top-4 w-[3px] rounded-r', GARIS[nada])} />
      <div className="flex items-start justify-between gap-2.5">
        <div className="text-[12.5px] font-medium text-teks-lembut">{nama}</div>
        <div className={cn('grid h-[34px] w-[34px] flex-none place-items-center rounded-[10px]', GLIF[nada])}>
          {ikon}
        </div>
      </div>
      <div className="num my-1 text-[31px] font-extrabold leading-tight tracking-[-0.035em] text-ink">
        {angka}
        {satuan && <small className="ml-1 text-sm font-semibold tracking-normal text-teks-samar">{satuan}</small>}
      </div>
      <div className="flex items-center gap-1.5 text-[11.5px] text-teks-lembut">
        {arah === 'naik' && (
          <span className="text-hijau">
            <Ikon.Naik size={13} />
          </span>
        )}
        {arah === 'turun' && (
          <span className="text-merah">
            <Ikon.Turun size={13} />
          </span>
        )}
        {ket}
      </div>
    </div>
  )
}
