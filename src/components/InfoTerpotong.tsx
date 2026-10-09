import { Ikon } from '@/lib/ikon'
import { BATAS_DAFTAR } from '@/lib/batas'
import { cn } from '@/lib/util'

/**
 * Pemberitahuan bahwa daftar mencapai batas jumlah baris, sehingga data yang
 * lebih lama tidak ikut tampil (dan tidak ikut terunduh).
 */
export function InfoTerpotong({ apa = 'catatan', className }: { apa?: string; className?: string }) {
  return (
    <div
      role="status"
      className={cn(
        'flex items-start gap-2.5 rounded-xl border border-emas/40 bg-emas-lembut px-3.5 py-2.5 text-[12.5px] leading-relaxed text-emas-teks',
        className,
      )}
    >
      <Ikon.Awas size={16} className="mt-0.5 flex-none" />
      <span>
        <b className="font-semibold">Data terlalu banyak.</b> Hanya {BATAS_DAFTAR.toLocaleString('id-ID')} {apa} terbaru yang
        ditampilkan, jadi angka di kartu adalah angka minimal. Persempit periode atau saringannya untuk melihat semuanya.
      </span>
    </div>
  )
}
