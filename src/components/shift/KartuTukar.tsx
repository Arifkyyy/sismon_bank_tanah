import type { ReactNode } from 'react'
import { KodeShift } from '@/components/shift/KodeShift'
import { Avatar } from '@/components/ui'
import { Ikon } from '@/lib/ikon'
import { WARNA_STATUS_TUKAR } from '@/lib/shift'
import { cn } from '@/lib/util'
import type { Jabatan, PihakTukar, TukarShift } from '@/types'

/** Satu permintaan tukar shift: kedua pihak, alasan, status, dan slot tombol aksi. */
export function KartuTukar({ tukar: t, aksi }: { tukar: TukarShift; aksi?: ReactNode }) {
  const bedaTanggal = t.pemohon.tanggal !== t.rekan.tanggal
  return (
    <div className="rounded-xl border border-garis bg-white">
      <div className="flex flex-wrap items-center gap-2 border-b border-garis px-4 py-2.5">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11.5px] font-semibold',
            WARNA_STATUS_TUKAR[t.status],
          )}
        >
          <i className="h-1.5 w-1.5 rounded-full bg-current" />
          {t.status}
        </span>
        <span className="text-[11.5px] text-teks-samar">
          {t.jabatan} · diajukan {t.dibuatPada}
        </span>
      </div>

      <div className="grid grid-cols-1 items-center gap-2 px-4 py-3 sm:grid-cols-[1fr_auto_1fr]">
        <Pihak pihak={t.pemohon} jabatan={t.jabatan} label={t.peranSaya === 'pemohon' ? 'Anda (pengaju)' : 'Pengaju'} />
        <span className="mx-auto grid h-8 w-8 rotate-90 place-items-center rounded-full bg-kertas text-teks-lembut sm:rotate-0">
          <Ikon.Tukar size={16} />
        </span>
        <Pihak pihak={t.rekan} jabatan={t.jabatan} label={t.peranSaya === 'rekan' ? 'Anda (rekan)' : 'Rekan'} />
      </div>

      <div className="grid gap-2 px-4 pb-3.5 text-[12.5px] leading-relaxed">
        {bedaTanggal && t.status !== 'Disetujui' && (
          <p className="m-0 text-[11.5px] text-teks-samar">
            Bila disetujui, jadwal keduanya pada {t.pemohon.tanggalTeks} dan {t.rekan.tanggalTeks} saling ditukar.
          </p>
        )}
        <p className="m-0 text-teks">
          <span className="text-teks-lembut">Alasan: </span>“{t.alasan}”
        </p>
        <Riwayat tukar={t} />
      </div>

      {aksi && (
        <div className="flex flex-wrap justify-end gap-2 rounded-b-xl border-t border-garis bg-[#FAFCFB] px-4 py-2.5">
          {aksi}
        </div>
      )}
    </div>
  )
}

function Pihak({ pihak: p, jabatan, label }: { pihak: PihakTukar; jabatan: Jabatan; label: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5 rounded-xl bg-[#FAFCFB] px-3 py-2.5">
      <Avatar nama={p.nama} jabatan={jabatan} foto={p.fotoProfil} ukuran={32} />
      <div className="min-w-0 flex-1">
        <span className="block text-[10.5px] font-semibold uppercase tracking-wide text-teks-samar">{label}</span>
        <b className="block truncate text-[13px] font-semibold text-ink">{p.nama}</b>
        <span className="block text-[11.5px] text-teks-lembut">
          {p.hari}, {p.tanggalTeks}
        </span>
      </div>
      <div className="flex flex-none flex-col items-center gap-0.5">
        <KodeShift shift={p.shift} ukuran={30} />
        <span className="max-w-[86px] truncate text-[10.5px] text-teks-samar">{p.shift.rentang ?? p.shift.nama}</span>
      </div>
    </div>
  )
}

/** Jejak keputusan: jawaban rekan, keputusan admin, atau alasan batal. */
function Riwayat({ tukar: t }: { tukar: TukarShift }) {
  const baris: { teks: string; nada: 'baik' | 'buruk' | 'biasa' }[] = []
  if (t.dijawabRekanPada && t.ditolakOleh !== 'rekan') {
    baris.push({ teks: `${t.rekan.nama} setuju · ${t.dijawabRekanPada}`, nada: 'baik' })
  }
  if (t.status === 'Ditolak') {
    const oleh = t.ditolakOleh === 'admin' ? (t.diputusOleh ?? 'Admin') : t.rekan.nama
    const waktu = t.ditolakOleh === 'admin' ? t.diputusPada : t.dijawabRekanPada
    baris.push({
      teks: `Ditolak ${oleh}${waktu ? ` · ${waktu}` : ''}${t.alasanTolak ? ` — “${t.alasanTolak}”` : ''}`,
      nada: 'buruk',
    })
  }
  if (t.status === 'Disetujui') {
    baris.push({ teks: `Disetujui ${t.diputusOleh ?? 'admin'} · ${t.diputusPada ?? ''} — jadwal sudah ditukar`, nada: 'baik' })
  }
  if (t.status === 'Dibatalkan') {
    baris.push({ teks: `${t.catatanBatal ?? 'Dibatalkan'} · ${t.diperbaruiPada}`, nada: 'biasa' })
  }
  if (!baris.length) return null
  return (
    <ul className="m-0 grid list-none gap-1 p-0 text-[11.5px]">
      {baris.map((b) => (
        <li
          key={b.teks}
          className={cn(
            'flex items-start gap-1.5',
            b.nada === 'baik' ? 'text-hijau-tua' : b.nada === 'buruk' ? 'text-merah-teks' : 'text-teks-lembut',
          )}
        >
          <span className="mt-px flex-none">
            {b.nada === 'baik' ? <Ikon.Centang size={13} /> : b.nada === 'buruk' ? <Ikon.Silang size={13} /> : <Ikon.Info size={13} />}
          </span>
          {b.teks}
        </li>
      ))}
    </ul>
  )
}
