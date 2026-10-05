import { WARNA_SHIFT } from '@/lib/shift'
import { cn } from '@/lib/util'
import type { Shift } from '@/types'

/** Kotak kecil berisi kode shift dengan warnanya, mis. [P]. Dipakai di daftar jenis, tabel jadwal, dan legenda. */
export function KodeShift({
  shift,
  ukuran = 30,
  className,
}: {
  shift: Pick<Shift, 'kode' | 'warna' | 'nama' | 'aktif'>
  ukuran?: number
  className?: string
}) {
  return (
    <span
      title={shift.nama}
      className={cn(
        'grid flex-none place-items-center rounded-lg border font-bold leading-none tracking-tight',
        WARNA_SHIFT[shift.warna].kotak,
        !shift.aktif && 'opacity-50',
        className,
      )}
      style={{ width: ukuran, height: ukuran, fontSize: ukuran * 0.42 }}
    >
      {shift.kode}
    </span>
  )
}
