import { useCallback, useEffect, useRef, useState } from 'react'
import { api, pesanGalat } from '@/lib/api'

/**
 * Mengambil data dari backend saat komponen muncul, dan setiap kali `path`
 * berubah. Kirim `null` sebagai path untuk menunda pengambilan.
 *
 *   const { data: logbook, memuat, galat, muat } = useApi<Logbook[]>('/api/logbook', [])
 *
 * Panggil `muat()` untuk mengambil ulang, mis. setelah mengirim data baru.
 */
export function useApi<T>(path: string | null, awal: T) {
  const [data, setData] = useState<T>(awal)
  const [memuat, setMemuat] = useState(path !== null)
  const [galat, setGalat] = useState<string | null>(null)
  // Nomor permintaan terakhir; jawaban lama yang datang belakangan diabaikan.
  const nomor = useRef(0)

  const muat = useCallback(async () => {
    if (path === null) return
    const saya = ++nomor.current
    setMemuat(true)
    setGalat(null)
    try {
      const hasil = await api<T>(path)
      if (saya === nomor.current) setData(hasil)
    } catch (e) {
      if (saya === nomor.current) setGalat(pesanGalat(e))
    } finally {
      if (saya === nomor.current) setMemuat(false)
    }
  }, [path])

  useEffect(() => {
    void muat()
  }, [muat])

  return { data, setData, memuat, galat, muat }
}
