import { useState } from 'react'
import { StatusData } from '@/components/StatusData'
import { FormShift } from '@/components/shift/FormShift'
import { KodeShift } from '@/components/shift/KodeShift'
import { IsiKartu, Kartu, KopKartu, TagJabatan, Tombol, TombolIkon } from '@/components/ui'
import { useKonfirmasi } from '@/context/KonfirmasiContext'
import { api, pesanGalat } from '@/lib/api'
import { Ikon } from '@/lib/ikon'
import { labelJam } from '@/lib/shift'
import { useApi } from '@/lib/useApi'
import { cn, DAFTAR_JABATAN, JABATAN_PANJANG } from '@/lib/util'
import type { Jabatan, Shift } from '@/types'

/**
 * Tab "Jenis Shift": shift dikelompokkan per jabatan. Shift yang berlaku
 * untuk beberapa jabatan tampil di setiap kelompoknya. Libur disediakan
 * sistem dan tampil terpisah.
 */
export function TabJenisShift() {
  const jenis = useApi<Shift[]>('/api/shift/jenis?semua=true', [])
  const konfirmasi = useKonfirmasi()
  const [form, setForm] = useState<{ awal: Shift | null; jabatan: Jabatan } | null>(null)
  const [sibuk, setSibuk] = useState<number | null>(null)
  const [galat, setGalat] = useState('')

  const sistem = jenis.data.filter((s) => s.sistem)
  // Yang aktif dulu, lalu urut jam mulai.
  const urut = jenis.data
    .filter((s) => !s.sistem)
    .sort((a, b) => Number(b.aktif) - Number(a.aktif) || (a.mulai ?? '').localeCompare(b.mulai ?? ''))

  function tersimpan(s: Shift) {
    jenis.setData((d) => (d.some((x) => x.id === s.id) ? d.map((x) => (x.id === s.id ? s : x)) : [...d, s]))
    setForm(null)
  }

  async function jalankan(s: Shift, aksi: () => Promise<void>) {
    setSibuk(s.id)
    setGalat('')
    try {
      await aksi()
    } catch (e) {
      setGalat(pesanGalat(e))
    } finally {
      setSibuk(null)
    }
  }

  async function aturAktif(s: Shift) {
    if (
      s.aktif &&
      !(await konfirmasi({
        judul: `Nonaktifkan shift ${s.nama}?`,
        pesan: 'Shift ini tidak lagi muncul di pilihan saat menyusun jadwal. Jadwal yang sudah memakainya tetap tampil.',
        tombol: 'Nonaktifkan',
        nada: 'peringatan',
      }))
    )
      return
    await jalankan(s, async () => {
      tersimpan(await api<Shift>(`/api/shift/jenis/${s.id}/aktif`, 'POST', { aktif: !s.aktif }))
    })
  }

  async function hapus(s: Shift) {
    if (
      !(await konfirmasi({
        judul: `Hapus shift ${s.nama}?`,
        pesan: 'Shift ini belum pernah dipakai di jadwal, jadi bisa dihapus permanen.',
        tombol: 'Hapus',
        nada: 'bahaya',
      }))
    )
      return
    await jalankan(s, async () => {
      await api(`/api/shift/jenis/${s.id}`, 'DELETE')
      jenis.setData((d) => d.filter((x) => x.id !== s.id))
    })
  }

  return (
    // grid-cols-1 = minmax(0,1fr): tabel jadwal yang lebar menggulir di dalam kartunya,
    // bukan melebarkan seluruh halaman melewati layar.
    <div className="grid grid-cols-1 gap-4.5">
      <StatusData memuat={jenis.memuat && !jenis.data.length} galat={jenis.galat} onUlang={jenis.muat} />
      {galat && (
        <div className="flex items-start gap-2 rounded-xl border border-merah/30 bg-merah-lembut px-3.5 py-2.5 text-[12.5px] text-merah-teks">
          <Ikon.Awas size={15} className="mt-px flex-none" />
          <span className="flex-1">{galat}</span>
          <button type="button" aria-label="Tutup" onClick={() => setGalat('')} className="text-merah-teks/70 hover:text-merah-teks">
            <Ikon.Silang size={14} />
          </button>
        </div>
      )}

      {sistem.length > 0 && (
        <Kartu>
          <KopKartu judul="Shift sistem" sub="Disediakan sistem, berlaku untuk semua jabatan, dan tidak bisa diubah" />
          <IsiKartu className="flex flex-wrap gap-3">
            {sistem.map((s) => (
              <ChipShift key={s.id} shift={s} />
            ))}
          </IsiKartu>
        </Kartu>
      )}

      <div className="grid grid-cols-1 gap-4.5 xl:grid-cols-2">
        {DAFTAR_JABATAN.map((j) => {
          const milik = urut.filter((s) => s.jabatan.includes(j))
          const aktif = milik.filter((s) => s.aktif).length
          return (
            <Kartu key={j}>
              <KopKartu
                judul={JABATAN_PANJANG[j]}
                sub={aktif ? `${aktif} shift aktif` : 'Belum ada shift aktif'}
                aksi={
                  // HP: label diringkas supaya tombol muat sebaris dengan nama jabatan.
                  <Tombol kecil onClick={() => setForm({ awal: null, jabatan: j })} aria-label="Tambah shift">
                    <Ikon.Tambah size={14} />
                    <span className="max-sm:hidden">Tambah shift</span>
                    <span className="sm:hidden">Tambah</span>
                  </Tombol>
                }
              />
              <IsiKartu className="grid gap-2.5">
                {milik.length === 0 && !jenis.memuat && (
                  <p className="m-0 rounded-xl border border-dashed border-garis-kuat px-4 py-5 text-center text-[12.5px] text-teks-samar">
                    Belum ada shift untuk {JABATAN_PANJANG[j]}. Tambahkan shift sesuai jadwal kerja jabatan ini.
                  </p>
                )}
                {milik.map((s) => (
                  <ChipShift
                    key={s.id}
                    shift={s}
                    jabatanKelompok={j}
                    sibuk={sibuk === s.id}
                    onUbah={() => setForm({ awal: s, jabatan: j })}
                    onAktif={() => void aturAktif(s)}
                    onHapus={s.dipakai ? undefined : () => void hapus(s)}
                  />
                ))}
              </IsiKartu>
            </Kartu>
          )
        })}
      </div>

      {form && (
        <FormShift
          awal={form.awal}
          jabatanAwal={form.jabatan}
          onTutup={() => setForm(null)}
          onTersimpan={tersimpan}
        />
      )}
    </div>
  )
}

/** Satu shift: kode berwarna, nama, jam, dan tombol aksinya. Tanpa aksi = shift sistem. */
function ChipShift({
  shift: s,
  jabatanKelompok,
  sibuk,
  onUbah,
  onAktif,
  onHapus,
}: {
  shift: Shift
  /** jabatan kelompok tempat chip ini tampil; jabatan lain ditampilkan sebagai "juga untuk" */
  jabatanKelompok?: Jabatan
  sibuk?: boolean
  onUbah?: () => void
  onAktif?: () => void
  onHapus?: () => void
}) {
  const label = labelJam(s)
  const lain = jabatanKelompok ? s.jabatan.filter((j) => j !== jabatanKelompok) : []
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-3 rounded-xl border border-garis px-3.5 py-2.5',
        s.aktif ? 'bg-white' : 'bg-[#F7FAF8]',
      )}
    >
      <KodeShift shift={s} ukuran={36} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <b className={cn('text-[13.5px] font-semibold', s.aktif ? 'text-ink' : 'text-teks-lembut')}>{s.nama}</b>
          {!s.aktif && (
            <span className="rounded-full bg-[#EEF2F0] px-2 py-0.5 text-[10.5px] font-semibold text-teks-lembut">
              Nonaktif
            </span>
          )}
          {s.sistem && (
            <span className="rounded-full bg-[#EEF2F0] px-2 py-0.5 text-[10.5px] font-semibold text-teks-lembut">
              Semua jabatan
            </span>
          )}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[12px] text-teks-lembut">
          <span className="num">{s.rentang ?? 'Tanpa jam kerja'}</span>
          {label && (
            <span className="rounded-md bg-emas-lembut px-1.5 py-px text-[10.5px] font-semibold text-emas-teks">
              {label}
            </span>
          )}
          {lain.length > 0 && (
            <span className="flex flex-wrap items-center gap-1">
              · juga untuk {lain.map((j) => <TagJabatan key={j} jabatan={j} />)}
            </span>
          )}
        </div>
      </div>
      {onUbah && (
        <div className="flex items-center gap-1.5">
          <Tombol varian="hantu" kecil onClick={onAktif} disabled={sibuk}>
            {s.aktif ? 'Nonaktifkan' : 'Aktifkan'}
          </Tombol>
          <TombolIkon label={`Ubah ${s.nama}`} onClick={onUbah} disabled={sibuk}>
            <Ikon.Pena size={15} />
          </TombolIkon>
          {onHapus && (
            <TombolIkon label={`Hapus ${s.nama}`} bahaya onClick={onHapus} disabled={sibuk}>
              <Ikon.Sampah size={15} />
            </TombolIkon>
          )}
        </div>
      )}
    </div>
  )
}
