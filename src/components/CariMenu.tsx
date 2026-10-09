import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AKAR, JUDUL, MENU } from '@/config/menu'
import { Ikon } from '@/lib/ikon'
import type { NamaIkon } from '@/lib/ikon'
import { cn } from '@/lib/util'
import type { Peran } from '@/types'

/**
 * Kolom pencarian di topbar: mencari menu milik peran yang sedang masuk
 * (berdasarkan nama menu dan keterangannya), lalu membuka halamannya.
 * Enter membuka hasil yang disorot; panah atas/bawah memindah sorotan.
 */
export function CariMenu({ peran }: { peran: Peran }) {
  const navigate = useNavigate()
  const lokasi = useLocation()
  const [teks, setTeks] = useState('')
  const [buka, setBuka] = useState(false)
  const [sorot, setSorot] = useState(0)
  const wadah = useRef<HTMLDivElement>(null)

  const semua = useMemo(
    () =>
      MENU[peran].flatMap((g) =>
        g.item.map((it) => ({
          ...it,
          grup: g.judul,
          // Keterangan dashboard di JUDUL berisi tanggal tetap, jadi diganti di sini.
          ket: it.path === '' ? 'Halaman utama dan ringkasan hari ini' : (JUDUL[it.path]?.[1] ?? ''),
        })),
      ),
    [peran],
  )

  const kata = teks.trim().toLowerCase()
  const hasil = kata
    ? semua.filter((it) => `${it.label} ${it.ket} ${it.grup}`.toLowerCase().includes(kata))
    : []

  // Ditutup saat pindah halaman atau klik di luar.
  useEffect(() => {
    setBuka(false)
    setTeks('')
  }, [lokasi.pathname])

  useEffect(() => {
    if (!buka) return
    const klik = (e: MouseEvent) => {
      if (!wadah.current?.contains(e.target as Node)) setBuka(false)
    }
    document.addEventListener('mousedown', klik)
    return () => document.removeEventListener('mousedown', klik)
  }, [buka])

  function pergi(path: string) {
    navigate(path ? `${AKAR[peran]}/${path}` : AKAR[peran])
    setBuka(false)
    setTeks('')
  }

  return (
    <div ref={wadah} className="relative flex min-w-0 flex-1 items-center sm:max-w-[430px]">
      <span className="pointer-events-none absolute left-4 text-teks-samar">
        <Ikon.Cari size={17} />
      </span>
      <input
        type="search"
        placeholder="Cari menu, mis. lembur…"
        aria-label="Cari menu"
        value={teks}
        onChange={(e) => {
          setTeks(e.target.value)
          setBuka(true)
          setSorot(0)
        }}
        onFocus={() => setBuka(true)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setBuka(false)
          else if (e.key === 'ArrowDown') {
            e.preventDefault()
            setSorot((i) => Math.min(i + 1, Math.max(hasil.length - 1, 0)))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setSorot((i) => Math.max(i - 1, 0))
          } else if (e.key === 'Enter' && hasil[sorot]) {
            e.preventDefault()
            pergi(hasil[sorot].path)
          }
        }}
        className="h-11 w-full rounded-full border border-transparent bg-[#EEF2EF] pl-11 pr-4 text-[13.5px] text-teks placeholder:text-teks-samar focus:border-hijau/40 focus:bg-white focus:outline-none focus:ring-[3px] focus:ring-hijau/15"
      />

      {buka && kata && (
        <div className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-2xl border border-garis bg-white shadow-naik">
          {hasil.length === 0 ? (
            <p className="m-0 px-4 py-3.5 text-[12.5px] text-teks-lembut">Tidak ada menu yang cocok dengan “{teks.trim()}”.</p>
          ) : (
            <ul className="m-0 max-h-[60vh] list-none overflow-y-auto p-1.5">
              {hasil.map((it, i) => {
                const Glif = Ikon[it.ikon as NamaIkon]
                return (
                  <li key={it.id}>
                    <button
                      type="button"
                      onMouseEnter={() => setSorot(i)}
                      onClick={() => pergi(it.path)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left',
                        i === sorot ? 'bg-[#EEF5F0]' : 'hover:bg-[#F7FAF8]',
                      )}
                    >
                      <span className="grid h-8 w-8 flex-none place-items-center rounded-lg bg-hijau-lembut text-hijau-tua">
                        {Glif && <Glif size={15} />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <b className="block truncate text-[13px] font-semibold text-ink">{it.label}</b>
                        {it.ket && <span className="block truncate text-[11.5px] text-teks-lembut">{it.ket}</span>}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
