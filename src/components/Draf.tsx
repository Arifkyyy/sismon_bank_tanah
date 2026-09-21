import { TumpukanFoto } from '@/components/Foto'
import { Avatar, IsiKartu, Kartu, KopKartu, Pil, TagJabatan, Tombol, TombolIkon } from '@/components/ui'
import { Ikon } from '@/lib/ikon'
import { formatTanggal } from '@/lib/tanggal'
import { cn } from '@/lib/util'
import type { Jabatan } from '@/types'

/** Satu catatan yang sudah disimpan tapi belum dikirim ke admin. */
export interface Draf {
  id: string
  nama: string
  jabatan: Jabatan | ''
  tanggal: string
  jam: string
  keterangan: string
  foto: string[]
}

/** Bagian yang masih kosong pada sebuah draf — dipakai untuk penanda kesiapan. */
export function kekuranganDraf(d: Draf): string[] {
  const kurang: string[] = []
  if (!d.nama) kurang.push('nama')
  if (!d.jam) kurang.push('jam')
  if (d.foto.length === 0) kurang.push('foto')
  if (d.keterangan.trim().length < 20) kurang.push('keterangan')
  return kurang
}

/**
 * Kartu "Data Pending" — dipakai sama persis di Logbook dan Laporan Kendala
 * supaya alur menyimpan draf terasa satu bahasa di kedua halaman.
 */
export function KartuDataPending({
  daftar,
  editId,
  judul = 'Data Pending',
  sub = 'Data yang belum final',
  kosongJudul = 'Belum ada data pending',
  kosongPesan,
  onEdit,
  onKirim,
  onHapus,
}: {
  daftar: Draf[]
  editId: string | null
  judul?: string
  sub?: string
  kosongJudul?: string
  kosongPesan?: React.ReactNode
  onEdit: (d: Draf) => void
  onKirim: (id: string) => void
  onHapus: (id: string) => void
}) {
  const siapKirim = daftar.filter((d) => kekuranganDraf(d).length === 0).length

  return (
    <Kartu className="self-start">
      <KopKartu
        judul={judul}
        sub={sub}
        aksi={
          daftar.length > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emas-lembut px-2.5 py-1 text-[11.5px] font-semibold text-emas-teks">
              <Ikon.Jam size={12} />
              <span className="num">{daftar.length}</span> draf
            </span>
          )
        }
      />
      <IsiKartu>
        {daftar.length === 0 ? (
          <div className="relative grid place-items-center overflow-hidden rounded-2xl border border-dashed border-garis-kuat bg-gradient-to-b from-white to-[#F3F7F4] px-5 py-12 text-center">
            <span
              aria-hidden
              className="absolute -top-14 left-1/2 h-36 w-36 -translate-x-1/2 rounded-full bg-hijau/10 blur-3xl"
            />
            <span className="relative grid h-12 w-12 place-items-center rounded-2xl border border-garis bg-white text-teks-samar shadow-kartu">
              <Ikon.Buku size={20} />
            </span>
            <b className="relative mt-3.5 text-[13.5px] font-bold text-ink">{kosongJudul}</b>
            <p className="relative m-0 mt-1 max-w-[236px] text-[12px] leading-relaxed text-teks-samar">
              {kosongPesan ?? (
                <>
                  Simpan catatan sebagai <b className="font-semibold text-teks-lembut">Draft</b> — data
                  akan menunggu di sini sampai Anda kirim.
                </>
              )}
            </p>
          </div>
        ) : (
          <>
            <div className="mb-3.5 flex items-center gap-3 rounded-xl border border-garis bg-[#FAFCFB] px-3.5 py-2.5">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#E7EDE9]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-hijau-terang to-hijau transition-[width] duration-500 ease-pantul"
                  style={{ width: `${Math.round((siapKirim / daftar.length) * 100)}%` }}
                />
              </div>
              <span className="num whitespace-nowrap text-[11.5px] font-semibold text-teks-lembut">
                {siapKirim}/{daftar.length} siap kirim
              </span>
            </div>

            <div className="scrollbar-lembut -mx-1 flex max-h-[560px] flex-col gap-3 overflow-y-auto px-1 py-1">
              {daftar.map((d, i) => {
                const sedangDiedit = editId === d.id
                const kurang = kekuranganDraf(d)
                const lengkap = kurang.length === 0
                return (
                  <article
                    key={d.id}
                    style={{ animationDelay: `${Math.min(i, 6) * 45}ms` }}
                    className={cn(
                      'masuk-halus group relative overflow-hidden rounded-2xl border bg-white transition duration-200 hover:-translate-y-0.5 hover:shadow-naik',
                      sedangDiedit
                        ? 'border-hijau ring-[3px] ring-hijau/15'
                        : 'border-garis hover:border-garis-kuat',
                    )}
                  >
                    {/* Pita kiri: emas = menunggu dikirim, hijau = sedang diedit */}
                    <span
                      aria-hidden
                      className={cn(
                        'absolute inset-y-0 left-0 w-1',
                        sedangDiedit
                          ? 'bg-gradient-to-b from-hijau-terang to-hijau'
                          : 'bg-gradient-to-b from-emas to-tanah',
                      )}
                    />
                    <span
                      aria-hidden
                      className="pointer-events-none absolute -right-12 -top-12 h-28 w-28 rounded-full bg-emas/15 opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100"
                    />

                    <div className="relative p-4 pl-[19px]">
                      <div className="flex items-start gap-3">
                        {d.nama && d.jabatan ? (
                          <Avatar nama={d.nama} jabatan={d.jabatan} ukuran={36} />
                        ) : (
                          <span className="grid h-9 w-9 flex-none place-items-center rounded-[10px] border border-dashed border-garis-kuat text-teks-samar">
                            <Ikon.Orang size={16} />
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start gap-2">
                            <b
                              className={cn(
                                'min-w-0 flex-1 truncate text-[13.5px] font-bold',
                                d.nama ? 'text-ink' : 'text-teks-samar',
                              )}
                            >
                              {d.nama || 'Belum ada nama'}
                            </b>
                            {sedangDiedit ? <Pil status="Diproses">Diedit</Pil> : <Pil status="Menunggu" />}
                          </div>
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            {d.jabatan && <TagJabatan jabatan={d.jabatan} />}
                            <span className="num inline-flex items-center rounded-[7px] bg-[#F3F7F4] px-2 py-0.5 text-[11.5px] font-semibold text-teks-lembut">
                              {formatTanggal(d.tanggal).tanggal}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-[7px] bg-[#F3F7F4] px-2 py-0.5 text-[11.5px] font-semibold text-teks-lembut">
                              <Ikon.Jam size={11} />
                              <span className="num">{d.jam || '--:--'}</span>
                            </span>
                            <span
                              className={cn(
                                'inline-flex items-center gap-1 rounded-[7px] px-2 py-0.5 text-[11.5px] font-semibold',
                                d.foto.length > 0
                                  ? 'bg-hijau-lembut text-hijau-tua'
                                  : 'bg-[#F3F7F4] text-teks-samar',
                              )}
                            >
                              <Ikon.Kamera size={11} />
                              {d.foto.length > 0 ? `${d.foto.length} foto` : 'Tanpa foto'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <p
                        className={cn(
                          'm-0 mt-3 line-clamp-2 text-[12.5px] leading-relaxed',
                          d.keterangan ? 'text-teks-lembut' : 'italic text-teks-samar',
                        )}
                      >
                        {d.keterangan || 'Belum ada keterangan.'}
                      </p>

                      {d.foto.length > 0 && (
                        <div className="mt-3">
                          <TumpukanFoto
                            foto={d.foto}
                            judul={`Foto draf — ${d.nama || 'tanpa nama'}`}
                            maksTampil={4}
                          />
                        </div>
                      )}
                    </div>

                    <div className="relative border-t border-garis bg-[#FAFCFB] px-4 py-3 pl-[19px]">
                      <div
                        className={cn(
                          'mb-2.5 flex items-start gap-1.5 text-[11.5px] font-semibold leading-relaxed',
                          lengkap ? 'text-hijau-tua' : 'text-emas-teks',
                        )}
                      >
                        <span className="mt-px flex-none">
                          {lengkap ? <Ikon.Centang size={13} /> : <Ikon.Info size={13} />}
                        </span>
                        {lengkap ? 'Lengkap, siap dikirim' : `Perlu dilengkapi: ${kurang.join(', ')}`}
                      </div>
                      <div className="flex items-center gap-2">
                        <Tombol varian="hantu" kecil className="flex-1" onClick={() => onEdit(d)}>
                          <Ikon.Pena size={13} /> Edit
                        </Tombol>
                        <Tombol kecil className="flex-1" onClick={() => onKirim(d.id)}>
                          <Ikon.Kirim size={13} /> Kirim
                        </Tombol>
                        <TombolIkon label="Hapus draf" bahaya onClick={() => onHapus(d.id)}>
                          <Ikon.Sampah size={14} />
                        </TombolIkon>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          </>
        )}
      </IsiKartu>
    </Kartu>
  )
}
