import { Avatar, IsiKartu, Kartu, KopKartu, Pil, TagJabatan, Tombol, TombolIkon } from '@/components/ui'
import { Ikon } from '@/lib/ikon'
import { formatJam, formatTanggal, lamaLembur } from '@/lib/tanggal'
import { cn } from '@/lib/util'
import type { DrafLembur, Petugas } from '@/types'

/** Bagian yang masih kosong pada sebuah draf — menahan tombol Kirim. */
export function kekuranganDraf(d: DrafLembur): string[] {
  const kurang: string[] = []
  if (!d.nama) kurang.push('nama petugas')
  if (!d.tanggal) kurang.push('tanggal')
  if (!d.mulai || !d.selesai) kurang.push('rentang jam')
  if (d.keterangan.trim().length < 20) kurang.push('keterangan tugas')
  return kurang
}

/**
 * Hal yang perlu admin periksa sendiri sebelum mengirim. Tidak menahan tombol
 * Kirim — kadang penugasan memang perlu dikirim ke petugas yang sedang cuti
 * setelah dikonfirmasi lewat jalur lain.
 */
export function peringatanDraf(
  d: DrafLembur,
  lain: DrafLembur[],
  daftarPetugas: Petugas[],
): string[] {
  const catat: string[] = []
  const petugas = daftarPetugas.find((p) => p.nama === d.nama)

  if (d.nama && !petugas) catat.push('Nama ini tidak ada di data petugas.')
  else if (petugas && petugas.jabatan !== d.jabatan)
    catat.push(`${d.nama} terdaftar sebagai ${petugas.jabatan}, bukan ${d.jabatan}.`)
  else if (petugas?.status === 'Nonaktif') catat.push(`Akun ${d.nama} sudah nonaktif.`)
  else if (petugas?.status === 'Cuti') catat.push(`${d.nama} sedang berstatus cuti.`)

  const bentrok = lain.some((x) => x.id !== d.id && x.nama === d.nama && x.tanggal === d.tanggal)
  if (d.nama && bentrok) catat.push('Ada draf lain untuk petugas dan tanggal yang sama.')

  return catat
}

/**
 * Kartu antrean penugasan lembur milik admin. Bentuknya disamakan dengan kartu
 * "Data Pending" di halaman petugas supaya alur simpan → periksa → kirim terasa
 * satu bahasa di seluruh aplikasi.
 */
export function KartuAntreanLembur({
  daftar,
  petugas,
  editId,
  onEdit,
  onKirim,
  onKirimSemua,
  onHapus,
}: {
  daftar: DrafLembur[]
  /** dipakai memeriksa nama, jabatan, dan status petugas pada tiap draf */
  petugas: Petugas[]
  editId: string | null
  onEdit: (d: DrafLembur) => void
  onKirim: (id: string) => void
  onKirimSemua: () => void
  onHapus: (id: string) => void
}) {
  const siapKirim = daftar.filter((d) => kekuranganDraf(d).length === 0).length

  return (
    <Kartu className="self-start">
      <KopKartu
        judul="Data Pending"
        sub="Periksa dulu, petugas belum menerima apa pun"
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
              <Ikon.Jam size={20} />
            </span>
            <b className="relative mt-3.5 text-[13.5px] font-bold text-ink">
              Antrean penugasan kosong
            </b>
            <p className="relative m-0 mt-1 max-w-[248px] text-[12px] leading-relaxed text-teks-samar">
              Simpan penugasan sebagai{' '}
              <b className="font-semibold text-teks-lembut">Draft</b> — penugasan menunggu di sini
              sampai Anda periksa dan kirim.
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

            <div className="scrollbar-lembut -mx-1 flex flex-col gap-3 px-1 py-1 lg:max-h-[560px] lg:overflow-y-auto lg:overscroll-contain">
              {daftar.map((d, i) => {
                const sedangDiedit = editId === d.id
                const kurang = kekuranganDraf(d)
                const lengkap = kurang.length === 0
                const peringatan = peringatanDraf(d, daftar, petugas)
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
                        {d.nama ? (
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
                              {d.nama || 'Belum ada nama petugas'}
                            </b>
                            {sedangDiedit ? (
                              <Pil status="Diproses">Diedit</Pil>
                            ) : (
                              <Pil status="Menunggu">Draf</Pil>
                            )}
                          </div>
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            <TagJabatan jabatan={d.jabatan} />
                            <span className="num inline-flex items-center rounded-[7px] bg-[#F3F7F4] px-2 py-0.5 text-[11.5px] font-semibold text-teks-lembut">
                              {formatTanggal(d.tanggal).tanggal}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-[7px] bg-[#F3F7F4] px-2 py-0.5 text-[11.5px] font-semibold text-teks-lembut">
                              <Ikon.Jam size={11} />
                              <span className="num">
                                {formatJam(d.mulai)} – {formatJam(d.selesai)}
                              </span>
                            </span>
                            <span className="num inline-flex items-center rounded-[7px] bg-emas-lembut px-2 py-0.5 text-[11.5px] font-semibold text-emas-teks">
                              {lamaLembur(d.mulai, d.selesai)}
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
                        {d.keterangan || 'Belum ada keterangan tugas.'}
                      </p>

                      {peringatan.length > 0 && (
                        <ul className="m-0 mt-3 list-none space-y-1 rounded-[10px] border border-tanah/30 bg-tanah-lembut p-2.5">
                          {peringatan.map((t) => (
                            <li
                              key={t}
                              className="flex gap-1.5 text-[11.5px] font-semibold leading-relaxed text-tanah-teks"
                            >
                              <span className="mt-px flex-none">
                                <Ikon.Awas size={12} />
                              </span>
                              {t}
                            </li>
                          ))}
                        </ul>
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
                        <Tombol
                          kecil
                          className="flex-1"
                          disabled={!lengkap}
                          onClick={() => onKirim(d.id)}
                        >
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

            <Tombol
              lebar
              varian="hantu"
              className="mt-3.5"
              disabled={siapKirim === 0}
              onClick={onKirimSemua}
            >
              <Ikon.Kirim size={15} />
              {siapKirim === 0
                ? 'Belum ada draf yang siap dikirim'
                : `Kirim ${siapKirim} draf yang siap`}
            </Tombol>
          </>
        )}
      </IsiKartu>
    </Kartu>
  )
}
