import { Tombol } from '@/components/ui'

/**
 * Pita kecil untuk keadaan memuat / gagal saat mengambil data dari backend.
 * Tidak tampil apa-apa bila data sudah siap.
 */
export function StatusData({
  memuat,
  galat,
  onUlang,
}: {
  memuat: boolean
  galat: string | null
  onUlang?: () => void
}) {
  if (galat) {
    return (
      <div className="mx-5 my-3 flex flex-wrap items-center gap-3 rounded-xl border border-[#F0CFCB] bg-[#FCF1EF] px-3.5 py-2.5 text-[13px] text-merah">
        <span className="flex-1">{galat}</span>
        {onUlang && (
          <Tombol varian="hantu" kecil onClick={onUlang}>
            Coba lagi
          </Tombol>
        )}
      </div>
    )
  }
  if (memuat) {
    return <div className="mx-5 my-3 text-[12.5px] text-teks-samar">Memuat data…</div>
  }
  return null
}
