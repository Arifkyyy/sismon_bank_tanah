import { useState } from 'react'
import { StatCard } from '@/components/StatCard'
import {
  GridForm, Input, IsiKartu, KakiForm, KakiTabel, Kartu, Kolom, KopKartu, Peringatan,
  PilihRapi, Tombol,
} from '@/components/ui'
import { StatusData } from '@/components/StatusData'
import { useKonfirmasi } from '@/context/KonfirmasiContext'
import { Ikon } from '@/lib/ikon'
import { api, pesanGalat, query } from '@/lib/api'
import { useApi } from '@/lib/useApi'
import { keIso } from '@/lib/tanggal'
import { cn, DAFTAR_JABATAN, WARNA_FOTO } from '@/lib/util'
import type { FotoArsip, Jabatan, StatistikFoto } from '@/types'

const VARIAN = ['a', 'b', 'c'] as const

/** Byte → 'GB' dengan satu angka di belakang koma, gaya Indonesia. */
function keGb(byte: number): string {
  return (byte / 1024 ** 3).toFixed(1).replace('.', ',')
}

/** Tanggal bawaan hapus massal: enam bulan sebelum hari ini. */
function enamBulanLalu(): string {
  const t = new Date()
  t.setMonth(t.getMonth() - 6)
  return keIso(t)
}

export function HapusDataFoto() {
  const konfirmasi = useKonfirmasi()
  const [dipilih, setDipilih] = useState<Set<number>>(new Set())
  const [sumber, setSumber] = useState('Semua')
  const [jabatan, setJabatan] = useState<Jabatan | 'Semua'>('Semua')
  const [batasTanggal, setBatasTanggal] = useState(enamBulanLalu)
  const [ketikan, setKetikan] = useState('')
  const [sibuk, setSibuk] = useState(false)
  const [galatAksi, setGalatAksi] = useState<string | null>(null)

  const arsip = useApi<FotoArsip[]>(
    `/api/foto${query({
      sumber: sumber === 'Semua' ? '' : sumber,
      jabatan: jabatan === 'Semua' ? '' : jabatan,
    })}`,
    [],
  )
  const statistik = useApi<StatistikFoto>('/api/foto/statistik', {
    total: 0,
    ukuranByte: 0,
    lebihEnamBulan: 0,
  })

  // Rata-rata ukuran dipakai memperkirakan besar berkas yang sedang dipilih.
  const rerataMb =
    statistik.data.total > 0 ? statistik.data.ukuranByte / statistik.data.total / 1024 ** 2 : 0

  function alih(id: number) {
    setDipilih((lama) => {
      const baru = new Set(lama)
      if (baru.has(id)) baru.delete(id)
      else baru.add(id)
      return baru
    })
  }

  async function jalankan(aksi: () => Promise<unknown>) {
    setSibuk(true)
    setGalatAksi(null)
    try {
      await aksi()
      arsip.muat()
      statistik.muat()
      return true
    } catch (e) {
      setGalatAksi(pesanGalat(e))
      return false
    } finally {
      setSibuk(false)
    }
  }

  async function hapusTerpilih() {
    const ids = [...dipilih]
    if (ids.length === 0) return
    const ya = await konfirmasi({
      judul: `Hapus ${ids.length} foto?`,
      pesan: 'Berkas foto terhapus permanen dari server dan tidak bisa dikembalikan.',
      tombol: 'Hapus foto',
      nada: 'bahaya',
    })
    if (!ya) return
    if (await jalankan(() => api('/api/foto/hapus', 'POST', { ids }))) setDipilih(new Set())
  }

  async function hapusMassal() {
    if (ketikan !== 'HAPUS') return
    if (await jalankan(() =>
      api('/api/foto/hapus-sebelum', 'POST', { tanggal: batasTanggal, konfirmasi: 'HAPUS' }),
    )) {
      setKetikan('')
      setDipilih(new Set())
    }
  }

  return (
    <>
      <div className="mb-4.5">
        <Peringatan judul="Foto yang dihapus tidak bisa dikembalikan">
          Catatan logbook dan laporan kendala tetap tersimpan, hanya berkas fotonya yang hilang.
          Pastikan arsip sudah diunduh sebelum menghapus.
        </Peringatan>
      </div>

      <div className="grid grid-cols-1 gap-4.5 sm:grid-cols-3">
        <StatCard nama="Total foto tersimpan" angka={statistik.data.total.toLocaleString('id-ID')} nada="ink" ikon={<Ikon.Foto size={17} />} ket="Seluruh arsip" />
        <StatCard nama="Ruang penyimpanan terpakai" angka={keGb(statistik.data.ukuranByte)} satuan="GB" nada="emas" ikon={<Ikon.Rekap size={17} />} ket="Dihitung dari ukuran berkas" />
        <StatCard nama="Foto lebih dari 6 bulan" angka={statistik.data.lebihEnamBulan.toLocaleString('id-ID')} nada="tanah" ikon={<Ikon.Jam size={17} />} ket="Aman dihapus sesuai kebijakan arsip" />
      </div>

      <Kartu className="mt-4.5">
        <KopKartu
          judul="Arsip foto"
          sub="Pilih foto yang ingin dihapus, atau hapus sekaligus per periode"
          aksi={
            <>
              <PilihRapi value={sumber} onChange={(e) => setSumber(e.target.value)}>
                <option value="Semua">Semua sumber</option>
                <option>Logbook</option>
                <option>Kendala</option>
              </PilihRapi>
              <PilihRapi
                value={jabatan}
                onChange={(e) => setJabatan(e.target.value as Jabatan | 'Semua')}
              >
                <option value="Semua">Semua jabatan</option>
                {DAFTAR_JABATAN.map((j) => (
                  <option key={j}>{j}</option>
                ))}
              </PilihRapi>
            </>
          }
        />
        <StatusData memuat={arsip.memuat} galat={arsip.galat} onUlang={arsip.muat} />
        <IsiKartu>
          <div className="mb-4.5 flex flex-wrap items-center gap-3 rounded-xl border border-garis bg-[#F7FAF8] px-3.5 py-3">
            <label className="flex cursor-pointer items-center gap-2.5 text-[13px] font-semibold text-ink">
              <input
                type="checkbox"
                className="h-4 w-4 accent-hijau"
                checked={arsip.data.length > 0 && dipilih.size === arsip.data.length}
                onChange={(e) =>
                  setDipilih(e.target.checked ? new Set(arsip.data.map((f) => f.id)) : new Set())
                }
              />
              Pilih semua di halaman ini
            </label>
            <span className="num text-[12.5px] text-teks-lembut">
              {dipilih.size} foto dipilih · {(dipilih.size * rerataMb).toFixed(1)} MB
            </span>
            <div className="ml-auto flex flex-wrap gap-2.5">
              <Tombol varian="hantu" kecil>
                <Ikon.Unduh size={15} /> Unduh yang dipilih
              </Tombol>
              <Tombol
                varian="bahaya"
                kecil
                onClick={hapusTerpilih}
                disabled={dipilih.size === 0 || sibuk}
              >
                <Ikon.Sampah size={15} /> Hapus yang dipilih
              </Tombol>
            </div>
          </div>

          {/* Arsip foto bisa puluhan ribu berkas, jadi petaknya digulir di dalam
              kartu supaya tombol hapus massal tetap terlihat tanpa menggulir halaman */}
          <div className="scrollbar-lembut -mx-1 grid grid-cols-[repeat(auto-fill,minmax(148px,1fr))] gap-3.5 px-1 py-1 lg:max-h-[440px] lg:overflow-y-auto lg:overscroll-contain">
            {arsip.data.length === 0 ? (
              <p className="col-span-full py-10 text-center text-[12.5px] text-teks-lembut">
                {arsip.memuat ? 'Memuat arsip foto…' : 'Tidak ada foto pada saringan ini.'}
              </p>
            ) : (
              arsip.data.map((f, i) => {
                const aktif = dipilih.has(f.id)
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => alih(f.id)}
                    aria-pressed={aktif}
                    className={cn(
                      'relative overflow-hidden rounded-xl border bg-white text-left transition',
                      aktif ? 'border-hijau ring-2 ring-hijau/20' : 'border-garis hover:border-garis-kuat',
                    )}
                  >
                    <span
                      className={cn(
                        'absolute left-2 top-2 z-10 grid h-[21px] w-[21px] place-items-center rounded-md border bg-white/90 text-hijau',
                        aktif ? 'border-hijau' : 'border-garis-kuat',
                      )}
                    >
                      {aktif && <Ikon.Centang size={13} />}
                    </span>
                    <div
                      className={`grid aspect-[4/3] place-items-center overflow-hidden bg-gradient-to-br text-white/85 ${WARNA_FOTO[VARIAN[i % 3]]}`}
                    >
                      <img
                        src={f.url}
                        alt={`Foto ${f.sumber} milik ${f.nama}`}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="px-3 py-2.5">
                      <b className="block text-[12.5px] font-semibold text-ink">{f.nama}</b>
                      <span className="num text-[11px] text-teks-samar">
                        {f.waktu} · {f.sumber}
                      </span>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </IsiKartu>
        <KakiTabel
          dari={arsip.data.length ? 1 : 0}
          ke={arsip.data.length}
          total={statistik.data.total}
        />
      </Kartu>

      <Kartu className="mt-4.5 border-[#F0CFCB]">
        <KopKartu judul={<span className="text-merah">Hapus massal per periode</span>} sub="Gunakan bila penyimpanan hampir penuh" />
        <IsiKartu>
          <GridForm>
            <Kolom label="Hapus foto sebelum tanggal">
              <Input
                type="date"
                value={batasTanggal}
                onChange={(e) => setBatasTanggal(e.target.value)}
              />
            </Kolom>
            <Kolom label="Ketik HAPUS untuk mengonfirmasi">
              <Input
                placeholder="HAPUS"
                value={ketikan}
                onChange={(e) => setKetikan(e.target.value)}
              />
            </Kolom>
          </GridForm>
          {galatAksi && (
            <div className="mt-3.5 flex items-start gap-2 rounded-xl border border-merah/30 bg-merah-lembut px-3.5 py-2.5 text-[12px] leading-relaxed text-merah-teks">
              <Ikon.Awas size={14} className="mt-px flex-none" />
              <span>{galatAksi}</span>
            </div>
          )}
        </IsiKartu>
        <KakiForm>
          <Tombol varian="bahaya" onClick={hapusMassal} disabled={ketikan !== 'HAPUS' || sibuk}>
            <Ikon.Sampah size={15} /> Hapus foto sebelum tanggal ini
          </Tombol>
        </KakiForm>
      </Kartu>
    </>
  )
}
