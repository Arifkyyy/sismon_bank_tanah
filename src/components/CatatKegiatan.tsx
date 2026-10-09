import { useEffect, useState } from 'react'
import { KartuDataPending, type Draf } from '@/components/Draf'
import { FotoBukti, MAKS_FOTO } from '@/components/FotoBukti'
import { AreaTeks, IsiKartu, KakiForm, Kartu, Kolom, KopKartu, Pil, Saklar, Tombol } from '@/components/ui'
import { useAuth } from '@/context/AuthContext'
import { Ikon } from '@/lib/ikon'
import { api, pesanGalat } from '@/lib/api'
import { useApi } from '@/lib/useApi'
import { bacaDraf, hapusDraf as buangDrafPerangkat, simpanDraf as simpanDrafPerangkat } from '@/lib/simpanDraf'
import { sekarangWib } from '@/lib/tanggal'
import { cn } from '@/lib/util'
import type { Petugas } from '@/types'

function formKosong() {
  return { keterangan: '', foto: [] as string[], kendala: false }
}

/**
 * Satu form untuk catatan aktivitas dan laporan kendala. Saklar "Ada kendala"
 * hanya menentukan tujuan simpan: mati → logbook, menyala → kendala.
 *
 * Tanggal dan jam tidak diisi petugas: diambil otomatis (WIB) saat Simpan,
 * karena saat itulah fotonya baru diambil. Draf tetap ditahan di "Cek Laporan"
 * supaya petugas bisa memeriksa ulang sebelum mengirim.
 */
export function CatatKegiatan({ onTerkirim }: { onTerkirim?: (kendala: boolean) => void }) {
  const { akun } = useAuth()
  const [form, setForm] = useState(formKosong)
  const [kameraTerbuka, setKameraTerbuka] = useState(false)
  const [pending, setPending] = useState<Draf[]>([])
  const [editId, setEditId] = useState<string | null>(null)
  const [galatKirim, setGalatKirim] = useState<string | null>(null)
  const [terkirim, setTerkirim] = useState<string | null>(null)

  // Draf dan isian form disimpan di perangkat, supaya tidak hilang saat halaman
  // dimuat ulang atau tab ditutup HP. Kuncinya per akun.
  const kunciDraf = akun ? `catatan:${akun.id}` : null
  const [drafDimuat, setDrafDimuat] = useState(false)

  useEffect(() => {
    if (!kunciDraf) return
    let batal = false
    void bacaDraf<{ form: ReturnType<typeof formKosong>; pending: Draf[] }>(kunciDraf).then((isi) => {
      if (batal) return
      if (isi) {
        // Digabung, bukan ditimpa, kalau petugas sudah sempat menyimpan draf baru sebelum ini selesai dimuat.
        setPending((list) => [...(isi.pending ?? []).filter((d) => !list.some((x) => x.id === d.id)), ...list])
        setForm((f) => (f.keterangan || f.foto.length ? f : (isi.form ?? f)))
      }
      setDrafDimuat(true)
    })
    return () => {
      batal = true
    }
  }, [kunciDraf])

  useEffect(() => {
    if (!kunciDraf || !drafDimuat) return
    const kosong = pending.length === 0 && !form.keterangan && form.foto.length === 0 && !form.kendala
    void (kosong ? buangDrafPerangkat(kunciDraf) : simpanDrafPerangkat(kunciDraf, { form, pending }))
  }, [kunciDraf, drafDimuat, form, pending])

  // Backend hanya mengembalikan data akun yang sedang masuk.
  const { data: petugas } = useApi<Petugas[]>('/api/petugas', [])
  const saya = petugas.find((p) => p.id === akun?.id)

  function tambahFoto(foto: string) {
    setForm((f) => ({ ...f, foto: [...f.foto, foto].slice(0, MAKS_FOTO) }))
  }

  function hapusFoto(indeks: number) {
    setForm((f) => ({ ...f, foto: f.foto.filter((_, i) => i !== indeks) }))
  }

  function kosongkan() {
    setEditId(null)
    setForm(formKosong())
    setKameraTerbuka(false)
  }

  function simpanDraf() {
    const pemilik = { nama: saya?.nama ?? '', jabatan: saya?.jabatan ?? ('' as const) }
    if (editId) {
      // Waktu catatan tetap waktu Simpan pertama, bukan waktu mengedit.
      setPending((list) => list.map((p) => (p.id === editId ? { ...p, ...form, ...pemilik } : p)))
    } else {
      setPending((list) => [...list, { id: crypto.randomUUID(), ...sekarangWib(), ...form, ...pemilik }])
    }
    setTerkirim(null)
    kosongkan()
  }

  function editDraf(p: Draf) {
    setEditId(p.id)
    setForm({ keterangan: p.keterangan, foto: p.foto, kendala: !!p.kendala })
    setKameraTerbuka(false)
  }

  function hapusDraf(id: string) {
    setPending((list) => list.filter((p) => p.id !== id))
    if (editId === id) kosongkan()
  }

  /** Draf dibuang setelah server menerimanya; kalau gagal, foto dan keterangannya tetap ada. */
  async function kirimDraf(id: string) {
    const p = pending.find((x) => x.id === id)
    if (!p) return
    if (!saya) {
      setGalatKirim('Akun Anda tidak ditemukan di data petugas. Hubungi admin.')
      return
    }
    setGalatKirim(null)
    setTerkirim(null)
    try {
      await api(p.kendala ? '/api/kendala' : '/api/logbook', 'POST', {
        petugasId: saya.id,
        tanggal: p.tanggal,
        jam: p.jam,
        keterangan: p.keterangan,
        foto: p.foto,
      })
      hapusDraf(id)
      setTerkirim(p.kendala ? 'Laporan kendala terkirim ke admin.' : 'Catatan aktivitas terkirim.')
      onTerkirim?.(!!p.kendala)
    } catch (e) {
      setGalatKirim(pesanGalat(e))
    }
  }

  const kendala = form.kendala

  return (
    <div className="grid grid-cols-1 gap-4.5 xl:grid-cols-[1.3fr_1fr]">
      <Kartu className={cn('self-start transition-shadow', kendala && 'ring-2 ring-emas')}>
        <KopKartu
          judul="Catat Kegiatan"
          sub="Ambil foto, tulis keterangan, lalu simpan untuk dicek sebelum dikirim"
          aksi={editId ? <Pil status="Diproses">Mengedit draf</Pil> : undefined}
        />
        <IsiKartu>
          <div className="flex flex-col gap-4">
            <Kolom label="Foto" wajib bantu={`Bisa lebih dari satu, maksimal ${MAKS_FOTO} foto.`}>
              <FotoBukti
                foto={form.foto}
                kameraTerbuka={kameraTerbuka}
                // Kendala biasanya memotret objeknya, bukan wajah petugas.
                hadapAwal={kendala ? 'environment' : 'user'}
                onBuka={() => setKameraTerbuka(true)}
                onTutup={() => setKameraTerbuka(false)}
                onAmbil={tambahFoto}
                onHapus={hapusFoto}
              />
            </Kolom>

            <Kolom label="Keterangan" wajib>
              <AreaTeks
                value={form.keterangan}
                onChange={(e) => setForm((f) => ({ ...f, keterangan: e.target.value }))}
                placeholder={
                  kendala
                    ? 'Jelaskan masalahnya, lokasinya, dan sejak kapan terjadi.'
                    : 'Tulis apa yang Anda kerjakan, di mana, dan kondisi yang Anda temukan.'
                }
                className="min-h-[120px]"
              />
            </Kolom>

            <div>
              <Saklar
                nyala={kendala}
                onUbah={(v) => setForm((f) => ({ ...f, kendala: v }))}
                label="Ada kendala / masalah?"
                warna="emas"
              />
              {kendala && (
                <p className="m-0 mt-2 flex items-start gap-1.5 text-[12px] leading-relaxed text-emas-teks">
                  <Ikon.Info size={14} className="mt-px flex-none" />
                  Laporan ini akan dikirim ke admin untuk ditindaklanjuti
                </p>
              )}
            </div>
          </div>
        </IsiKartu>
        <KakiForm>
          {editId && (
            <Tombol varian="hantu" onClick={kosongkan}>
              Batal
            </Tombol>
          )}
          <Tombol onClick={simpanDraf}>
            {editId ? 'Simpan perubahan' : kendala ? 'Simpan laporan' : 'Simpan'}
          </Tombol>
        </KakiForm>
      </Kartu>

      <div className="grid content-start gap-4.5">
        {galatKirim && (
          <div className="flex items-start gap-2 rounded-xl border border-merah/30 bg-merah-lembut px-3.5 py-2.5 text-[12px] leading-relaxed text-merah-teks">
            <Ikon.Awas size={14} className="mt-px flex-none" />
            <span>{galatKirim}</span>
          </div>
        )}
        {terkirim && (
          <div className="flex items-start gap-2 rounded-xl border border-hijau/30 bg-hijau-lembut px-3.5 py-2.5 text-[12px] leading-relaxed text-hijau-tua">
            <Ikon.Centang size={14} className="mt-px flex-none" />
            <span>{terkirim}</span>
          </div>
        )}
        <KartuDataPending
          daftar={pending}
          editId={editId}
          onEdit={editDraf}
          onKirim={kirimDraf}
          onHapus={hapusDraf}
        />
      </div>
    </div>
  )
}
