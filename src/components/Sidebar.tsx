import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { AKAR, MENU } from '@/config/menu'
import { useAuth } from '@/context/AuthContext'
import { useLemburSaya } from '@/context/LemburContext'
import { Ikon } from '@/lib/ikon'
import { query } from '@/lib/api'
import { keIso } from '@/lib/tanggal'
import { useApi } from '@/lib/useApi'
import type { NamaIkon } from '@/lib/ikon'
import { cn } from '@/lib/util'
import type { Kendala, Logbook, Peran } from '@/types'

interface Props {
  peran: Peran
  terbuka: boolean
  onTutup: () => void
  ciut: boolean
  onCiut: () => void
}

export function Sidebar({ peran, terbuka, onTutup, ciut, onCiut }: Props) {
  const { akun, keluar } = useAuth()
  // Penugasan lembur milik akun ini saja — jadi angka notifikasinya ikut
  // petugas yang dipilih admin, bukan total seluruh petugas.
  const { menunggu } = useLemburSaya()
  const lokasi = useLocation()

  // Angka notifikasi admin: logbook yang masuk hari ini dan kendala yang belum ditinjau.
  const pengawas = peran !== 'user'
  const logHariIni = useApi<Logbook[]>(
    pengawas ? `/api/logbook${query({ tanggal: keIso(new Date()), batas: 1000 })}` : null,
    [],
  )
  const kendalaBaru = useApi<Kendala[]>(pengawas ? '/api/kendala?status=Baru&batas=1000' : null, [])
  const muatLog = logHariIni.muat
  const muatKendala = kendalaBaru.muat
  // Diperbarui tiap pindah halaman (mis. setelah mengubah status kendala) dan tiap menit.
  useEffect(() => {
    muatLog()
    muatKendala()
    const t = window.setInterval(() => {
      muatLog()
      muatKendala()
    }, 60_000)
    return () => window.clearInterval(t)
  }, [lokasi.pathname, muatLog, muatKendala])
  const angka = (n: number) => (n > 0 ? (n > 99 ? '99+' : String(n)) : undefined)
  const navRef = useRef<HTMLElement>(null)
  const sisiRef = useRef<HTMLElement>(null)
  const [penanda, setPenanda] = useState({ y: 0, tinggi: 42, tampil: false })
  // Perpindahan pertama (mis. setelah ganti peran) tidak dianimasikan,
  // supaya penandanya tidak terlihat meluncur dari paling atas.
  const [beranimasi, setBeranimasi] = useState(false)

  /** Mengukur posisi menu aktif lalu menggeser penanda ke sana. */
  const ukur = useCallback(() => {
    const aktif = navRef.current?.querySelector<HTMLElement>('a[aria-current="page"]')
    const sisi = sisiRef.current
    if (!aktif || !sisi) {
      setPenanda((p) => ({ ...p, tampil: false }))
      return
    }
    const a = aktif.getBoundingClientRect()
    const s = sisi.getBoundingClientRect()
    setPenanda({ y: a.top - s.top, tinggi: a.height, tampil: true })
  }, [])

  useLayoutEffect(() => {
    ukur()
    const t = window.setTimeout(() => setBeranimasi(true), 60)
    return () => window.clearTimeout(t)
  }, [ukur, lokasi.pathname])

  // Menu berganti saat peran berganti — matikan animasi sekali lagi.
  useLayoutEffect(() => {
    setBeranimasi(false)
  }, [peran])

  // Lebar sidebar berubah saat diciutkan/dibuka — ukur ulang setelah transisinya selesai.
  useEffect(() => {
    const t = window.setTimeout(ukur, 210)
    return () => window.clearTimeout(t)
  }, [ciut, ukur])

  useEffect(() => {
    window.addEventListener('resize', ukur)
    const nav = navRef.current
    nav?.addEventListener('scroll', ukur)
    return () => {
      window.removeEventListener('resize', ukur)
      nav?.removeEventListener('scroll', ukur)
    }
  }, [ukur])

  const akar = AKAR[peran]

  return (
    <aside
      ref={sisiRef}
      className={cn(
        'fixed bottom-0 left-0 top-0 z-40 flex w-[270px] flex-col rounded-r-sidebar bg-sidebar-dasar transition-[transform,width] duration-200 lg:translate-x-0',
        terbuka ? 'translate-x-0' : '-translate-x-full',
        ciut && 'lg:w-[84px]',
      )}
      // Gradasi sesuai spesifikasi Figma: 09381A (0%) → 1A9E48 (100%)
      style={{ backgroundImage: 'linear-gradient(180deg,#09381A 0%,#1A9E48 100%)' }}
    >
      {/* Penanda menu aktif: sewarna latar halaman, dengan dua sudut cekung
          di atas dan bawah sehingga tepi hijau melengkung masuk. */}
      <span
        aria-hidden="true"
        className={cn(
          'penanda-menu pointer-events-none absolute left-0 right-0 top-0 z-[2] bg-kertas',
          beranimasi && 'transition-[transform,height] duration-[420ms] ease-pantul',
          !terbuka && 'invisible lg:visible',
          ciut && 'lg:invisible',
        )}
        style={{
          height: penanda.tinggi,
          transform: `translateY(${penanda.y}px)`,
          opacity: penanda.tampil ? 1 : 0,
        }}
      />

      {/* Kop: logo + nama lembaga, rata tengah */}
      <div className={cn('relative z-[3] flex flex-col items-center px-4.5 pb-6 pt-7 text-center', ciut && 'lg:px-2')}>
        <img src="/logo-bt.png" alt="Logo Badan Bank Tanah" className={cn('mb-3 w-[66px]', ciut && 'lg:w-9')} />
        <b className={cn('block font-inter text-[15px] font-bold leading-snug tracking-[-0.005em] text-white', ciut && 'lg:hidden')}>
          Badan Bank Tanah
        </b>
        <span className={cn('mt-px block font-inter text-[10px] font-medium leading-snug tracking-[0.005em] text-white/80', ciut && 'lg:hidden')}>
          Indonesia Land Bank Authority
        </span>
      </div>

      {/* Daftar menu */}
      <nav ref={navRef} className="scrollbar-tipis relative z-[3] flex-1 overflow-y-auto pb-2.5 pt-4">
        {MENU[peran].map((grup) => (
          <div key={grup.judul}>
            <div className={cn('px-6 pb-2 pt-3.5 text-[10.5px] font-semibold tracking-[0.06em] text-white/60', ciut && 'lg:hidden')}>
              {grup.judul}
            </div>
            {ciut && <div className="mx-5 my-2 hidden h-px bg-white/15 lg:block" />}
            {grup.item.map((item) => {
              const Glif = Ikon[item.ikon as NamaIkon]
              const tanda =
                peran === 'user' && item.id === 'lembur'
                  ? angka(menunggu.length)
                  : pengawas && item.id === 'log'
                    ? angka(logHariIni.data.length)
                    : pengawas && item.id === 'kendala'
                      ? angka(kendalaBaru.data.length)
                      : item.tanda
              return (
                <NavLink
                  key={item.id}
                  end={item.path === ''}
                  to={item.path ? `${akar}/${item.path}` : akar}
                  onClick={onTutup}
                  title={ciut ? item.label : undefined}
                  className={({ isActive }) =>
                    cn(
                      'mb-[3px] mr-3 flex items-center gap-3 rounded-r-full py-2.5 pl-6 pr-4 text-[13.5px] no-underline transition-colors',
                      isActive
                        ? 'font-bold text-hijau-tua'
                        : 'font-medium text-white/90 hover:bg-white/10 hover:text-white',
                      ciut && 'lg:mr-2 lg:justify-center lg:rounded-full lg:pl-0 lg:pr-0',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Glif className={cn('flex-none', isActive ? 'text-hijau' : 'opacity-85')} />
                      <span className={cn(ciut && 'lg:hidden')}>{item.label}</span>
                      {tanda && (
                        <i
                          className={cn(
                            'num ml-auto grid h-5 min-w-[20px] place-items-center rounded-full px-1.5 text-[11px] font-bold not-italic',
                            isActive ? 'bg-hijau text-white' : 'bg-emas text-ink-deep',
                            ciut && 'lg:hidden',
                          )}
                        >
                          {tanda}
                        </i>
                      )}
                    </>
                  )}
                </NavLink>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Kartu akun — tombol ciutkan diletakkan tepat di atasnya */}
      <div className="relative z-[3] border-t border-white/20 p-3.5">
        {/* Tombol ciutkan/buka — hanya tampil di layar besar */}
        <div className={cn('mb-2 hidden justify-end lg:flex', ciut && 'lg:justify-center')}>
          <button
            type="button"
            onClick={onCiut}
            aria-label={ciut ? 'Buka sidebar' : 'Ciutkan sidebar'}
            title={ciut ? 'Buka sidebar' : 'Ciutkan sidebar'}
            className="grid h-7 w-7 place-items-center rounded-full border border-white/20 bg-white/10 text-white/80 transition hover:bg-white/20 hover:text-white"
          >
            <Ikon.Chevron size={15} className={cn('transition-transform', !ciut && 'rotate-180')} />
          </button>
        </div>
        <div className={cn('flex items-center gap-3 rounded-[13px] bg-[rgba(4,40,20,.24)] p-2.5', ciut && 'lg:flex-col lg:gap-2')}>
          <span
            className="grid h-9 w-9 flex-none place-items-center overflow-hidden rounded-[11px] text-[13px] font-bold"
            style={{
              background: akun?.emas
                ? 'linear-gradient(135deg,#F2BE26,#DE7B2C)'
                : 'linear-gradient(135deg,#24985C,#145D31)',
              color: akun?.emas ? '#072932' : '#fff',
            }}
          >
            {akun?.foto ? <img src={akun.foto} alt="" className="h-full w-full object-cover" /> : akun?.inisial}
          </span>
          <div className={cn('min-w-0', ciut && 'lg:hidden')}>
            <b className="block truncate text-[12.5px] font-semibold text-white">{akun?.nama}</b>
            <span className="block text-[10.5px] text-white/70">{akun?.peran}</span>
          </div>
          <button
            type="button"
            onClick={keluar}
            aria-label="Keluar"
            title={ciut ? 'Keluar' : undefined}
            className={cn('ml-auto p-1 text-white/75 hover:text-emas', ciut && 'lg:ml-0')}
          >
            <Ikon.Keluar size={17} />
          </button>
        </div>
      </div>
    </aside>
  )
}
