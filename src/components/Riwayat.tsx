import type { CSSProperties, ReactNode } from 'react'
import { TumpukanFoto } from '@/components/Foto'
import { FotoKecil, Pil } from '@/components/ui'
import { Ikon } from '@/lib/ikon'
import { cn } from '@/lib/util'
import type { Status } from '@/types'

export interface PosRiwayat {
  id: string
  /** sudah terformat, mis. '15 Sep 2026' — dipakai sebagai kunci pengelompokan */
  tanggal: string
  hari: string
  jam: string
  keterangan: string
  status: Status
  /** foto asli hasil kamera */
  foto?: string[]
  /** varian placeholder untuk data contoh yang belum punya foto asli */
  fotoVarian?: 'a' | 'b' | 'c'
  /** penanda tambahan di kaki baris, mis. jam lembur */
  tanda?: ReactNode
}

/** Warna titik linimasa mengikuti arti status yang sama di seluruh aplikasi. */
const TITIK: Record<Status, string> = {
  Aktif: 'bg-hijau',
  Diterima: 'bg-hijau',
  Selesai: 'bg-hijau',
  Cuti: 'bg-emas',
  Diproses: 'bg-emas',
  Menunggu: 'bg-emas',
  Baru: 'bg-tanah',
  Ditolak: 'bg-merah',
  Nonaktif: 'bg-garis-kuat',
}

function kelompokkan(pos: PosRiwayat[]): [string, PosRiwayat[]][] {
  const urut: [string, PosRiwayat[]][] = []
  for (const p of pos) {
    const akhir = urut[urut.length - 1]
    if (akhir && akhir[0] === p.tanggal) akhir[1].push(p)
    else urut.push([p.tanggal, [p]])
  }
  return urut
}

/**
 * Riwayat sebagai linimasa per hari, bukan tabel: jam berjajar di rel kiri
 * sehingga urutan kejadian langsung terbaca, dan tiap baris muat dibaca
 * di layar ponsel tanpa geser ke samping.
 *
 * Mulai layar lebar isinya digulir di dalam kartu begitu melewati
 * `maksTinggi`, supaya riwayat yang menumpuk tidak memanjangkan halaman.
 * Di ponsel gulir dalam kartu itu dimatikan: jari jadi hanya menggulir satu
 * bidang — halamannya — dan kepala tanggal menempel di bawah topbar.
 */
export function LinimasaRiwayat({
  pos,
  kosong = 'Belum ada catatan.',
  maksTinggi = 460,
}: {
  pos: PosRiwayat[]
  kosong?: string
  /** batas tinggi area gulir (px) mulai layar lebar; 0 = tanpa gulir dalam */
  maksTinggi?: number
}) {
  if (pos.length === 0) {
    return (
      <div className="m-5 grid place-items-center rounded-2xl border border-dashed border-garis-kuat bg-[#FAFCFB] px-4 py-10 text-center">
        <p className="m-0 text-[12.5px] text-teks-samar">{kosong}</p>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'px-5 pb-5',
        maksTinggi > 0 &&
          'scrollbar-lembut lg:max-h-[var(--maks-tinggi)] lg:overflow-y-auto lg:overscroll-contain',
      )}
      style={maksTinggi ? ({ '--maks-tinggi': `${maksTinggi}px` } as CSSProperties) : undefined}
    >
      {kelompokkan(pos).map(([tanggal, item]) => (
        <section key={tanggal}>
          {/* Di ponsel menempel di bawah topbar, di layar lebar di tepi atas
              area gulir linimasa. */}
          <div className="sticky top-[var(--tinggi-topbar)] z-[5] -mx-5 flex items-center gap-2.5 bg-white/92 px-5 py-2.5 backdrop-blur lg:top-0">
            <span className="num rounded-full bg-ink px-2.5 py-1 text-[11.5px] font-bold text-white">
              {tanggal}
            </span>
            <span className="text-[11.5px] font-semibold text-teks-lembut">{item[0].hari}</span>
            <span className="h-px flex-1 bg-garis" />
            <span className="num whitespace-nowrap text-[11.5px] font-semibold text-teks-samar">
              {item.length} catatan
            </span>
          </div>

          <ol className="m-0 list-none p-0">
            {item.map((p, i) => {
              const pertama = i === 0
              const terakhir = i === item.length - 1
              return (
                <li key={p.id} className="grid grid-cols-[44px_16px_minmax(0,1fr)] gap-x-2.5">
                  <span className="num pt-[18px] text-right text-[12px] font-bold text-ink">
                    {p.jam}
                  </span>

                  <span className="relative flex justify-center">
                    <span
                      aria-hidden
                      className={cn(
                        'absolute w-px bg-garis-kuat/70',
                        pertama && terakhir
                          ? 'hidden'
                          : pertama
                            ? 'bottom-0 top-[22px]'
                            : terakhir
                              ? 'top-0 h-[22px]'
                              : 'inset-y-0',
                      )}
                    />
                    <span
                      aria-hidden
                      className={cn(
                        'relative mt-[19px] h-2.5 w-2.5 flex-none rounded-full ring-4 ring-white',
                        TITIK[p.status],
                      )}
                    />
                  </span>

                  <div className="min-w-0 py-2">
                    <div className="rounded-xl border border-garis bg-white p-3 transition duration-200 hover:border-garis-kuat hover:shadow-kartu">
                      <div className="flex items-start gap-3">
                        <div className="flex-none">
                          {p.foto && p.foto.length > 0 ? (
                            <TumpukanFoto foto={p.foto} judul={`Foto ${p.tanggal} · ${p.jam}`} maksTampil={2} />
                          ) : (
                            <FotoKecil varian={p.fotoVarian ?? 'a'} />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="m-0 text-[12.5px] leading-relaxed text-teks-lembut">
                            {p.keterangan}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <Pil status={p.status} />
                            {p.tanda}
                            {p.foto && p.foto.length > 1 && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-[#F3F7F4] px-2 py-1 text-[11.5px] font-semibold text-teks-lembut">
                                <Ikon.Kamera size={11} />
                                <span className="num">{p.foto.length}</span> foto
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              )
            })}
          </ol>
        </section>
      ))}
    </div>
  )
}
