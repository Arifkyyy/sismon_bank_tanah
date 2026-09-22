import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { DRAF_LEMBUR, LEMBUR } from '@/data/mock'
import { formatJam, formatTanggal, lamaLembur } from '@/lib/tanggal'
import type { DrafLembur, Lembur } from '@/types'

interface NilaiLembur {
  daftar: Lembur[]
  /** penugasan yang belum dijawab petugas */
  menunggu: Lembur[]
  /** penugasan yang sudah dijawab, yang terbaru di depan */
  riwayat: Lembur[]
  terima: (id: string) => void
  tolak: (id: string, alasan: string) => void
  /** antrean penugasan yang masih dikoreksi admin, belum sampai ke petugas */
  pending: DrafLembur[]
  tambahPending: (isi: Omit<DrafLembur, 'id'>) => void
  ubahPending: (id: string, isi: Omit<DrafLembur, 'id'>) => void
  hapusPending: (id: string) => void
  /** memindahkan satu draf ke daftar penugasan; petugas baru melihatnya di sini */
  kirimPending: (id: string) => void
}

const Konteks = createContext<NilaiLembur | null>(null)

/** Cap waktu jawaban, mis. '15 Sep 2026 · 10.24'. */
function sekarang(): string {
  const t = new Date()
  const tanggal = t.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
  const jam = t.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace(':', '.')
  return `${tanggal} · ${jam}`
}

/** Draf admin → penugasan yang siap dibaca petugas. */
function keLembur(d: DrafLembur): Lembur {
  return {
    id: d.id,
    nama: d.nama,
    jabatan: d.jabatan,
    tanggal: formatTanggal(d.tanggal).tanggal,
    tanggalIso: d.tanggal,
    rentang: `${formatJam(d.mulai)} – ${formatJam(d.selesai)}`,
    total: lamaLembur(d.mulai, d.selesai),
    keterangan: d.keterangan,
    status: 'Menunggu',
  }
}

/**
 * Sumber data penugasan lembur yang dipakai bersama halaman petugas dan
 * halaman admin. Jawaban petugas langsung terlihat di tabel admin karena
 * keduanya membaca state yang sama.
 *
 * `pending` sengaja dipisah dari `daftar`: selama masih di `pending`, penugasan
 * hanya terlihat oleh admin sehingga bisa dikoreksi dulu. Ia baru muncul di
 * halaman petugas setelah `kirimPending`. State-nya disimpan di provider, bukan
 * di halaman, supaya antrean tidak hilang saat admin berpindah menu.
 *
 * Untuk produksi, ganti `terima`/`tolak`/`kirimPending` dengan pemanggilan API
 * lalu muat ulang daftarnya — bentuk datanya sudah sama.
 */
export function LemburProvider({ children }: { children: ReactNode }) {
  const [daftar, setDaftar] = useState<Lembur[]>(LEMBUR)
  const [pending, setPending] = useState<DrafLembur[]>(DRAF_LEMBUR)
  // Urutan jawaban terbaru; dipakai untuk menaruh penugasan yang baru saja
  // dijawab di paling depan riwayat.
  const [urutJawab, setUrutJawab] = useState<string[]>([])

  const jawab = useCallback((id: string, status: Lembur['status'], alasan?: string) => {
    setDaftar((list) =>
      list.map((l) => (l.id === id ? { ...l, status, alasan, dijawabPada: sekarang() } : l)),
    )
    setUrutJawab((urut) => [id, ...urut.filter((x) => x !== id)])
  }, [])

  const terima = useCallback((id: string) => jawab(id, 'Diterima'), [jawab])
  const tolak = useCallback((id: string, alasan: string) => jawab(id, 'Ditolak', alasan), [jawab])

  const tambahPending = useCallback((isi: Omit<DrafLembur, 'id'>) => {
    setPending((list) => [...list, { id: crypto.randomUUID(), ...isi }])
  }, [])

  const ubahPending = useCallback((id: string, isi: Omit<DrafLembur, 'id'>) => {
    setPending((list) => list.map((p) => (p.id === id ? { ...isi, id } : p)))
  }, [])

  const hapusPending = useCallback((id: string) => {
    setPending((list) => list.filter((p) => p.id !== id))
  }, [])

  // Draf dicari di luar updater: updater state bisa dijalankan dua kali oleh
  // StrictMode, dan penugasannya akan masuk dobel kalau `setDaftar` ada di dalamnya.
  const kirimPending = useCallback(
    (id: string) => {
      const draf = pending.find((p) => p.id === id)
      if (!draf) return
      setDaftar((isi) => [keLembur(draf), ...isi])
      setPending((list) => list.filter((p) => p.id !== id))
    },
    [pending],
  )

  const nilai = useMemo<NilaiLembur>(() => {
    const menunggu = daftar.filter((l) => l.status === 'Menunggu')
    const dijawab = daftar.filter((l) => l.status !== 'Menunggu')
    const peringkat = (l: Lembur) => {
      const i = urutJawab.indexOf(l.id)
      return i === -1 ? urutJawab.length : i
    }
    const riwayat = [...dijawab].sort((a, b) => peringkat(a) - peringkat(b))
    return {
      daftar,
      menunggu,
      riwayat,
      terima,
      tolak,
      pending,
      tambahPending,
      ubahPending,
      hapusPending,
      kirimPending,
    }
  }, [
    daftar,
    urutJawab,
    terima,
    tolak,
    pending,
    tambahPending,
    ubahPending,
    hapusPending,
    kirimPending,
  ])

  return <Konteks.Provider value={nilai}>{children}</Konteks.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLembur(): NilaiLembur {
  const nilai = useContext(Konteks)
  if (!nilai) throw new Error('useLembur harus dipakai di dalam <LemburProvider>')
  return nilai
}
