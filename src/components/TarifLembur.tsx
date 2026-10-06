import { useState } from 'react'
import { Modal } from '@/components/Modal'
import { InputRapi, Kolom, Tombol } from '@/components/ui'
import { Ikon } from '@/lib/ikon'
import { api, pesanGalat } from '@/lib/api'
import { useApi } from '@/lib/useApi'
import type { TarifLembur } from '@/types'

const rupiah = (n: number) => `Rp ${n.toLocaleString('id-ID')}`

/**
 * Tombol "Tarif per jam" beserta pop-up untuk mengubahnya. Tarif baru hanya
 * berlaku untuk penugasan yang dikirim sesudahnya — yang sudah terkirim
 * menyimpan tarifnya sendiri di backend.
 */
// Tombol dan modal pengaturan tarif dihapus atas permintaan — sensitif.
export function TombolTarifLembur() {
  return null
}
