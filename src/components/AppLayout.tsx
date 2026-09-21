import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AKAR, JUDUL } from '@/config/menu'
import { Sidebar } from '@/components/Sidebar'
import { useAuth } from '@/context/AuthContext'
import { Ikon } from '@/lib/ikon'
import { cn } from '@/lib/util'
import type { Peran } from '@/types'

const KUNCI_CIUT = 'bt-sidebar-ciut'

interface Props {
  peran: Peran
}

/**
 * Rangka aplikasi: sidebar tetap di kiri, topbar menempel di atas,
 * dan isi halaman dirender lewat <Outlet /> dari react-router.
 */
export function AppLayout({ peran }: Props) {
  const { akun } = useAuth()
  const [menuHp, setMenuHp] = useState(false)
  const [ciut, setCiut] = useState(() => {
    try {
      return localStorage.getItem(KUNCI_CIUT) === '1'
    } catch {
      return false
    }
  })
  const lokasi = useLocation()

  useEffect(() => {
    try {
      localStorage.setItem(KUNCI_CIUT, ciut ? '1' : '0')
    } catch {
      // localStorage tidak tersedia (mis. mode privat) — abaikan saja.
    }
  }, [ciut])

  // Judul topbar diambil dari segmen terakhir URL.
  const segmen = lokasi.pathname.replace(AKAR[peran], '').replace(/^\//, '')
  const [judul, sub] = JUDUL[segmen] ?? ['Halaman', '']

  return (
    <div className="min-h-screen">
      {menuHp && (
        <div
          className="fixed inset-0 z-[35] bg-ink-deep/45 lg:hidden"
          onClick={() => setMenuHp(false)}
          aria-hidden="true"
        />
      )}

      <Sidebar
        peran={peran}
        terbuka={menuHp}
        onTutup={() => setMenuHp(false)}
        ciut={ciut}
        onCiut={() => setCiut((v) => !v)}
      />

      <main className={cn('flex min-h-screen flex-col transition-[margin] duration-200', ciut ? 'lg:ml-[84px]' : 'lg:ml-[270px]')}>
        <header className="sticky top-0 z-30 flex items-center gap-4 border-b border-garis bg-kertas/85 px-4 py-3.5 backdrop-blur lg:px-8">
          <button
            type="button"
            onClick={() => setMenuHp(true)}
            aria-label="Buka menu"
            className="grid h-[38px] w-[38px] place-items-center rounded-[10px] border border-garis-kuat bg-white text-ink lg:hidden"
          >
            <Ikon.Menu size={19} />
          </button>

          <div className="min-w-0">
            <h1 className="m-0 truncate text-xl font-extrabold tracking-[-0.025em] text-ink">{judul}</h1>
            <p className="m-0 mt-px truncate text-[12.5px] text-teks-lembut">{sub}</p>
          </div>

          <div className="ml-auto flex items-center gap-2.5">
            <div className="relative hidden items-center xl:flex">
              <span className="pointer-events-none absolute left-3 text-teks-samar">
                <Ikon.Cari size={16} />
              </span>
              <input
                type="search"
                placeholder="Cari petugas, tanggal, atau laporan"
                className="w-[246px] rounded-[10px] border border-garis-kuat bg-white py-2.5 pl-9 pr-3 text-[13px] focus:border-hijau focus:outline-none focus:ring-[3px] focus:ring-hijau/15"
              />
            </div>
            <button
              type="button"
              aria-label="Notifikasi"
              className="relative grid h-[38px] w-[38px] place-items-center rounded-[10px] border border-garis-kuat bg-white text-teks-lembut hover:border-hijau hover:text-hijau"
            >
              <Ikon.Lonceng size={18} />
              <i className="absolute right-2 top-2 h-[7px] w-[7px] rounded-full border-[1.5px] border-white bg-tanah" />
            </button>
            <span
              className="grid h-9 w-9 place-items-center rounded-[11px] text-[13px] font-bold"
              style={{
                background: akun?.emas
                  ? 'linear-gradient(135deg,#F2BE26,#DE7B2C)'
                  : 'linear-gradient(135deg,#24985C,#145D31)',
                color: akun?.emas ? '#072932' : '#fff',
              }}
            >
              {akun?.inisial}
            </span>
          </div>
        </header>

        <div className="flex-1 px-4 pb-28 pt-6 lg:px-8">
          <div className="mx-auto max-w-[1280px]">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  )
}
