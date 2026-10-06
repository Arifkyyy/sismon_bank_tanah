import { useMemo, useState } from 'react'
import { PratinjauFoto } from '@/components/Foto'
import { Modal } from '@/components/Modal'
import { ModalSelesaiKendala } from '@/components/ModalSelesaiKendala'
import { StatusData } from '@/components/StatusData'
import { AreaTeks, Avatar, Kolom, Pil, Pilihan, Tombol } from '@/components/ui'
import { Ikon, type NamaIkon } from '@/lib/ikon'
import { api, pesanGalat } from '@/lib/api'
import { useApi } from '@/lib/useApi'
import { DAFTAR_JABATAN, JABATAN_PANJANG, cn } from '@/lib/util'
import type { DetailKendala, JenisRiwayatKendala, Kendala, Petugas } from '@/types'

function KotakGalat({ pesan }: { pesan: string | null }) {
  if (!pesan) return null
  return (
    <div className="mt-3 flex items-start gap-2 rounded-xl border border-merah/30 bg-merah-lembut px-3.5 py-2.5 text-[12px] leading-relaxed text-merah-teks">
      <Ikon.Awas size={14} className="mt-px flex-none" />
      <span>{pesan}</span>
    </div>
  )
}

/* -------------------------------------------------------------- Tugaskan */

/** Pilih petugas aktif sebagai penangan baru, dikelompokkan per jabatan. */
export function ModalTugaskan({
  kendala,
  onTutup,
  onBerhasil,
}: {
  kendala: Kendala
  onTutup: () => void
  onBerhasil: () => void
}) {
  const { data: petugas, memuat } = useApi<Petugas[]>('/api/petugas', [])
  const aktif = useMemo(
    () => petugas.filter((p) => p.status === 'Aktif' && p.id !== kendala.penangan?.id),
    [petugas, kendala.penangan?.id],
  )
  const [pilihan, setPilihan] = useState('')
  const [sibuk, setSibuk] = useState(false)
  const [galat, setGalat] = useState<string | null>(null)

  function tutup() {
    if (!sibuk) onTutup()
  }

  async function simpan() {
    if (!pilihan || !kendala.id) return
    setSibuk(true)
    setGalat(null)
    try {
      await api(`/api/kendala/${kendala.id}/penangan`, 'PATCH', { penanganId: Number(pilihan) })
      onBerhasil()
    } catch (e) {
      setGalat(pesanGalat(e))
      setSibuk(false)
    }
  }

  return (
    <Modal
      judul="Tugaskan kendala"
      sub={`${kendala.nama} · ${kendala.tanggal} · ${kendala.jam}`}
      onTutup={tutup}
      aksi={
        <>
          <Tombol varian="hantu" onClick={tutup} disabled={sibuk}>
            Batal
          </Tombol>
          <Tombol onClick={simpan} disabled={!pilihan || sibuk}>
            <Ikon.Orang size={15} /> {sibuk ? 'Menyimpan…' : 'Tugaskan'}
          </Tombol>
        </>
      }
    >
      <p className="m-0 mb-3 text-[12.5px] leading-relaxed text-teks-lembut">
        Penangan sekarang: <b className="font-semibold text-ink">{kendala.penangan?.nama ?? 'belum ada'}</b>
      </p>
      <Kolom label="Tugaskan ke" wajib bantu="Hanya petugas berstatus Aktif yang bisa dipilih.">
        <Pilihan autoFocus value={pilihan} onChange={(e) => setPilihan(e.target.value)} disabled={memuat}>
          <option value="">{memuat ? 'Memuat petugas…' : 'Pilih petugas'}</option>
          {DAFTAR_JABATAN.map((j) => {
            const isi = aktif.filter((p) => p.jabatan === j)
            if (!isi.length) return null
            return (
              <optgroup key={j} label={JABATAN_PANJANG[j]}>
                {isi.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nama}
                  </option>
                ))}
              </optgroup>
            )
          })}
        </Pilihan>
      </Kolom>
      <KotakGalat pesan={galat} />
    </Modal>
  )
}

/* -------------------------------------------------------------- Buka lagi */

export function ModalBukaLagi({
  kendala,
  onTutup,
  onBerhasil,
}: {
  kendala: Kendala
  onTutup: () => void
  onBerhasil: () => void
}) {
  const [alasan, setAlasan] = useState('')
  const [sibuk, setSibuk] = useState(false)
  const [galat, setGalat] = useState<string | null>(null)

  function tutup() {
    if (!sibuk) onTutup()
  }

  async function simpan() {
    if (!alasan.trim() || !kendala.id) return
    setSibuk(true)
    setGalat(null)
    try {
      await api(`/api/kendala/${kendala.id}/buka-lagi`, 'POST', { alasan: alasan.trim() })
      onBerhasil()
    } catch (e) {
      setGalat(pesanGalat(e))
      setSibuk(false)
    }
  }

  return (
    <Modal
      judul="Buka lagi kendala"
      sub={`${kendala.nama} · ${kendala.tanggal} · ${kendala.jam}`}
      onTutup={tutup}
      aksi={
        <>
          <Tombol varian="hantu" onClick={tutup} disabled={sibuk}>
            Batal
          </Tombol>
          <Tombol onClick={simpan} disabled={!alasan.trim() || sibuk}>
            <Ikon.Putar size={15} /> {sibuk ? 'Menyimpan…' : 'Buka lagi'}
          </Tombol>
        </>
      }
    >
      <p className="m-0 mb-3 text-[12.5px] leading-relaxed text-teks-lembut">
        Status kembali ke <b className="font-semibold text-ink">Diproses</b> dan{' '}
        {kendala.penangan ? <b className="font-semibold text-ink">{kendala.penangan.nama}</b> : 'penangannya'} perlu
        menandai selesai lagi dengan foto sesudah yang baru.
      </p>
      <Kolom label="Alasan dibuka lagi" wajib>
        <AreaTeks
          autoFocus
          value={alasan}
          onChange={(e) => setAlasan(e.target.value)}
          placeholder="Mis. keran masih menetes setelah dicek ulang."
        />
      </Kolom>
      <KotakGalat pesan={galat} />
    </Modal>
  )
}

/* ----------------------------------------------------------------- Detail */

const IKON_RIWAYAT: Record<JenisRiwayatKendala, { ikon: NamaIkon; warna: string }> = {
  dilaporkan: { ikon: 'Awas', warna: 'bg-tanah-lembut text-tanah-teks' },
  ditugaskan: { ikon: 'Orang', warna: 'bg-[#EAF1F4] text-ink' },
  mulai: { ikon: 'Jam', warna: 'bg-emas-lembut text-emas-teks' },
  status: { ikon: 'Pena', warna: 'bg-[#EAF1F4] text-ink' },
  selesai: { ikon: 'Centang', warna: 'bg-hijau-lembut text-hijau-tua' },
  dibuka_lagi: { ikon: 'Putar', warna: 'bg-tanah-lembut text-tanah-teks' },
}

function KolomFoto({
  judul,
  foto,
  kosong,
  onLihat,
}: {
  judul: string
  foto: string[]
  kosong: string
  onLihat: (i: number) => void
}) {
  return (
    <div className="min-w-0">
      <span className="mb-1.5 block text-[11.5px] font-semibold text-teks-lembut">
        {judul} {foto.length > 0 && <span className="num text-teks-samar">({foto.length})</span>}
      </span>
      {foto.length === 0 ? (
        <div className="grid aspect-[4/3] place-items-center rounded-xl border border-dashed border-garis-kuat bg-[#FAFCFB] px-3 text-center text-[11.5px] text-teks-samar max-sm:aspect-auto max-sm:py-5">
          {kosong}
        </div>
      ) : (
        <div className="grid gap-1.5">
          <button type="button" onClick={() => onLihat(0)} className="overflow-hidden rounded-xl border border-garis">
            <img src={foto[0]} alt={judul} className="aspect-[4/3] w-full object-cover" />
          </button>
          {foto.length > 1 && (
            <div className="grid grid-cols-4 gap-1.5">
              {foto.slice(1, 5).map((url, i) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => onLihat(i + 1)}
                  className="overflow-hidden rounded-lg border border-garis"
                >
                  <img src={url} alt="" className="aspect-square w-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Detail satu kendala: foto sebelum dan sesudah berdampingan, penyelesaian,
 * riwayat, dan semua tindakan admin. `onBerubah` dipanggil setelah tindakan
 * apa pun supaya daftar di halaman ikut diperbarui.
 */
export function ModalDetailKendala({
  id,
  onTutup,
  onBerubah,
}: {
  id: number
  onTutup: () => void
  onBerubah: () => void
}) {
  const { data: k, memuat, galat, muat } = useApi<DetailKendala | null>(`/api/kendala/${id}`, null)
  const [pratinjau, setPratinjau] = useState<{ foto: string[]; mulai: number; judul: string } | null>(null)
  const [anak, setAnak] = useState<'tugaskan' | 'buka' | 'selesai' | null>(null)
  const [sibuk, setSibuk] = useState(false)
  const [galatAksi, setGalatAksi] = useState<string | null>(null)

  function berubah() {
    setAnak(null)
    muat()
    onBerubah()
  }

  async function proses() {
    setSibuk(true)
    setGalatAksi(null)
    try {
      await api(`/api/kendala/${id}/status`, 'PATCH', { status: 'Diproses' })
      berubah()
    } catch (e) {
      setGalatAksi(pesanGalat(e))
    } finally {
      setSibuk(false)
    }
  }

  // Pop-up anak dibuka di atas pop-up ini; Esc pada pop-up anak tidak boleh menutup keduanya.
  const tutup = () => {
    if (!anak && !pratinjau && !sibuk) onTutup()
  }

  return (
    <>
      <Modal
        judul="Detail kendala"
        sub={k ? `${k.tanggal} · ${k.jam}` : undefined}
        lebar="max-w-[720px]"
        onTutup={tutup}
        aksi={
          k && (
            <>
              {k.status === 'Baru' && (
                <Tombol varian="hantu" onClick={proses} disabled={sibuk}>
                  <Ikon.Jam size={15} /> Proses sendiri
                </Tombol>
              )}
              {k.status !== 'Selesai' && (
                <>
                  <Tombol varian="hantu" onClick={() => setAnak('tugaskan')} disabled={sibuk}>
                    <Ikon.Orang size={15} /> Tugaskan ke…
                  </Tombol>
                  <Tombol onClick={() => setAnak('selesai')} disabled={sibuk}>
                    <Ikon.Centang size={15} /> Tandai selesai
                  </Tombol>
                </>
              )}
              {k.status === 'Selesai' && (
                <Tombol varian="hantu" onClick={() => setAnak('buka')}>
                  <Ikon.Putar size={15} /> Buka lagi
                </Tombol>
              )}
            </>
          )
        }
      >
        <StatusData memuat={memuat && !k} galat={galat} onUlang={muat} />
        {k && (
          <div className="flex flex-col gap-4">
            {/* HP: status dipisah dari kartu penangan supaya tidak berdesakan. */}
            <div className="flex items-center justify-between gap-3 sm:hidden">
              <span className="text-[12px] font-semibold text-teks-lembut">Status</span>
              <Pil status={k.status} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-3 rounded-xl border border-garis p-3">
                <Avatar nama={k.nama} jabatan={k.jabatan} foto={k.fotoProfil} />
                <div className="min-w-0">
                  <span className="block text-[11px] text-teks-samar">Pelapor</span>
                  <b className="block truncate text-[13px] font-semibold text-ink">{k.nama}</b>
                  <span className="block text-[11.5px] text-teks-lembut">{JABATAN_PANJANG[k.jabatan]}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-garis p-3">
                {k.penangan ? (
                  <Avatar nama={k.penangan.nama} jabatan={k.penangan.jabatan ?? undefined} foto={k.penangan.fotoProfil} />
                ) : (
                  <span className="grid h-[34px] w-[34px] place-items-center rounded-[10px] border border-dashed border-garis-kuat text-teks-samar">
                    <Ikon.Orang size={15} />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <span className="block text-[11px] text-teks-samar">Penangan</span>
                  <b className="block truncate text-[13px] font-semibold text-ink">{k.penangan?.nama ?? 'Belum ada'}</b>
                  {k.penangan?.jabatan && (
                    <span className="block text-[11.5px] text-teks-lembut">{JABATAN_PANJANG[k.penangan.jabatan]}</span>
                  )}
                </div>
                <span className="max-sm:hidden">
                  <Pil status={k.status} />
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-garis bg-[#F7FAF8] px-3.5 py-3">
              <span className="mb-1 block text-[11px] text-teks-samar">Keterangan kendala</span>
              <p className="m-0 text-[12.5px] leading-relaxed text-ink">{k.keterangan}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <KolomFoto
                judul="Sebelum"
                foto={k.fotoSebelum ?? []}
                kosong="Tidak ada foto"
                onLihat={(i) => setPratinjau({ foto: k.fotoSebelum ?? [], mulai: i, judul: `Foto sebelum · ${k.nama}` })}
              />
              <KolomFoto
                judul="Sesudah"
                foto={k.fotoSesudah ?? []}
                kosong={k.status === 'Selesai' ? 'Diselesaikan tanpa foto' : 'Belum ada foto sesudah'}
                onLihat={(i) => setPratinjau({ foto: k.fotoSesudah ?? [], mulai: i, judul: `Foto sesudah · ${k.nama}` })}
              />
            </div>

            {k.status === 'Selesai' && (
              <div className="rounded-xl border border-hijau/30 bg-hijau-lembut px-3.5 py-3">
                <span className="mb-1 block text-[11px] font-semibold text-hijau-tua">
                  Penyelesaian · {k.selesaiPada}
                  {k.diselesaikanOleh ? ` · ${k.diselesaikanOleh}` : ''}
                </span>
                <p className="m-0 text-[12.5px] leading-relaxed text-ink">
                  {k.keteranganSelesai || <i className="text-teks-samar">Tanpa keterangan (data lama)</i>}
                </p>
              </div>
            )}

            <div>
              <span className="mb-2 block text-[12.5px] font-semibold text-teks-lembut">Riwayat</span>
              <ol className="m-0 list-none p-0">
                {k.riwayat.map((r, i) => {
                  const { ikon, warna } = IKON_RIWAYAT[r.jenis]
                  const Glif = Ikon[ikon]
                  return (
                    <li key={i} className="relative flex gap-3 pb-3 last:pb-0">
                      {i < k.riwayat.length - 1 && (
                        <span aria-hidden className="absolute bottom-0 left-[15px] top-8 w-px bg-garis-kuat/70" />
                      )}
                      <span className={cn('grid h-8 w-8 flex-none place-items-center rounded-full', warna)}>
                        <Glif size={14} />
                      </span>
                      <div className="min-w-0 pt-0.5">
                        <b className="block text-[12.5px] font-semibold text-ink">{r.kejadian}</b>
                        <span className="num block text-[11.5px] text-teks-samar">
                          {r.waktu}
                          {r.oleh ? ` · oleh ${r.oleh}` : ''}
                        </span>
                        {r.catatan && (
                          <p className="m-0 mt-1 text-[12px] leading-relaxed text-teks-lembut">“{r.catatan}”</p>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ol>
            </div>
            <KotakGalat pesan={galatAksi} />
          </div>
        )}
      </Modal>

      {k && anak === 'tugaskan' && <ModalTugaskan kendala={k} onTutup={() => setAnak(null)} onBerhasil={berubah} />}
      {k && anak === 'buka' && <ModalBukaLagi kendala={k} onTutup={() => setAnak(null)} onBerhasil={berubah} />}
      {k && anak === 'selesai' && (
        <ModalSelesaiKendala kendala={k} fotoWajib={false} onTutup={() => setAnak(null)} onSelesai={berubah} />
      )}
      {pratinjau && (
        <PratinjauFoto
          foto={pratinjau.foto}
          mulai={pratinjau.mulai}
          judul={pratinjau.judul}
          onTutup={() => setPratinjau(null)}
        />
      )}
    </>
  )
}
