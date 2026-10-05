import { useMemo, useState } from 'react'
import { Modal } from '@/components/Modal'
import { StatusData } from '@/components/StatusData'
import { KodeShift } from '@/components/shift/KodeShift'
import { AreaTeks, Avatar, Kolom, Tombol } from '@/components/ui'
import { api, pesanGalat, query } from '@/lib/api'
import { Ikon } from '@/lib/ikon'
import { formatTanggal, dariIso, keIso } from '@/lib/tanggal'
import { useApi } from '@/lib/useApi'
import { cn } from '@/lib/util'
import type { HariRekan, JadwalSaya, RekanShift, Shift } from '@/types'

type Langkah = 1 | 2 | 3 | 4
const LANGKAH = ['Tanggal saya', 'Pilih rekan', 'Shift rekan', 'Alasan']

function geser(iso: string, n: number): string {
  const t = dariIso(iso)
  t.setDate(t.getDate() + n)
  return keIso(t)
}

/** 'A', null → kotak kosong bergaris. */
function Kode({ shift, ukuran = 26 }: { shift?: Shift | null; ukuran?: number }) {
  return shift ? (
    <KodeShift shift={shift} ukuran={ukuran} />
  ) : (
    <span
      className="grid flex-none place-items-center rounded-lg border border-dashed border-garis-kuat text-teks-samar"
      style={{ width: ukuran, height: ukuran }}
    >
      –
    </span>
  )
}

/**
 * Pop-up ajukan tukar shift, bertahap:
 * tanggal saya → rekan satu jabatan → shift rekan (tanggal sama/beda) → alasan.
 */
export function AjukanTukar({
  hari,
  onTutup,
  onTerkirim,
}: {
  /** hari milik saya yang akan ditukar; sudah punya shift dan belum lewat */
  hari: JadwalSaya
  onTutup: () => void
  onTerkirim: () => void
}) {
  const [langkah, setLangkah] = useState<Langkah>(1)
  const [rekan, setRekan] = useState<RekanShift | null>(null)
  const [tanggalRekan, setTanggalRekan] = useState<string | null>(null)
  const [alasan, setAlasan] = useState('')
  const [galat, setGalat] = useState('')
  const [mengirim, setMengirim] = useState(false)

  // Pilihan tanggal rekan: seminggu sebelum s.d. dua minggu sesudah tanggal saya (backend membuang yang sudah lewat).
  const rentang = useMemo(() => {
    const hariIni = keIso(new Date())
    const dari = geser(hari.tanggal, -7)
    return { dari: dari < hariIni ? hariIni : dari, sampai: geser(hari.tanggal, 13) }
  }, [hari.tanggal])

  const daftarRekan = useApi<RekanShift[]>(
    langkah >= 2 ? `/api/shift/rekan${query({ tanggal: hari.tanggal })}` : null,
    [],
  )
  const jadwalRekan = useApi<HariRekan[]>(rekan ? `/api/shift/rekan/${rekan.id}/jadwal${query(rentang)}` : null, [])
  const jadwalSaya = useApi<JadwalSaya[]>(rekan ? `/api/shift/saya${query(rentang)}` : null, [])

  const sayaPada = (t: string) => (t === hari.tanggal ? hari.shift : jadwalSaya.data.find((h) => h.tanggal === t)?.shift)
  const rekanPada = (t: string) =>
    jadwalRekan.data.find((h) => h.tanggal === t)?.shift ?? (t === hari.tanggal ? rekan?.shift : null)
  const hasil = tanggalRekan ? [...new Set([hari.tanggal, tanggalRekan])].sort() : []

  function pilihRekan(r: RekanShift) {
    if (rekan?.id !== r.id) setTanggalRekan(null)
    setRekan(r)
    setLangkah(3)
  }

  async function kirim() {
    if (!rekan || !tanggalRekan) return
    if (!alasan.trim()) {
      setGalat('Alasan wajib diisi.')
      return
    }
    setMengirim(true)
    setGalat('')
    try {
      await api('/api/shift/tukar', 'POST', {
        tanggalSaya: hari.tanggal,
        rekanId: rekan.id,
        tanggalRekan,
        alasan: alasan.trim(),
      })
      onTerkirim()
      onTutup()
    } catch (e) {
      setGalat(pesanGalat(e))
    } finally {
      setMengirim(false)
    }
  }

  const bisaLanjut = langkah === 1 || (langkah === 2 && !!rekan) || (langkah === 3 && !!tanggalRekan)

  return (
    <Modal
      judul="Ajukan tukar shift"
      sub="Rekan menjawab dulu, lalu admin memutuskan. Jadwal baru berubah setelah disetujui admin."
      lebar="max-w-[560px]"
      onTutup={onTutup}
      aksi={
        <>
          {langkah > 1 && (
            <Tombol varian="hantu" onClick={() => setLangkah((l) => (l - 1) as Langkah)} className="mr-auto">
              Kembali
            </Tombol>
          )}
          <Tombol varian="hantu" onClick={onTutup}>
            Batal
          </Tombol>
          {langkah < 4 ? (
            <Tombol onClick={() => setLangkah((l) => (l + 1) as Langkah)} disabled={!bisaLanjut}>
              Lanjut <Ikon.Chevron size={15} />
            </Tombol>
          ) : (
            <Tombol onClick={kirim} disabled={mengirim}>
              <Ikon.Kirim size={15} /> {mengirim ? 'Mengirim…' : 'Kirim permintaan'}
            </Tombol>
          )}
        </>
      }
    >
      <ol className="m-0 mb-4 flex list-none gap-1.5 p-0">
        {LANGKAH.map((l, i) => {
          const no = (i + 1) as Langkah
          return (
            <li key={l} className="flex-1">
              <span className={cn('block h-1 rounded-full', no <= langkah ? 'bg-hijau' : 'bg-garis')} />
              <span
                className={cn(
                  'mt-1 block text-[10.5px] font-semibold',
                  no === langkah ? 'text-hijau-tua' : 'text-teks-samar',
                )}
              >
                {no}. {l}
              </span>
            </li>
          )
        })}
      </ol>

      {langkah === 1 && (
        <div className="flex items-center gap-3 rounded-xl border border-garis bg-[#FAFCFB] px-3.5 py-3">
          <Kode shift={hari.shift} ukuran={40} />
          <div>
            <b className="block text-[14px] font-semibold text-ink">{hari.shift?.nama}</b>
            <span className="block text-[12px] text-teks-lembut">
              {hari.hari}, {hari.tanggalTeks}
              {hari.shift?.rentang && ` · ${hari.shift.rentang}`}
            </span>
          </div>
        </div>
      )}

      {langkah === 2 && (
        <div className="grid gap-2">
          <p className="m-0 text-[12px] text-teks-lembut">
            Rekan satu jabatan, beserta shift mereka pada {formatTanggal(hari.tanggal).tanggal}:
          </p>
          <StatusData memuat={daftarRekan.memuat} galat={daftarRekan.galat} onUlang={daftarRekan.muat} />
          {!daftarRekan.memuat && !daftarRekan.data.length && !daftarRekan.galat && (
            <p className="m-0 py-4 text-center text-[12.5px] text-teks-samar">Belum ada rekan satu jabatan.</p>
          )}
          <div className="scrollbar-lembut grid max-h-[320px] gap-1.5 overflow-y-auto">
            {daftarRekan.data.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => pilihRekan(r)}
                className={cn(
                  'flex items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition',
                  rekan?.id === r.id ? 'border-hijau bg-hijau-lembut' : 'border-garis hover:border-hijau',
                )}
              >
                <Avatar nama={r.nama} foto={r.fotoProfil} ukuran={30} />
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-[13px] font-semibold text-ink">
                    {r.nama}
                    {r.status === 'Cuti' && <span className="ml-1.5 text-[11px] font-semibold text-emas-teks">Cuti</span>}
                  </b>
                  <span className="block truncate text-[11.5px] text-teks-samar">
                    {r.shift ? `${r.shift.nama}${r.shift.rentang ? ` · ${r.shift.rentang}` : ''}` : 'Belum dijadwalkan'}
                    {r.diajukanTukar && ' · sedang diajukan tukar'}
                  </span>
                </span>
                <Kode shift={r.shift} />
              </button>
            ))}
          </div>
        </div>
      )}

      {langkah === 3 && rekan && (
        <div className="grid gap-2.5">
          <p className="m-0 text-[12px] text-teks-lembut">
            Pilih shift {rekan.nama} yang ingin Anda ambil. Bisa di tanggal yang sama atau tanggal lain.
          </p>
          <StatusData memuat={jadwalRekan.memuat} galat={jadwalRekan.galat} onUlang={jadwalRekan.muat} />
          <div className="scrollbar-lembut grid max-h-[260px] grid-cols-1 gap-1.5 overflow-y-auto sm:grid-cols-2">
            {jadwalRekan.data.map((h) => {
              const sama = h.tanggal === hari.tanggal
              const alasanMati = !h.shift
                ? 'belum dijadwalkan'
                : h.diajukanTukar
                  ? 'sedang diajukan tukar'
                  : sama && h.shift.id === hari.shift?.id
                    ? 'shift sama dengan Anda'
                    : ''
              return (
                <button
                  key={h.tanggal}
                  type="button"
                  disabled={!!alasanMati}
                  onClick={() => setTanggalRekan(h.tanggal)}
                  className={cn(
                    'flex items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition disabled:cursor-not-allowed disabled:opacity-50',
                    tanggalRekan === h.tanggal ? 'border-hijau bg-hijau-lembut' : 'border-garis enabled:hover:border-hijau',
                  )}
                >
                  <Kode shift={h.shift} />
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-[12.5px] font-semibold text-ink">
                      {h.hari}, {h.tanggalTeks}
                      {sama && <span className="ml-1 font-normal text-hijau-tua">(sama)</span>}
                    </b>
                    <span className="block truncate text-[11px] text-teks-samar">
                      {alasanMati || `${h.shift?.nama}${h.shift?.rentang ? ` · ${h.shift.rentang}` : ''}`}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
          {tanggalRekan && <Pratinjau tanggal={hasil} saya={sayaPada} rekan={rekanPada} namaRekan={rekan.nama} />}
        </div>
      )}

      {langkah === 4 && rekan && tanggalRekan && (
        <div className="grid gap-3">
          <Pratinjau tanggal={hasil} saya={sayaPada} rekan={rekanPada} namaRekan={rekan.nama} />
          <Kolom label="Alasan" wajib>
            <AreaTeks
              autoFocus
              maxLength={500}
              placeholder="mis. Ada acara keluarga pada tanggal tersebut"
              value={alasan}
              onChange={(e) => {
                setAlasan(e.target.value)
                if (galat) setGalat('')
              }}
            />
          </Kolom>
        </div>
      )}

      {galat && (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-merah/30 bg-merah-lembut px-3 py-2 text-[11.5px] leading-relaxed text-merah-teks">
          <Ikon.Awas size={14} className="mt-px flex-none" />
          <span>{galat}</span>
        </div>
      )}
    </Modal>
  )
}

/** Hasil bila disetujui: pada setiap tanggal yang terlibat, isi kotak Anda dan rekan saling ditukar. */
function Pratinjau({
  tanggal,
  saya,
  rekan,
  namaRekan,
}: {
  tanggal: string[]
  saya: (t: string) => Shift | null | undefined
  rekan: (t: string) => Shift | null | undefined
  namaRekan: string
}) {
  return (
    <div className="rounded-xl border border-garis bg-[#FAFCFB] px-3.5 py-3">
      <b className="mb-2 block text-[12px] font-semibold text-teks-lembut">Hasil bila disetujui admin</b>
      <div className="grid gap-2">
        {tanggal.map((t) => {
          const { hari, tanggal: teks } = formatTanggal(t)
          return (
            <div key={t} className="grid gap-1 text-[12px]">
              <span className="font-semibold text-ink">
                {hari}, {teks}
              </span>
              {[
                { nama: 'Anda', dari: saya(t), ke: rekan(t) },
                { nama: namaRekan, dari: rekan(t), ke: saya(t) },
              ].map((b) => (
                <span key={b.nama} className="flex items-center gap-2 text-teks-lembut">
                  <span className="w-[96px] truncate">{b.nama}</span>
                  <Kode shift={b.dari} ukuran={22} />
                  <Ikon.Chevron size={13} />
                  <Kode shift={b.ke} ukuran={22} />
                  <span className="truncate">{b.ke?.nama ?? 'Kosong'}</span>
                </span>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
