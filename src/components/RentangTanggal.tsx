import { useEffect, useRef, useState } from 'react'
import { Tombol } from '@/components/ui'
import { Ikon } from '@/lib/ikon'
import { awalBulan, BULAN, dariIso, formatRentang, HARI_MINI, jumlahHari, keIso } from '@/lib/tanggal'
import { cn } from '@/lib/util'

export interface Rentang {
  mulai: string
  sampai: string
}

/** Satu bulan kalender; tanggal dikirim balik sebagai ISO 'YYYY-MM-DD'. */
function Bulan({
  tahun,
  bulan,
  mulai,
  sampai,
  bayangan,
  onPilih,
  onSorot,
}: {
  tahun: number
  bulan: number
  mulai: string | null
  sampai: string | null
  bayangan: string | null
  onPilih: (iso: string) => void
  onSorot: (iso: string | null) => void
}) {
  const kosong = awalBulan(tahun, bulan)
  const total = jumlahHari(tahun, bulan)
  const hariIni = keIso(new Date())

  // Selama ujung kedua belum dipilih, rentang mengikuti kursor tetikus.
  const ujung = sampai ?? (mulai && bayangan && bayangan > mulai ? bayangan : null)

  return (
    <div className="min-w-[232px] flex-1">
      <div className="mb-2 text-center text-[13px] font-bold text-ink">
        {BULAN[bulan]} {tahun}
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {HARI_MINI.map((h) => (
          <div key={h} className="pb-1 text-center text-[10.5px] font-semibold text-teks-samar">
            {h}
          </div>
        ))}
        {Array.from({ length: kosong }, (_, i) => (
          <div key={`kosong-${i}`} />
        ))}
        {Array.from({ length: total }, (_, i) => {
          const iso = keIso(new Date(tahun, bulan, i + 1))
          const awal = iso === mulai
          const akhir = iso === ujung
          const diDalam = !!mulai && !!ujung && iso > mulai && iso < ujung
          const terpilih = awal || akhir

          return (
            <button
              key={iso}
              type="button"
              onClick={() => onPilih(iso)}
              onMouseEnter={() => onSorot(iso)}
              aria-pressed={terpilih}
              className={cn(
                'h-8 text-[12.5px] transition',
                // Sel di tengah rentang menyatu, ujungnya saja yang dibulatkan.
                diDalam && 'bg-hijau-lembut text-hijau-tua',
                terpilih && 'bg-hijau font-bold text-white',
                awal && !akhir && 'rounded-l-[9px]',
                akhir && !awal && 'rounded-r-[9px]',
                awal && akhir && 'rounded-[9px]',
                !terpilih && !diDalam && 'rounded-[9px] text-teks hover:bg-[#EBF1ED]',
                !terpilih && iso === hariIni && 'font-bold text-hijau ring-1 ring-inset ring-hijau/40',
              )}
            >
              {i + 1}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Pemilih rentang tanggal dua bulan.
 * Draf pilihan baru berlaku setelah tombol Terapkan ditekan.
 */
export function RentangTanggal({
  nilai,
  onPilih,
  className,
}: {
  nilai: Rentang | null
  onPilih: (r: Rentang) => void
  className?: string
}) {
  const [buka, setBuka] = useState(false)
  const [mulai, setMulai] = useState<string | null>(nilai?.mulai ?? null)
  const [sampai, setSampai] = useState<string | null>(nilai?.sampai ?? null)
  const [bayangan, setBayangan] = useState<string | null>(null)
  const [kursor, setKursor] = useState(() => {
    const t = nilai ? dariIso(nilai.mulai) : new Date()
    return { tahun: t.getFullYear(), bulan: t.getMonth() }
  })
  const wadah = useRef<HTMLDivElement>(null)

  // Klik di luar atau Escape menutup panel tanpa menyimpan draf.
  useEffect(() => {
    if (!buka) return
    function tutupDiLuar(e: MouseEvent) {
      if (!wadah.current?.contains(e.target as Node)) setBuka(false)
    }
    function tekanTombol(e: KeyboardEvent) {
      if (e.key === 'Escape') setBuka(false)
    }
    document.addEventListener('mousedown', tutupDiLuar)
    document.addEventListener('keydown', tekanTombol)
    return () => {
      document.removeEventListener('mousedown', tutupDiLuar)
      document.removeEventListener('keydown', tekanTombol)
    }
  }, [buka])

  function geser(arah: -1 | 1) {
    setKursor((k) => {
      const t = new Date(k.tahun, k.bulan + arah, 1)
      return { tahun: t.getFullYear(), bulan: t.getMonth() }
    })
  }

  function pilihTanggal(iso: string) {
    if (!mulai || sampai) {
      setMulai(iso)
      setSampai(null)
    } else if (iso < mulai) {
      // Klik mundur dibaca sebagai tanggal awal yang baru.
      setSampai(mulai)
      setMulai(iso)
    } else {
      setSampai(iso)
    }
  }

  function alihkanPanel() {
    if (!buka) {
      // Panel selalu dibuka ulang dari nilai yang sedang berlaku.
      setMulai(nilai?.mulai ?? null)
      setSampai(nilai?.sampai ?? null)
      setBayangan(null)
    }
    setBuka(!buka)
  }

  function terapkan() {
    if (!mulai) return
    onPilih({ mulai, sampai: sampai ?? mulai })
    setBuka(false)
  }

  const berikut = new Date(kursor.tahun, kursor.bulan + 1, 1)
  const label = nilai ? formatRentang(nilai.mulai, nilai.sampai) : 'Pilih Rentang Tanggal'

  return (
    <div ref={wadah} className={cn('relative', className)}>
      <button
        type="button"
        onClick={alihkanPanel}
        aria-expanded={buka}
        className={cn(
          'flex w-full items-center gap-2 rounded-[10px] border bg-white py-2.5 pl-3 pr-2.5 text-[13px] transition',
          buka ? 'border-hijau ring-[3px] ring-hijau/15' : 'border-garis-kuat hover:border-hijau',
        )}
      >
        <Ikon.Kalender size={15} className="flex-none text-teks-lembut" />
        <span className={cn('truncate', nilai ? 'font-semibold text-ink' : 'text-teks-lembut')}>{label}</span>
        <Ikon.Chevron
          size={14}
          className={cn('ml-auto flex-none text-teks-samar transition-transform', buka ? '-rotate-90' : 'rotate-90')}
        />
      </button>

      {buka && (
        <div className="absolute left-0 z-30 mt-2 w-[min(86vw,556px)] rounded-2xl border border-garis bg-white p-4 shadow-naik">
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              aria-label="Bulan sebelumnya"
              onClick={() => geser(-1)}
              className="grid h-8 w-8 place-items-center rounded-lg text-teks-lembut hover:bg-[#EBF1ED] hover:text-ink"
            >
              <Ikon.Chevron size={16} className="rotate-180" />
            </button>
            <b className="text-[13px] font-bold text-ink">Pilih Rentang Tanggal</b>
            <button
              type="button"
              aria-label="Bulan berikutnya"
              onClick={() => geser(1)}
              className="grid h-8 w-8 place-items-center rounded-lg text-teks-lembut hover:bg-[#EBF1ED] hover:text-ink"
            >
              <Ikon.Chevron size={16} />
            </button>
          </div>

          <div className="flex gap-5" onMouseLeave={() => setBayangan(null)}>
            <Bulan
              tahun={kursor.tahun}
              bulan={kursor.bulan}
              mulai={mulai}
              sampai={sampai}
              bayangan={bayangan}
              onPilih={pilihTanggal}
              onSorot={setBayangan}
            />
            <div className="hidden flex-1 sm:block">
              <Bulan
                tahun={berikut.getFullYear()}
                bulan={berikut.getMonth()}
                mulai={mulai}
                sampai={sampai}
                bayangan={bayangan}
                onPilih={pilihTanggal}
                onSorot={setBayangan}
              />
            </div>
          </div>

          <div className="mt-3 border-t border-garis pt-3 text-center text-[12px] text-teks-lembut">
            {mulai ? (sampai ? formatRentang(mulai, sampai) : 'Pilih tanggal akhir') : 'Pilih tanggal awal'}
          </div>

          <div className="mt-3 flex gap-2.5">
            <Tombol kecil lebar disabled={!mulai} onClick={terapkan} className="disabled:opacity-50">
              Terapkan
            </Tombol>
            <Tombol varian="hantu" kecil lebar onClick={() => setBuka(false)}>
              Batal
            </Tombol>
          </div>
        </div>
      )}
    </div>
  )
}
