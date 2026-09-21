import { useEffect, useRef, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
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
  const { akun, keluar } = useAuth()
  const [menuHp, setMenuHp] = useState(false)
  const [menuAkun, setMenuAkun] = useState(false)
  const akunRef = useRef<HTMLDivElement>(null)
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

  // Menu akun ditutup saat klik di luar atau menekan Esc.
  useEffect(() => {
    if (!menuAkun) return
    const klik = (e: MouseEvent) => {
      if (!akunRef.current?.contains(e.target as Node)) setMenuAkun(false)
    }
    const tombol = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuAkun(false)
    }
    document.addEventListener('mousedown', klik)
    document.addEventListener('keydown', tombol)
    return () => {
      document.removeEventListener('mousedown', klik)
      document.removeEventListener('keydown', tombol)
    }
  }, [menuAkun])

  useEffect(() => setMenuAkun(false), [lokasi.pathname])

  const akar = AKAR[peran]

  // Judul halaman diambil dari segmen terakhir URL. Dashboard sudah punya
  // hero sendiri, jadi judulnya tidak perlu diulang di atas konten.
  const segmen = lokasi.pathname.replace(akar, '').replace(/^\//, '')
  const [judul, sub] = JUDUL[segmen] ?? ['Halaman', '']
  const pakaiJudul = segmen !== ''

  const avatar = {
    background: akun?.emas
      ? 'linear-gradient(135deg,#F2BE26,#DE7B2C)'
      : 'linear-gradient(135deg,#24985C,#145D31)',
    color: akun?.emas ? '#072932' : '#fff',
  }

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

      <main
        className={cn(
          // pt menyisakan ruang untuk topbar yang dipasang fixed
          'flex min-h-screen flex-col pt-[69px] transition-[margin] duration-200',
          ciut ? 'lg:ml-[84px]' : 'lg:ml-[270px]',
        )}
      >
        {/* Topbar dipasang fixed — body memakai overflow-x-hidden sehingga
            position: sticky tidak menempel saat halaman digulir. */}
        <header
          className={cn(
            'fixed inset-x-0 top-0 z-30 flex items-center gap-2.5 border-b border-garis bg-white px-4 py-3 transition-[left] duration-200 lg:gap-5 lg:px-8',
            ciut ? 'lg:left-[84px]' : 'lg:left-[270px]',
          )}
        >
          <button
            type="button"
            onClick={() => setMenuHp(true)}
            aria-label="Buka menu"
            className="grid h-10 w-10 flex-none place-items-center rounded-full text-ink hover:bg-kertas lg:hidden"
          >
            <Ikon.Menu size={20} />
          </button>

          {/* Kolom pencarian utama — pil abu tanpa garis tepi */}
          <div className="relative flex min-w-0 flex-1 items-center sm:max-w-[430px]">
            <span className="pointer-events-none absolute left-4 text-teks-samar">
              <Ikon.Cari size={17} />
            </span>
            <input
              type="search"
              placeholder="Cari aset, lokasi, atau dokumen..."
              aria-label="Pencarian"
              className="h-11 w-full rounded-full border border-transparent bg-[#EEF2EF] pl-11 pr-4 text-[13.5px] text-teks placeholder:text-teks-samar focus:border-hijau/40 focus:bg-white focus:outline-none focus:ring-[3px] focus:ring-hijau/15"
            />
          </div>

          <div className="ml-auto flex flex-none items-center gap-1 lg:gap-3">
            <button
              type="button"
              aria-label="Notifikasi"
              className="relative grid h-10 w-10 place-items-center rounded-full text-teks-lembut hover:bg-kertas hover:text-ink"
            >
              <Ikon.Lonceng size={20} />
              <i className="absolute right-[9px] top-[9px] h-2 w-2 rounded-full border-2 border-white bg-tanah" />
            </button>

            {/* Kartu akun + menu singkat */}
            <div className="relative" ref={akunRef}>
              <button
                type="button"
                onClick={() => setMenuAkun((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={menuAkun}
                className={cn(
                  'flex items-center gap-2.5 rounded-full p-1 pr-1.5 transition-colors hover:bg-kertas sm:pr-2.5',
                  menuAkun && 'bg-kertas',
                )}
              >
                <span className="grid h-10 w-10 flex-none place-items-center rounded-full text-[13.5px] font-bold" style={avatar}>
                  {akun?.inisial}
                </span>
                <span className="hidden min-w-0 text-left sm:block">
                  <b className="block truncate text-[13.5px] font-bold leading-tight text-ink">{akun?.nama}</b>
                  <span className="block truncate text-[11.5px] leading-tight text-teks-lembut">{akun?.peran}</span>
                </span>
                <Ikon.Chevron
                  size={16}
                  className={cn(
                    'hidden flex-none text-teks-samar transition-transform sm:block',
                    menuAkun ? '-rotate-90' : 'rotate-90',
                  )}
                />
              </button>

              {menuAkun && (
                <div
                  role="menu"
                  className="absolute right-0 top-[calc(100%+8px)] w-52 overflow-hidden rounded-[14px] border border-garis bg-white py-1.5 shadow-naik"
                >
                  <div className="border-b border-garis px-3.5 pb-2.5 pt-1.5 sm:hidden">
                    <b className="block truncate text-[13px] font-bold text-ink">{akun?.nama}</b>
                    <span className="block truncate text-[11.5px] text-teks-lembut">{akun?.peran}</span>
                  </div>
                  <Link
                    to={`${akar}/profil`}
                    role="menuitem"
                    className="flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] font-medium text-teks no-underline hover:bg-kertas"
                  >
                    <Ikon.Profil size={16} /> Profil saya
                  </Link>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={keluar}
                    className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] font-medium text-merah hover:bg-merah-lembut"
                  >
                    <Ikon.Keluar size={16} /> Keluar
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 px-4 pb-28 pt-6 lg:px-8">
          <div className="mx-auto max-w-[1280px]">
            {pakaiJudul && (
              <div className="mb-5">
                <h1 className="m-0 text-xl font-extrabold tracking-[-0.025em] text-ink">{judul}</h1>
                {sub && <p className="m-0 mt-px text-[12.5px] text-teks-lembut">{sub}</p>}
              </div>
            )}
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  )
}
