import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { AKUN } from '@/data/mock'
import type { Akun, Peran } from '@/types'

interface NilaiAuth {
  peran: Peran | null
  akun: Akun | null
  masuk: (peran: Peran) => void
  keluar: () => void
}

const Konteks = createContext<NilaiAuth | null>(null)

/**
 * Menyimpan peran yang sedang aktif. Untuk produksi, ganti `masuk`
 * dengan pemanggilan API login dan simpan token di httpOnly cookie.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [peran, setPeran] = useState<Peran | null>(null)

  const masuk = useCallback((p: Peran) => setPeran(p), [])
  const keluar = useCallback(() => setPeran(null), [])

  const nilai = useMemo<NilaiAuth>(
    () => ({ peran, akun: peran ? AKUN[peran] : null, masuk, keluar }),
    [peran, masuk, keluar],
  )

  return <Konteks.Provider value={nilai}>{children}</Konteks.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): NilaiAuth {
  const nilai = useContext(Konteks)
  if (!nilai) throw new Error('useAuth harus dipakai di dalam <AuthProvider>')
  return nilai
}
