import { PilihRapi } from '@/components/ui'
import { query } from '@/lib/api'
import { useApi } from '@/lib/useApi'
import type { Jabatan, Petugas } from '@/types'

/**
 * Saringan "atas nama petugas" untuk halaman admin. Daftarnya mengikuti
 * jabatan yang sedang dipilih, dan petugas nonaktif tetap ada supaya
 * catatan lamanya masih bisa dicari.
 */
export function PilihPetugas({
  jabatan,
  nilai,
  onPilih,
}: {
  jabatan: Jabatan | 'Semua'
  nilai: Petugas | null
  onPilih: (p: Petugas | null) => void
}) {
  const { data: daftar } = useApi<Petugas[]>(
    `/api/petugas${query({ jabatan: jabatan === 'Semua' ? '' : jabatan })}`,
    [],
  )

  return (
    <PilihRapi
      aria-label="Nama petugas"
      value={nilai?.id ?? ''}
      onChange={(e) => onPilih(daftar.find((p) => p.id === Number(e.target.value)) ?? null)}
      className="min-w-[180px]"
    >
      <option value="">Semua petugas</option>
      {daftar.map((p) => (
        <option key={p.id} value={p.id}>
          {p.nama}
          {p.status === 'Aktif' ? '' : ` (${p.status})`}
        </option>
      ))}
    </PilihRapi>
  )
}
