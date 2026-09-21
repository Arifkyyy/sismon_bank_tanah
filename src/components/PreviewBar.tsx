import { useLocation, useNavigate } from 'react-router-dom'
import { AKAR } from '@/config/menu'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/util'
import type { Peran } from '@/types'

const PERAN: { id: Peran; label: string }[] = [
  { id: 'superadmin', label: 'Super Admin' },
  { id: 'admin', label: 'Admin' },
  { id: 'user', label: 'Petugas' },
]

/**
 * Bar melayang untuk berpindah peran cepat saat demo.
 * HAPUS komponen ini sebelum aplikasi dipakai sungguhan — di produksi
 * peran ditentukan oleh hasil login, bukan oleh tombol.
 */
export function PreviewBar() {
  const { peran, masuk, keluar } = useAuth()
  const navigate = useNavigate()
  const lokasi = useLocation()
  const diSistemDesain = lokasi.pathname.endsWith('/sistem-desain')

  function ke(p: Peran) {
    masuk(p)
    navigate(AKAR[p])
  }

  const gaya = (aktif: boolean) =>
    cn(
      'whitespace-nowrap rounded-full px-3 py-2 text-[12px] font-semibold transition lg:px-[15px] lg:text-[12.5px]',
      aktif ? 'bg-hijau text-white' : 'text-white/70 hover:bg-white/10 hover:text-white',
    )

  return (
    <div className="fixed bottom-2.5 left-2.5 right-2.5 z-[90] mx-auto flex w-fit max-w-[calc(100%-20px)] items-center gap-1.5 overflow-x-auto rounded-full bg-ink-deep/95 p-1.5 text-white shadow-[0_18px_44px_-14px_rgba(7,41,50,.6)] backdrop-blur lg:bottom-4">
      <span className="hidden px-3 text-[11.5px] tracking-wide text-white/55 lg:block">Pratinjau</span>

      <button
        type="button"
        onClick={() => {
          keluar()
          navigate('/masuk')
        }}
        aria-pressed={!peran}
        className={gaya(!peran)}
      >
        Login
      </button>

      <span className="h-5 w-px flex-none bg-white/15" />

      {PERAN.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => ke(p.id)}
          aria-pressed={peran === p.id && !diSistemDesain}
          className={gaya(peran === p.id && !diSistemDesain)}
        >
          {p.label}
        </button>
      ))}

      <span className="h-5 w-px flex-none bg-white/15" />

      <button
        type="button"
        onClick={() => {
          const p = peran ?? 'admin'
          masuk(p)
          navigate(`${AKAR[p]}/sistem-desain`)
        }}
        aria-pressed={diSistemDesain}
        className={gaya(diSistemDesain)}
      >
        Sistem Desain
      </button>
    </div>
  )
}
