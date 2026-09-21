import { StatCard } from '@/components/StatCard'
import { Avatar, Pil, Tombol } from '@/components/ui'
import { LEMBUR } from '@/data/mock'
import { Ikon } from '@/lib/ikon'
import { cn } from '@/lib/util'
import type { Lembur } from '@/types'

/** Kartu satu penugasan lembur, dipakai juga di dashboard petugas. */
export function KartuLembur({ lembur }: { lembur: Lembur }) {
  const menunggu = lembur.status === 'Menunggu'
  const ditolak = lembur.status === 'Ditolak'

  return (
    <div className="overflow-hidden rounded-kartu border border-garis bg-white shadow-kartu">
      <div
        className={cn(
          'h-1',
          menunggu ? 'bg-gradient-to-r from-emas to-tanah' : ditolak ? 'bg-garis-kuat' : 'bg-hijau',
        )}
      />
      <div className="px-5 py-4.5">
        <div className="mb-4 flex items-center gap-3">
          <Avatar nama="Rahmat Hidayat" jabatan="Security" />
          <div className="min-w-0 flex-1">
            <b className="block text-[13.5px] font-semibold text-ink">Rahmat Hidayat</b>
            <span className="text-[11.5px] text-teks-samar">Admin · Bagian Pengelolaan Gedung</span>
          </div>
          <Pil status={lembur.status} />
        </div>

        <p className="m-0 mb-3.5 text-[13px] leading-relaxed text-teks-lembut">{lembur.keterangan}</p>

        <div className="grid grid-cols-1 gap-3 rounded-xl border border-garis bg-[#F7FAF8] p-3.5 sm:grid-cols-2">
          {[
            ['Tanggal', lembur.tanggal],
            ['Rentang jam', lembur.rentang],
            ['Total lembur', lembur.total],
            ['Jabatan', lembur.jabatan],
          ].map(([label, nilai]) => (
            <div key={label}>
              <span className="mb-0.5 block text-[11px] text-teks-samar">{label}</span>
              <b className="num text-[13px] font-semibold text-ink">{nilai}</b>
            </div>
          ))}
        </div>

        {menunggu ? (
          <div className="mt-3.5 flex gap-2.5">
            <Tombol varian="hantu" className="flex-1">
              <Ikon.Silang size={15} /> Tolak
            </Tombol>
            <Tombol className="flex-1">
              <Ikon.Centang size={15} /> Terima
            </Tombol>
          </div>
        ) : (
          <p className="m-0 mt-3.5 text-xs text-teks-samar">
            Anda {ditolak ? 'menolak' : 'menerima'} penugasan ini pada {lembur.tanggal}.
          </p>
        )}
      </div>
    </div>
  )
}

export function LemburUser() {
  const perluDijawab = LEMBUR.filter((l) => l.status === 'Menunggu')
  const riwayat = LEMBUR.filter((l) => l.status !== 'Menunggu').slice(0, 2)

  return (
    <>
      <div className="grid grid-cols-1 gap-4.5 sm:grid-cols-3">
        <StatCard nama="Menunggu jawaban Anda" angka="1" nada="emas" ikon={<Ikon.Jam size={17} />} ket="Batas menjawab hari ini pukul 16.00" />
        <StatCard nama="Lembur diterima bulan ini" angka="3" ikon={<Ikon.Centang size={17} />} ket="Total 12 jam" />
        <StatCard nama="Perkiraan uang lembur" angka="Rp 540.000" nada="ink" ikon={<Ikon.Rekap size={17} />} ket="Dihitung dari tarif per jam" />
      </div>

      <div className="mb-3.5 mt-6 flex items-center gap-3">
        <h3 className="m-0 text-[15px] font-bold text-ink">Perlu Anda jawab</h3>
        <Pil status="Menunggu">{perluDijawab.length} penugasan</Pil>
      </div>
      <div className="grid grid-cols-1 gap-4.5 xl:grid-cols-2">
        {perluDijawab.map((l) => (
          <KartuLembur key={l.nama + l.tanggal} lembur={l} />
        ))}
      </div>

      <h3 className="mb-3.5 mt-6.5 text-[15px] font-bold text-ink">Riwayat penugasan</h3>
      <div className="grid grid-cols-1 gap-4.5 xl:grid-cols-2">
        {riwayat.map((l) => (
          <KartuLembur key={l.nama + l.tanggal} lembur={{ ...l, jabatan: 'Security' }} />
        ))}
      </div>
    </>
  )
}
