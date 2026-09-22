import { useState } from 'react'
import { Modal } from '@/components/Modal'
import { StatCard } from '@/components/StatCard'
import { Avatar, AreaTeks, Kolom, Pil, Tombol } from '@/components/ui'
import { useLembur } from '@/context/LemburContext'
import { Ikon } from '@/lib/ikon'
import { cn } from '@/lib/util'
import type { Lembur } from '@/types'

/** Mengambil angka jam dari teks seperti '4 jam'. */
function jamDari(total: string): number {
  return Number.parseFloat(total.replace(',', '.')) || 0
}

/** Tarif contoh untuk perkiraan uang lembur. */
const TARIF_PER_JAM = 45000

/** Kartu satu penugasan lembur, dipakai juga di dashboard petugas. */
export function KartuLembur({
  lembur,
  onTerima,
  onTolak,
}: {
  lembur: Lembur
  onTerima?: (id: string) => void
  onTolak?: (l: Lembur) => void
}) {
  const menunggu = lembur.status === 'Menunggu'
  const ditolak = lembur.status === 'Ditolak'
  const bisaDijawab = menunggu && Boolean(onTerima && onTolak)

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

        {ditolak && lembur.alasan && (
          <div className="mt-3.5 rounded-xl border border-tanah/30 bg-tanah-lembut px-3.5 py-2.5 text-[12.5px] leading-relaxed text-tanah-teks">
            <b className="font-semibold">Alasan penolakan Anda:</b> {lembur.alasan}
          </div>
        )}

        {bisaDijawab ? (
          <div className="mt-3.5 flex gap-2.5">
            <Tombol varian="hantu" className="flex-1" onClick={() => onTolak?.(lembur)}>
              <Ikon.Silang size={15} /> Tolak
            </Tombol>
            <Tombol className="flex-1" onClick={() => onTerima?.(lembur.id)}>
              <Ikon.Centang size={15} /> Terima
            </Tombol>
          </div>
        ) : menunggu ? (
          <p className="m-0 mt-3.5 text-xs text-teks-samar">
            Jawab penugasan ini di halaman Lembur.
          </p>
        ) : (
          <p className="m-0 mt-3.5 text-xs text-teks-samar">
            Anda {ditolak ? 'menolak' : 'menerima'} penugasan ini
            {lembur.dijawabPada ? ` pada ${lembur.dijawabPada}` : ''}.
          </p>
        )}
      </div>
    </div>
  )
}

export function LemburUser() {
  const { menunggu, riwayat, terima, tolak } = useLembur()
  const [ditolakkan, setDitolakkan] = useState<Lembur | null>(null)
  const [alasan, setAlasan] = useState('')
  const [galat, setGalat] = useState('')

  const diterima = riwayat.filter((l) => l.status === 'Diterima' || l.status === 'Selesai')
  const totalJam = diterima.reduce((n, l) => n + jamDari(l.total), 0)

  function bukaTolak(l: Lembur) {
    setDitolakkan(l)
    setAlasan('')
    setGalat('')
  }

  function kirimPenolakan() {
    // Admin memakai alasan ini untuk mencari pengganti, jadi tidak boleh kosong.
    if (alasan.trim().length < 10) {
      setGalat('Tulis alasan minimal 10 karakter agar admin paham situasinya.')
      return
    }
    if (ditolakkan) tolak(ditolakkan.id, alasan.trim())
    setDitolakkan(null)
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4.5 sm:grid-cols-3">
        <StatCard
          gaya="pekat"
          nama="Menunggu jawaban Anda"
          angka={String(menunggu.length)}
          ikon={<Ikon.Jam size={17} />}
          ket={menunggu.length ? 'Batas menjawab hari ini pukul 16.00' : 'Semua penugasan sudah dijawab'}
        />
        <StatCard
          gaya="pekat"
          nama="Lembur diterima bulan ini"
          angka={String(diterima.length)}
          ikon={<Ikon.Centang size={17} />}
          ket={`Total ${totalJam} jam`}
        />
        <StatCard
          gaya="pekat"
          nama="Perkiraan uang lembur"
          angka={`Rp ${(totalJam * TARIF_PER_JAM).toLocaleString('id-ID')}`}
          ikon={<Ikon.Rekap size={17} />}
          ket="Dihitung dari tarif per jam"
        />
      </div>

      <div className="mb-3.5 mt-6 flex items-center gap-3">
        <h3 className="m-0 text-[15px] font-bold text-ink">Perlu Anda jawab</h3>
        <Pil status="Menunggu">{menunggu.length} penugasan</Pil>
      </div>
      {menunggu.length ? (
        <div className="grid grid-cols-1 gap-4.5 xl:grid-cols-2">
          {menunggu.map((l) => (
            <KartuLembur key={l.id} lembur={l} onTerima={terima} onTolak={bukaTolak} />
          ))}
        </div>
      ) : (
        <div className="rounded-kartu border border-dashed border-garis-kuat bg-white px-5 py-8 text-center">
          <span className="mx-auto mb-2.5 grid h-11 w-11 place-items-center rounded-full bg-hijau-lembut text-hijau-tua">
            <Ikon.Centang size={20} />
          </span>
          <b className="block text-[13.5px] font-semibold text-ink">Tidak ada penugasan menunggu</b>
          <span className="mt-0.5 block text-[12px] text-teks-lembut">
            Jawaban Anda langsung terkirim ke admin dan tercatat di riwayat di bawah.
          </span>
        </div>
      )}

      <h3 className="mb-3.5 mt-6.5 text-[15px] font-bold text-ink">Riwayat penugasan</h3>
      {/* Riwayat terus bertambah tiap penugasan, jadi digulir di tempat */}
      <div className="scrollbar-lembut -mx-1 grid max-h-[460px] grid-cols-1 gap-4.5 overflow-y-auto overscroll-contain px-1 py-1 xl:grid-cols-2">
        {riwayat.map((l) => (
          <KartuLembur key={l.id} lembur={l} />
        ))}
      </div>

      {ditolakkan && (
        <Modal
          judul="Tolak penugasan lembur"
          sub={`${ditolakkan.tanggal} · ${ditolakkan.rentang} · ${ditolakkan.total}`}
          onTutup={() => setDitolakkan(null)}
          aksi={
            <>
              <Tombol varian="hantu" onClick={() => setDitolakkan(null)}>
                Batal
              </Tombol>
              <Tombol onClick={kirimPenolakan}>
                <Ikon.Kirim size={15} /> Kirim penolakan
              </Tombol>
            </>
          }
        >
          <p className="m-0 mb-3.5 text-[12.5px] leading-relaxed text-teks-lembut">
            {ditolakkan.keterangan}
          </p>
          <Kolom
            label="Alasan menolak"
            wajib
            bantu="Alasan ini terlihat oleh admin supaya bisa segera mencari pengganti."
          >
            <AreaTeks
              autoFocus
              value={alasan}
              onChange={(e) => {
                setAlasan(e.target.value)
                if (galat) setGalat('')
              }}
              placeholder="Contoh: sedang sakit, atau ada tugas lain di jam yang sama."
              className="min-h-[110px]"
            />
          </Kolom>
          {galat && (
            <div className="mt-2.5 flex items-start gap-2 rounded-xl border border-merah/30 bg-merah-lembut px-3 py-2 text-[11.5px] leading-relaxed text-merah-teks">
              <Ikon.Awas size={14} className="mt-px flex-none" />
              <span>{galat}</span>
            </div>
          )}
        </Modal>
      )}
    </>
  )
}
