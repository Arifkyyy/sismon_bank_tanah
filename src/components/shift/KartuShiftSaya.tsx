import { Link } from 'react-router-dom'
import { StatusData } from '@/components/StatusData'
import { KodeShift } from '@/components/shift/KodeShift'
import { IsiKartu, Kartu, KopKartu, Tombol } from '@/components/ui'
import { AKAR } from '@/config/menu'
import { query } from '@/lib/api'
import { Ikon } from '@/lib/ikon'
import { labelJam } from '@/lib/shift'
import { keIso } from '@/lib/tanggal'
import { useApi } from '@/lib/useApi'
import type { JadwalSaya } from '@/types'

/** Kartu dashboard petugas: shift hari ini (besar) dan besok (kecil). */
export function KartuShiftSaya() {
  const kini = new Date()
  const geser = (n: number) => {
    const t = new Date(kini)
    t.setDate(t.getDate() + n)
    return keIso(t)
  }
  // Mulai kemarin: shift lintas hari yang dimulai kemarin bisa masih berjalan sekarang.
  const jadwal = useApi<JadwalSaya[]>(`/api/shift/saya${query({ dari: geser(-1), sampai: geser(1) })}`, [])
  const [kemarin, hariIni, besok] = jadwal.data.length === 3 ? jadwal.data : [undefined, undefined, undefined]

  const jamKini = `${String(kini.getHours()).padStart(2, '0')}:${String(kini.getMinutes()).padStart(2, '0')}`
  const masihBerjalan =
    kemarin?.shift?.selesai &&
    (kemarin.shift.lintasHari || kemarin.shift.duaPuluhEmpatJam) &&
    jamKini < kemarin.shift.selesai
      ? kemarin.shift
      : null

  return (
    <Kartu>
      <KopKartu
        judul="Shift hari ini"
        sub={hariIni ? `${hariIni.hari}, ${hariIni.tanggalTeks}` : undefined}
        aksi={
          <Link to={`${AKAR.user}/jadwal-saya`}>
            <Tombol varian="hantu" kecil>
              <Ikon.Kalender size={14} /> Jadwal saya
            </Tombol>
          </Link>
        }
      />
      <StatusData memuat={jadwal.memuat && !hariIni} galat={jadwal.galat} onUlang={jadwal.muat} />
      {hariIni && (
        <IsiKartu className="grid gap-3">
          {masihBerjalan && (
            <div className="flex items-center gap-2 rounded-xl bg-emas-lembut px-3 py-2 text-[12px] text-emas-teks">
              <Ikon.Jam size={14} className="flex-none" />
              Shift {masihBerjalan.nama} dari kemarin masih berjalan sampai {masihBerjalan.selesai?.replace(':', '.')}.
            </div>
          )}

          <div className="flex items-center gap-3.5">
            {hariIni.shift ? (
              <KodeShift shift={hariIni.shift} ukuran={52} className="rounded-xl" />
            ) : (
              <span className="grid h-[52px] w-[52px] flex-none place-items-center rounded-xl border border-dashed border-garis-kuat text-teks-samar">
                –
              </span>
            )}
            <div className="min-w-0">
              <b className="block text-[17px] font-bold tracking-[-0.01em] text-ink">
                {hariIni.shift?.nama ?? 'Belum dijadwalkan'}
              </b>
              <span className="num block text-[13px] text-teks-lembut">
                {hariIni.shift
                  ? hariIni.shift.rentang
                    ? `${hariIni.shift.rentang}${labelJam(hariIni.shift) ? ` · ${labelJam(hariIni.shift)}` : ''}`
                    : 'Tidak ada jam kerja'
                  : 'Hubungi admin bila Anda seharusnya bertugas.'}
              </span>
              {hariIni.tukar && (
                <span className="mt-1 inline-flex items-center gap-1 text-[11.5px] text-teks-lembut">
                  <Ikon.Tukar size={12} /> Hasil tukar shift
                </span>
              )}
            </div>
          </div>

          {besok && (
            <div className="flex items-center gap-2.5 rounded-xl border border-garis bg-[#FAFCFB] px-3 py-2">
              <span className="text-[11.5px] font-semibold text-teks-samar">Besok</span>
              {besok.shift ? <KodeShift shift={besok.shift} ukuran={24} /> : null}
              <span className="min-w-0 truncate text-[12.5px] text-teks">
                {besok.shift ? `${besok.shift.nama}${besok.shift.rentang ? ` · ${besok.shift.rentang}` : ''}` : 'Belum dijadwalkan'}
              </span>
            </div>
          )}
        </IsiKartu>
      )}
    </Kartu>
  )
}
