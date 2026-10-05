import { useState } from 'react'
import { StatusData } from '@/components/StatusData'
import { KartuTukar } from '@/components/shift/KartuTukar'
import { ModalAlasan } from '@/components/shift/ModalAlasan'
import { IsiKartu, Kartu, KopKartu, Segmen, Tombol } from '@/components/ui'
import { useKonfirmasi } from '@/context/KonfirmasiContext'
import { api, pesanGalat, query } from '@/lib/api'
import { Ikon } from '@/lib/ikon'
import { useApi } from '@/lib/useApi'
import type { StatusTukar, TukarShift } from '@/types'

const SARINGAN: (StatusTukar | 'Semua')[] = [
  'Menunggu Admin', 'Menunggu Rekan', 'Disetujui', 'Ditolak', 'Dibatalkan', 'Semua',
]

/** Tab "Permintaan Tukar": admin menyetujui atau menolak (wajib alasan) permintaan yang sudah disetujui rekan. */
export function TabTukar() {
  const konfirmasi = useKonfirmasi()
  const [status, setStatus] = useState<StatusTukar | 'Semua'>('Menunggu Admin')
  const daftar = useApi<TukarShift[]>(
    `/api/shift/tukar${query({ status: status === 'Semua' ? '' : status })}`,
    [],
  )
  const [tolak, setTolak] = useState<TukarShift | null>(null)
  const [sibuk, setSibuk] = useState<number | null>(null)
  const [pesan, setPesan] = useState<{ nada: 'baik' | 'buruk'; teks: string } | null>(null)

  function segarkan() {
    void daftar.muat()
    window.dispatchEvent(new Event('shift-berubah'))
  }

  async function setujui(t: TukarShift) {
    const beda = t.pemohon.tanggal !== t.rekan.tanggal
    const ya = await konfirmasi({
      judul: 'Setujui tukar shift?',
      pesan: beda
        ? `Jadwal ${t.pemohon.nama} dan ${t.rekan.nama} pada ${t.pemohon.tanggalTeks} dan ${t.rekan.tanggalTeks} langsung saling ditukar.`
        : `Jadwal ${t.pemohon.nama} dan ${t.rekan.nama} pada ${t.pemohon.tanggalTeks} langsung saling ditukar.`,
      tombol: 'Setujui',
    })
    if (!ya) return
    setSibuk(t.id)
    setPesan(null)
    try {
      await api(`/api/shift/tukar/${t.id}/putuskan`, 'POST', { setuju: true })
      setPesan({ nada: 'baik', teks: `Tukar shift ${t.pemohon.nama} ⇄ ${t.rekan.nama} disetujui. Jadwal sudah diperbarui.` })
    } catch (e) {
      setPesan({ nada: 'buruk', teks: pesanGalat(e) })
    } finally {
      setSibuk(null)
      segarkan()
    }
  }

  return (
    <Kartu>
      <KopKartu
        judul="Permintaan tukar shift"
        sub="Admin memutuskan setelah rekan yang diajak menyetujui"
        aksi={
          <Tombol varian="hantu" kecil onClick={() => void daftar.muat()}>
            <Ikon.Putar size={14} /> Muat ulang
          </Tombol>
        }
      />
      <div className="scrollbar-lembut overflow-x-auto border-b border-garis px-5 py-3">
        <Segmen opsi={SARINGAN} nilai={status} onPilih={(v) => setStatus(v as StatusTukar | 'Semua')} />
      </div>
      <StatusData memuat={daftar.memuat && !daftar.data.length} galat={daftar.galat} onUlang={daftar.muat} />
      <IsiKartu className="grid gap-3">
        {pesan && (
          <div
            className={
              pesan.nada === 'baik'
                ? 'rounded-xl border border-hijau/30 bg-hijau-lembut px-3.5 py-2.5 text-[12.5px] text-hijau-tua'
                : 'rounded-xl border border-merah/30 bg-merah-lembut px-3.5 py-2.5 text-[12.5px] text-merah-teks'
            }
          >
            {pesan.teks}
          </div>
        )}
        {!daftar.memuat && !daftar.data.length && !daftar.galat && (
          <p className="m-0 py-8 text-center text-[12.5px] text-teks-samar">
            {status === 'Menunggu Admin' ? 'Tidak ada permintaan yang menunggu persetujuan.' : 'Tidak ada permintaan.'}
          </p>
        )}
        <div className="grid grid-cols-1 gap-3 2xl:grid-cols-2">
          {daftar.data.map((t) => (
            <KartuTukar
              key={t.id}
              tukar={t}
              aksi={
                t.status === 'Menunggu Admin' ? (
                  <>
                    <Tombol varian="bahaya" kecil onClick={() => setTolak(t)} disabled={sibuk === t.id}>
                      <Ikon.Silang size={14} /> Tolak
                    </Tombol>
                    <Tombol kecil onClick={() => void setujui(t)} disabled={sibuk === t.id}>
                      <Ikon.Centang size={14} /> Setujui
                    </Tombol>
                  </>
                ) : t.status === 'Menunggu Rekan' ? (
                  <span className="text-[11.5px] text-teks-samar">Menunggu jawaban {t.rekan.nama}</span>
                ) : undefined
              }
            />
          ))}
        </div>
      </IsiKartu>

      {tolak && (
        <ModalAlasan
          judul="Tolak permintaan tukar shift?"
          sub={`${tolak.pemohon.nama} ⇄ ${tolak.rekan.nama}. Alasannya dikirim ke kedua petugas.`}
          wajib
          tombol="Tolak"
          onTutup={() => setTolak(null)}
          onKirim={async (alasan) => {
            await api(`/api/shift/tukar/${tolak.id}/putuskan`, 'POST', { setuju: false, alasan })
            setPesan({ nada: 'baik', teks: `Permintaan ${tolak.pemohon.nama} ⇄ ${tolak.rekan.nama} ditolak.` })
            segarkan()
          }}
        />
      )}
    </Kartu>
  )
}
