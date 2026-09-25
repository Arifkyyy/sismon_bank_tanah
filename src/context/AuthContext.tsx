import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { ambilToken, api, hapusToken, simpanToken } from '@/lib/api'
import type { Akun, Peran } from '@/types'

interface NilaiAuth {
  peran: Peran | null
  akun: Akun | null
  /** true selama sesi lama sedang dipulihkan dari token saat halaman dibuka */
  memulihkan: boolean
  /** Login ke backend. Melempar galat berisi pesan kalau gagal. Mengembalikan peran. */
  masuk: (email: string, sandi: string, ingat: boolean) => Promise<Peran>
  keluar: () => void
  /** Mengganti data akun di sesi, mis. setelah profil diubah. */
  perbaruiAkun: (akun: Akun) => void
}

interface Sesi {
  peran: Peran
  akun: Akun
}

const Konteks = createContext<NilaiAuth | null>(null)

/**
 * Menyimpan siapa yang sedang login. Tokennya disimpan oleh lib/api.ts;
 * di sini hanya peran dan data akunnya. Saat halaman dimuat ulang, sesi
 * dipulihkan dengan menanyakan GET /api/auth/saya memakai token yang ada.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [sesi, setSesi] = useState<Sesi | null>(null)
  const [memulihkan, setMemulihkan] = useState(() => ambilToken() !== null)

  useEffect(() => {
    if (!ambilToken()) return
    api<Sesi>('/api/auth/saya')
      .then(setSesi)
      .catch(() => hapusToken())
      .finally(() => setMemulihkan(false))
  }, [])

  // lib/api.ts memancarkan 'sesi-habis' bila backend menolak token.
  useEffect(() => {
    const habis = () => setSesi(null)
    window.addEventListener('sesi-habis', habis)
    return () => window.removeEventListener('sesi-habis', habis)
  }, [])

  const masuk = useCallback(async (email: string, sandi: string, ingat: boolean) => {
    const hasil = await api<Sesi & { token: string }>('/api/auth/masuk', 'POST', { email, sandi })
    simpanToken(hasil.token, ingat)
    setSesi({ peran: hasil.peran, akun: hasil.akun })
    return hasil.peran
  }, [])

  const keluar = useCallback(() => {
    hapusToken()
    setSesi(null)
  }, [])

  const perbaruiAkun = useCallback((akun: Akun) => {
    setSesi((s) => (s ? { ...s, akun } : s))
  }, [])

  const nilai = useMemo<NilaiAuth>(
    () => ({
      peran: sesi?.peran ?? null,
      akun: sesi?.akun ?? null,
      memulihkan,
      masuk,
      keluar,
      perbaruiAkun,
    }),
    [sesi, memulihkan, masuk, keluar, perbaruiAkun],
  )

  return <Konteks.Provider value={nilai}>{children}</Konteks.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): NilaiAuth {
  const nilai = useContext(Konteks)
  if (!nilai) throw new Error('useAuth harus dipakai di dalam <AuthProvider>')
  return nilai
}
