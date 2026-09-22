import { useState } from 'react'
import { StatCard } from '@/components/StatCard'
import {
  GridForm, Input, IsiKartu, KakiForm, KakiTabel, Kartu, Kolom, KopKartu, Peringatan,
  PilihRapi, Tombol,
} from '@/components/ui'
import { ARSIP_FOTO } from '@/data/mock'
import { Ikon } from '@/lib/ikon'
import { cn, WARNA_FOTO } from '@/lib/util'

const VARIAN = ['a', 'b', 'c'] as const

export function HapusDataFoto() {
  const [dipilih, setDipilih] = useState<Set<number>>(
    () => new Set(ARSIP_FOTO.map((f, i) => (f.dipilih ? i : -1)).filter((i) => i >= 0)),
  )

  function alih(i: number) {
    setDipilih((lama) => {
      const baru = new Set(lama)
      if (baru.has(i)) baru.delete(i)
      else baru.add(i)
      return baru
    })
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
        <StatCard nama="Total foto tersimpan" angka="14.820" nada="ink" ikon={<Ikon.Foto size={17} />} ket="Sejak Januari 2026" />
        <StatCard nama="Ruang penyimpanan terpakai" angka="38,6" satuan="GB" nada="emas" ikon={<Ikon.Rekap size={17} />} ket="Dari kuota 60 GB" />
        <StatCard nama="Foto lebih dari 6 bulan" angka="5.140" nada="tanah" ikon={<Ikon.Jam size={17} />} ket="Aman dihapus sesuai kebijakan arsip" />
      </div>

      <Kartu className="mt-4.5">
        <KopKartu
          judul="Arsip foto"
          sub="Pilih foto yang ingin dihapus, atau hapus sekaligus per periode"
          aksi={
            <>
              <PilihRapi defaultValue="Semua sumber">
                <option>Semua sumber</option>
                <option>Logbook</option>
                <option>Laporan kendala</option>
              </PilihRapi>
              <PilihRapi defaultValue="Semua jabatan">
                <option>Semua jabatan</option>
                <option>Security</option>
                <option>OB</option>
                <option>CS</option>
              </PilihRapi>
            </>
          }
        />
        <IsiKartu>
          <div className="mb-4.5 flex flex-wrap items-center gap-3 rounded-xl border border-garis bg-[#F7FAF8] px-3.5 py-3">
            <label className="flex cursor-pointer items-center gap-2.5 text-[13px] font-semibold text-ink">
              <input
                type="checkbox"
                className="h-4 w-4 accent-hijau"
                checked={dipilih.size === ARSIP_FOTO.length}
                onChange={(e) =>
                  setDipilih(e.target.checked ? new Set(ARSIP_FOTO.map((_, i) => i)) : new Set())
                }
              />
              Pilih semua di halaman ini
            </label>
            <span className="num text-[12.5px] text-teks-lembut">
              {dipilih.size} foto dipilih · {(dipilih.size * 2.47).toFixed(1)} MB
            </span>
            <div className="ml-auto flex flex-wrap gap-2.5">
              <Tombol varian="hantu" kecil>
                <Ikon.Unduh size={15} /> Unduh yang dipilih
              </Tombol>
              <Tombol varian="bahaya" kecil>
                <Ikon.Sampah size={15} /> Hapus yang dipilih
              </Tombol>
            </div>
          </div>

          {/* Arsip foto bisa puluhan ribu berkas, jadi petaknya digulir di dalam
              kartu supaya tombol hapus massal tetap terlihat tanpa menggulir halaman */}
          <div className="scrollbar-lembut -mx-1 grid max-h-[440px] grid-cols-[repeat(auto-fill,minmax(148px,1fr))] gap-3.5 overflow-y-auto overscroll-contain px-1 py-1">
            {ARSIP_FOTO.map((f, i) => {
              const aktif = dipilih.has(i)
              return (
                <button
                  key={f.nama + f.waktu}
                  type="button"
                  onClick={() => alih(i)}
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
                    className={`grid aspect-[4/3] place-items-center bg-gradient-to-br text-white/85 ${WARNA_FOTO[VARIAN[i % 3]]}`}
                  >
                    <Ikon.Foto size={26} />
                  </div>
                  <div className="px-3 py-2.5">
                    <b className="block text-[12.5px] font-semibold text-ink">{f.nama}</b>
                    <span className="num text-[11px] text-teks-samar">
                      {f.waktu} · {f.sumber}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </IsiKartu>
        <KakiTabel dari={1} ke={8} total={14820} />
      </Kartu>

      <Kartu className="mt-4.5 border-[#F0CFCB]">
        <KopKartu judul={<span className="text-merah">Hapus massal per periode</span>} sub="Gunakan bila penyimpanan hampir penuh" />
        <IsiKartu>
          <GridForm>
            <Kolom label="Hapus foto sebelum tanggal">
              <Input type="date" defaultValue="2026-03-15" />
            </Kolom>
            <Kolom label="Ketik HAPUS untuk mengonfirmasi">
              <Input placeholder="HAPUS" />
            </Kolom>
          </GridForm>
        </IsiKartu>
        <KakiForm>
          <Tombol varian="bahaya">
            <Ikon.Sampah size={15} /> Hapus 5.140 foto
          </Tombol>
        </KakiForm>
      </Kartu>
    </>
  )
}
