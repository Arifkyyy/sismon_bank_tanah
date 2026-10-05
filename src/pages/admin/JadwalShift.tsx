import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { TabJadwal } from '@/components/shift/TabJadwal'
import { TabJenisShift } from '@/components/shift/TabJenisShift'
import { TabTukar } from '@/components/shift/TabTukar'
import { Segmen } from '@/components/ui'
import { query } from '@/lib/api'
import { useApi } from '@/lib/useApi'
import type { TukarShift } from '@/types'

const TAB = {
  jadwal: 'Jadwal',
  jenis: 'Jenis Shift',
  tukar: 'Permintaan Tukar',
} as const
type Tab = keyof typeof TAB

/**
 * Menu Jadwal Shift (admin & super admin). Tab yang dipilih disimpan di URL
 * (?tab=tukar) supaya notifikasi bisa langsung membuka tab yang tepat.
 */
export function JadwalShift() {
  const [param, setParam] = useSearchParams()
  const tab: Tab = (param.get('tab') as Tab) in TAB ? (param.get('tab') as Tab) : 'jadwal'

  // Angka di label tab Permintaan Tukar; ikut diperbarui saat ada keputusan.
  const menunggu = useApi<TukarShift[]>(`/api/shift/tukar${query({ status: 'Menunggu Admin' })}`, [])
  const muatMenunggu = menunggu.muat
  useEffect(() => {
    const segar = () => void muatMenunggu()
    window.addEventListener('shift-berubah', segar)
    return () => window.removeEventListener('shift-berubah', segar)
  }, [muatMenunggu])

  const label = (k: Tab) =>
    k === 'tukar' && menunggu.data.length ? `${TAB[k]} (${menunggu.data.length})` : TAB[k]
  const kunci = Object.keys(TAB) as Tab[]

  function pilih(teks: string) {
    const k = kunci.find((x) => label(x) === teks) ?? 'jadwal'
    setParam(k === 'jadwal' ? {} : { tab: k }, { replace: true })
  }

  return (
    <div className="grid gap-4.5">
      <div className="scrollbar-lembut -mx-1 overflow-x-auto px-1">
        <Segmen opsi={kunci.map(label)} nilai={label(tab)} onPilih={pilih} />
      </div>

      {tab === 'jadwal' && <TabJadwal />}
      {tab === 'jenis' && <TabJenisShift />}
      {tab === 'tukar' && <TabTukar />}
    </div>
  )
}
