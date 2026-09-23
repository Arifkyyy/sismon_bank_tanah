import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useAuth } from '@/context/AuthContext'
import { api, pesanGalat } from '@/lib/api'
import { useApi } from '@/lib/useApi'
import type { DrafLembur, Lembur, Petugas } from '@/types'

/** Isi draf tanpa id — bentuk yang dipakai formulir admin. */
export type IsiDraf = Omit<DrafLembur, 'id'>

interface NilaiLembur {
  daftar: Lembur[]
  /** penugasan yang belum dijawab; backend sudah menyaring sesuai peran */
  menunggu: Lembur[]
  /** penugasan yang sudah dijawab */
  riwayat: Lembur[]
  memuat: boolean
  /** galat saat mengambil daftar */
  galat: string | null
  muat: () => void
  /** galat dari aksi terakhir (terima/tolak/simpan/kirim/hapus) */
  galatAksi: string | null
  bersihkanGalatAksi: () => void
  terima: (id: string) => Promise<boolean>
  tolak: (id: string, alasan: string) => Promise<boolean>
  /** antrean draf milik admin; kosong untuk petugas */
  pending: DrafLembur[]
  /** daftar petugas, dipakai mencocokkan nama pada draf dengan petugasId */
  petugas: Petugas[]
  tambahPending: (isi: IsiDraf) => Promise<boolean>
  ubahPending: (id: string, isi: IsiDraf) => Promise<boolean>
  hapusPending: (id: string) => Promise<boolean>
  kirimPending: (id: string) => Promise<boolean>
}

const Konteks = createContext<NilaiLembur | null>(null)

/**
 * Seluruh data penugasan lembur berasal dari backend.
 *
 * - `GET /api/lembur` sudah menyaring sendiri: admin menerima semua petugas,
 *   petugas hanya menerima miliknya. Jadi tidak ada penyaringan di browser.
 * - `pending` (draf) hanya diambil untuk admin; endpointnya memang ditolak
 *   untuk peran petugas.
 * - Setiap aksi memanggil API lalu memuat ulang daftarnya, dan mengembalikan
 *   true/false supaya formulir tahu boleh dikosongkan atau tidak.
 */
export function LemburProvider({ children }: { children: ReactNode }) {
  const { peran } = useAuth()
  const masuk = peran !== null
  const pengawas = peran === 'admin' || peran === 'superadmin'

  const { data: daftar, memuat, galat, muat } = useApi<Lembur[]>(masuk ? '/api/lembur' : null, [])
  const { data: pending, muat: muatPending } = useApi<DrafLembur[]>(
    pengawas ? '/api/lembur/draf' : null,
    [],
  )
  const { data: petugas } = useApi<Petugas[]>(pengawas ? '/api/petugas' : null, [])

  const [galatAksi, setGalatAksi] = useState<string | null>(null)
  const bersihkanGalatAksi = useCallback(() => setGalatAksi(null), [])

  /**
   * Pembungkus satu aksi: jalankan, muat ulang yang perlu, simpan pesan galat
   * bila gagal. Semua aksi di bawah memakai pola yang sama.
   */
  const jalankan = useCallback(
    async (aksi: () => Promise<unknown>, muatUlang: (() => void)[]): Promise<boolean> => {
      setGalatAksi(null)
      try {
        await aksi()
        muatUlang.forEach((f) => f())
        return true
      } catch (e) {
        setGalatAksi(pesanGalat(e))
        return false
      }
    },
    [],
  )

  const terima = useCallback(
    (id: string) => jalankan(() => api(`/api/lembur/${id}/terima`, 'POST'), [muat]),
    [jalankan, muat],
  )

  const tolak = useCallback(
    (id: string, alasan: string) =>
      jalankan(() => api(`/api/lembur/${id}/tolak`, 'POST', { alasan }), [muat]),
    [jalankan, muat],
  )

  /**
   * Formulir memakai nama petugas, backend memakai petugasId. Nama yang tidak
   * ada di daftar petugas ditolak di sini supaya galatnya jelas, bukan berupa
   * 422 dari server.
   */
  const keKirimanDraf = useCallback(
    (isi: IsiDraf) => {
      const cocok = petugas.find((p) => p.nama === isi.nama)
      if (isi.nama && !cocok) throw new Error(`Petugas "${isi.nama}" tidak ada di data petugas.`)
      return {
        petugasId: cocok?.id ?? null,
        jabatan: isi.jabatan,
        tanggal: isi.tanggal,
        mulai: isi.mulai,
        selesai: isi.selesai,
        keterangan: isi.keterangan,
      }
    },
    [petugas],
  )

  const tambahPending = useCallback(
    (isi: IsiDraf) =>
      jalankan(() => api('/api/lembur/draf', 'POST', keKirimanDraf(isi)), [muatPending]),
    [jalankan, keKirimanDraf, muatPending],
  )

  const ubahPending = useCallback(
    (id: string, isi: IsiDraf) =>
      jalankan(() => api(`/api/lembur/draf/${id}`, 'PUT', keKirimanDraf(isi)), [muatPending]),
    [jalankan, keKirimanDraf, muatPending],
  )

  const hapusPending = useCallback(
    (id: string) => jalankan(() => api(`/api/lembur/draf/${id}`, 'DELETE'), [muatPending]),
    [jalankan, muatPending],
  )

  // Draf pindah ke daftar penugasan, jadi keduanya dimuat ulang.
  const kirimPending = useCallback(
    (id: string) =>
      jalankan(() => api(`/api/lembur/draf/${id}/kirim`, 'POST'), [muatPending, muat]),
    [jalankan, muatPending, muat],
  )

  const nilai = useMemo<NilaiLembur>(
    () => ({
      daftar,
      menunggu: daftar.filter((l) => l.status === 'Menunggu'),
      riwayat: daftar.filter((l) => l.status !== 'Menunggu'),
      memuat,
      galat,
      muat,
      galatAksi,
      bersihkanGalatAksi,
      terima,
      tolak,
      pending,
      petugas,
      tambahPending,
      ubahPending,
      hapusPending,
      kirimPending,
    }),
    [
      daftar,
      memuat,
      galat,
      muat,
      galatAksi,
      bersihkanGalatAksi,
      terima,
      tolak,
      pending,
      petugas,
      tambahPending,
      ubahPending,
      hapusPending,
      kirimPending,
    ],
  )

  return <Konteks.Provider value={nilai}>{children}</Konteks.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLembur(): NilaiLembur {
  const nilai = useContext(Konteks)
  if (!nilai) throw new Error('useLembur harus dipakai di dalam <LemburProvider>')
  return nilai
}

/** Penugasan milik petugas yang sedang masuk, beserta cara menjawabnya. */
interface LemburSaya {
  menunggu: Lembur[]
  riwayat: Lembur[]
  memuat: boolean
  galat: string | null
  muat: () => void
  galatAksi: string | null
  terima: (id: string) => Promise<boolean>
  tolak: (id: string, alasan: string) => Promise<boolean>
}

/**
 * Sudut pandang petugas. Penyaringan per petugas dilakukan backend lewat token,
 * jadi di sini tidak ada penyaringan lagi — hook ini tetap ada supaya halaman
 * petugas punya pintu masuk sendiri yang tidak menyentuh data draf admin.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useLemburSaya(): LemburSaya {
  const { menunggu, riwayat, memuat, galat, muat, galatAksi, terima, tolak } = useLembur()
  return { menunggu, riwayat, memuat, galat, muat, galatAksi, terima, tolak }
}
