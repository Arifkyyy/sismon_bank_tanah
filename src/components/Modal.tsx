import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Ikon } from '@/lib/ikon'

/**
 * Jendela dialog sederhana: latar gelap, kotak putih di tengah, tertutup
 * dengan Esc atau klik di luar kotak. Isi dan tombol aksinya diserahkan ke
 * pemanggil supaya bisa dipakai untuk konfirmasi maupun form pendek.
 */
export function Modal({
  judul,
  sub,
  lebar = 'max-w-[440px]',
  onTutup,
  aksi,
  children,
}: {
  judul: string
  sub?: string
  lebar?: string
  onTutup: () => void
  aksi?: ReactNode
  children: ReactNode
}) {
  useEffect(() => {
    function tombol(e: KeyboardEvent) {
      if (e.key === 'Escape') onTutup()
    }
    document.addEventListener('keydown', tombol)
    const semula = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', tombol)
      document.body.style.overflow = semula
    }
  }, [onTutup])

  return createPortal(
    <div
      className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-ink-deep/50 p-4 backdrop-blur-sm"
      onClick={onTutup}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={judul}
        onClick={(e) => e.stopPropagation()}
        className={`w-full ${lebar} overflow-hidden rounded-kartu border border-garis bg-white shadow-naik`}
      >
        <div className="flex items-start gap-3 border-b border-garis px-5 py-4">
          <div className="min-w-0 flex-1">
            <b className="block text-[14.5px] font-bold text-ink">{judul}</b>
            {sub && <span className="mt-0.5 block text-[12px] text-teks-lembut">{sub}</span>}
          </div>
          <button
            type="button"
            aria-label="Tutup"
            onClick={onTutup}
            className="grid h-8 w-8 flex-none place-items-center rounded-full text-teks-samar transition hover:bg-kertas hover:text-ink"
          >
            <Ikon.Silang size={16} />
          </button>
        </div>

        <div className="px-5 py-4">{children}</div>

        {aksi && (
          <div className="flex flex-wrap justify-end gap-2.5 border-t border-garis bg-[#FAFCFB] px-5 py-3.5">
            {aksi}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
