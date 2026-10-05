import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { KodeShift } from '@/components/shift/KodeShift'
import { Ikon } from '@/lib/ikon'
import { labelJam } from '@/lib/shift'
import { formatTanggal } from '@/lib/tanggal'
import { cn } from '@/lib/util'
import type { PetugasJadwal, Shift } from '@/types'

const LEBAR = 264

/**
 * Pop-up kecil di dekat kotak jadwal yang diklik. Isinya HANYA shift aktif
 * yang berlaku untuk jabatan petugas itu, Libur, dan "Kosongkan".
 */
export function PilihShiftKotak({
  jangkar,
  petugas,
  tanggal,
  pilihan,
  sekarang,
  diajukanTukar,
  onPilih,
  onTutup,
}: {
  /** elemen kotak yang diklik, untuk menentukan posisi */
  jangkar: HTMLElement
  petugas: PetugasJadwal
  tanggal: string
  /** shift aktif yang cocok dengan jabatan petugas, termasuk Libur */
  pilihan: Shift[]
  /** shift yang sedang terisi; bisa saja sudah nonaktif */
  sekarang: Shift | null
  diajukanTukar: boolean
  onPilih: (shiftId: number | null) => void
  onTutup: () => void
}) {
  const kotak = useRef<HTMLDivElement>(null)
  const [posisi, setPosisi] = useState<{ top: number; left: number } | null>(null)

  // Diletakkan di bawah kotak; naik ke atas bila tidak muat, dan digeser agar tetap di layar.
  useLayoutEffect(() => {
    const r = jangkar.getBoundingClientRect()
    const tinggi = kotak.current?.offsetHeight ?? 300
    const bawah = r.bottom + 6 + tinggi <= window.innerHeight
    setPosisi({
      top: Math.max(8, bawah ? r.bottom + 6 : r.top - 6 - tinggi),
      left: Math.min(Math.max(8, r.left + r.width / 2 - LEBAR / 2), window.innerWidth - LEBAR - 8),
    })
  }, [jangkar])

  useEffect(() => {
    function klik(e: MouseEvent) {
      const t = e.target as Node
      if (!kotak.current?.contains(t) && !jangkar.contains(t)) onTutup()
    }
    function tombol(e: KeyboardEvent) {
      if (e.key === 'Escape') onTutup()
    }
    // Posisinya dihitung sekali; saat halaman/tabel digulir, pop-up ditutup saja.
    function gulir(e: Event) {
      if (!kotak.current?.contains(e.target as Node)) onTutup()
    }
    document.addEventListener('mousedown', klik)
    document.addEventListener('keydown', tombol)
    window.addEventListener('scroll', gulir, true)
    window.addEventListener('resize', onTutup)
    return () => {
      document.removeEventListener('mousedown', klik)
      document.removeEventListener('keydown', tombol)
      window.removeEventListener('scroll', gulir, true)
      window.removeEventListener('resize', onTutup)
    }
  }, [jangkar, onTutup])

  const { tanggal: teks, hari } = formatTanggal(tanggal)

  return createPortal(
    <div
      ref={kotak}
      role="dialog"
      aria-label={`Pilih shift ${petugas.nama} ${teks}`}
      className="masuk-halus fixed z-[60] overflow-hidden rounded-xl border border-garis bg-white shadow-naik"
      style={{ width: LEBAR, top: posisi?.top ?? -9999, left: posisi?.left ?? -9999 }}
    >
      <div className="border-b border-garis px-3.5 py-2.5">
        <b className="block truncate text-[13px] font-semibold text-ink">{petugas.nama}</b>
        <span className="block text-[11.5px] text-teks-samar">
          {hari}, {teks} · {petugas.jabatan}
        </span>
      </div>

      {diajukanTukar && (
        <div className="flex gap-2 border-b border-garis bg-emas-lembut px-3.5 py-2 text-[11.5px] leading-snug text-emas-teks">
          <Ikon.Tukar size={14} className="mt-px flex-none" />
          Sedang diajukan tukar. Mengubah kotak ini membatalkan permintaan tersebut.
        </div>
      )}

      <div className="scrollbar-lembut max-h-[280px] overflow-y-auto p-1.5">
        {pilihan.map((s) => {
          const dipilih = sekarang?.id === s.id
          const label = labelJam(s)
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => (dipilih ? onTutup() : onPilih(s.id))}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition',
                dipilih ? 'bg-hijau-lembut' : 'hover:bg-kertas',
              )}
            >
              <KodeShift shift={s} ukuran={28} />
              <span className="min-w-0 flex-1">
                <b className="block truncate text-[12.5px] font-semibold text-ink">{s.nama}</b>
                <span className="block text-[11px] text-teks-samar">
                  {s.rentang ?? 'Tanpa jam kerja'}
                  {label && ` · ${label}`}
                </span>
              </span>
              {dipilih && <Ikon.Centang size={15} className="flex-none text-hijau" />}
            </button>
          )
        })}
        {sekarang && !pilihan.some((s) => s.id === sekarang.id) && (
          <p className="m-0 px-2 py-1.5 text-[11px] text-teks-samar">
            Terisi {sekarang.nama}, yang sudah nonaktif atau tidak berlaku untuk jabatan ini.
          </p>
        )}
        {pilihan.length <= 1 && (
          <p className="m-0 px-2 py-1.5 text-[11px] text-teks-samar">
            Belum ada shift aktif untuk {petugas.jabatan}. Tambahkan di tab Jenis Shift.
          </p>
        )}
      </div>

      {sekarang && (
        <button
          type="button"
          onClick={() => onPilih(null)}
          className="flex w-full items-center gap-2 border-t border-garis px-3.5 py-2.5 text-left text-[12.5px] font-semibold text-teks-lembut transition hover:bg-kertas hover:text-ink"
        >
          <Ikon.Silang size={14} /> Kosongkan
        </button>
      )}
    </div>,
    document.body,
  )
}
