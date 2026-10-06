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
      className="fixed inset-0 z-[70] grid grid-cols-1 place-items-center overflow-y-auto bg-ink-deep/50 p-4 backdrop-blur-sm max-sm:p-3"
      onClick={onTutup}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={judul}
        onClick={(e) => e.stopPropagation()}
        // Kepala (tombol tutup) dan kaki (tombol aksi) tetap terlihat; hanya isinya yang digulir.
        className={`flex max-h-[calc(100dvh-2rem)] w-full min-w-0 flex-col ${lebar} overflow-hidden rounded-kartu border border-garis bg-white shadow-naik max-sm:max-h-[calc(100dvh-1.5rem)]`}
      >
        <div className="flex flex-none items-start gap-3 border-b border-garis px-5 py-4 max-sm:px-4">
          <div className="min-w-0 flex-1">
            <b className="block text-[14.5px] font-bold text-ink">{judul}</b>
            {sub && <span className="mt-0.5 block text-[12px] text-teks-lembut">{sub}</span>}
          </div>
          <button
            type="button"
            aria-label="Tutup"
            onClick={onTutup}
            className="grid h-8 w-8 flex-none place-items-center rounded-full bg-kertas text-teks-lembut transition hover:bg-garis hover:text-ink max-sm:h-9 max-sm:w-9"
          >
            <Ikon.Silang size={16} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 max-sm:px-4">{children}</div>

        {aksi && (
          <div className="flex flex-none flex-wrap justify-end gap-2.5 border-t border-garis bg-[#FAFCFB] px-5 py-3.5 max-sm:px-4 max-sm:[&>*]:flex-1">
            {aksi}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
