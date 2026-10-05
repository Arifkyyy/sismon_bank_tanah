import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CatatKegiatan } from '@/components/CatatKegiatan'
import { TumpukanFoto } from '@/components/Foto'
import { ModalSelesaiKendala } from '@/components/ModalSelesaiKendala'
import { LinimasaRiwayat, type PosRiwayat } from '@/components/Riwayat'
import { StatusData } from '@/components/StatusData'
import { TagAktivitas, TagKendala } from '@/components/TagCatatan'
import { IsiKartu, Kartu, KopKartu, Pil, Segmen, Tombol } from '@/components/ui'
import { useAuth } from '@/context/AuthContext'
import { Ikon } from '@/lib/ikon'
import { api, pesanGalat, query } from '@/lib/api'
import { useApi } from '@/lib/useApi'
import { dariIso, keIso, sekarangWib } from '@/lib/tanggal'
import type { Kendala, Logbook } from '@/types'

/** Rentang daftar. Kendala yang masih harus ditangani tetap tampil walau lebih lama. */
const JUMLAH_HARI = 30

type Saringan = 'Semua' | 'Aktivitas' | 'Kendala'
const SARINGAN: Saringan[] = ['Semua', 'Aktivitas', 'Kendala']

/** ?jenis=kendala ↔ 'Kendala' — dipakai tautan dari dashboard dan notifikasi. */
function dariParam(nilai: string | null): Saringan {
  if (nilai === 'kendala') return 'Kendala'
  if (nilai === 'aktivitas') return 'Aktivitas'
  return 'Semua'
}

type Butir =
  | { jenis: 'aktivitas'; tanggalIso: string; jam: string; data: Logbook }
  | { jenis: 'kendala'; tanggalIso: string; jam: string; data: Kendala }

function Keterangan({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#F3F7F4] px-2 py-1 text-[11.5px] font-semibold text-teks-lembut">
      {children}
    </span>
  )
}

/**
 * Satu daftar campuran catatan aktivitas dan laporan kendala milik petugas,
 * terbaru di atas, dikelompokkan per hari. Kendala yang penangannya petugas ini
 * membawa tombol tindak lanjut.
 */
export function CatatanHarian() {
  const { akun } = useAuth()
  const [param, setParam] = useSearchParams()
  const saringan = dariParam(param.get('jenis'))
  const [sibuk, setSibuk] = useState<number | null>(null)
  const [galatAksi, setGalatAksi] = useState<string | null>(null)
  const [diselesaikan, setDiselesaikan] = useState<Kendala | null>(null)

  const { hariIni, kemarin, dari } = useMemo(() => {
    const kini = sekarangWib().tanggal
    const geser = (hari: number) => {
      const t = dariIso(kini)
      t.setDate(t.getDate() - hari)
      return keIso(t)
    }
    return { hariIni: kini, kemarin: geser(1), dari: geser(JUMLAH_HARI - 1) }
  }, [])

  // Backend membatasi sendiri: petugas hanya menerima miliknya dan yang ditugaskan kepadanya.
  const logbook = useApi<Logbook[]>(`/api/logbook${query({ dari, batas: 1000 })}`, [])
  const kendala = useApi<Kendala[]>(`/api/kendala${query({ dari, batas: 1000 })}`, [])
  const perlu = useApi<Kendala[]>(`/api/kendala${query({ milik: 'ditangani', terbuka: 'true' })}`, [])

  const memuat = logbook.memuat || kendala.memuat || perlu.memuat
  const galat = logbook.galat ?? kendala.galat ?? perlu.galat
  function muatUlang() {
    logbook.muat()
    kendala.muat()
    perlu.muat()
  }

  // Form ada di atas daftar; tautan bersaringan (dashboard, notifikasi) langsung
  // digulir ke daftarnya supaya kendala yang dicari tidak tertutup form.
  const daftarRef = useRef<HTMLDivElement>(null)
  function keDaftar() {
    daftarRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  const adaSaringanAwal = useRef(param.has('jenis'))
  useEffect(() => {
    if (adaSaringanAwal.current) daftarRef.current?.scrollIntoView({ block: 'start' })
  }, [])

  function pilih(s: Saringan) {
    setParam(s === 'Semua' ? {} : { jenis: s.toLowerCase() }, { replace: true })
  }

  const butir = useMemo<Butir[]>(() => {
    // Kendala lama yang masih ditugaskan ikut digabung; id kembar dibuang.
    const semuaKendala = new Map<number, Kendala>()
    for (const k of [...kendala.data, ...perlu.data]) if (k.id) semuaKendala.set(k.id, k)
    const hasil: Butir[] = []
    if (saringan !== 'Kendala') {
      for (const l of logbook.data) hasil.push({ jenis: 'aktivitas', tanggalIso: l.tanggalIso ?? '', jam: l.jam, data: l })
    }
    if (saringan !== 'Aktivitas') {
      for (const k of semuaKendala.values()) hasil.push({ jenis: 'kendala', tanggalIso: k.tanggalIso ?? '', jam: k.jam, data: k })
    }
    return hasil.sort((a, b) => b.tanggalIso.localeCompare(a.tanggalIso) || b.jam.localeCompare(a.jam))
  }, [logbook.data, kendala.data, perlu.data, saringan])

  async function mulai(k: Kendala) {
    if (!k.id) return
    setSibuk(k.id)
    setGalatAksi(null)
    try {
      await api(`/api/kendala/${k.id}/mulai`, 'POST')
      kendala.muat()
      perlu.muat()
    } catch (e) {
      setGalatAksi(pesanGalat(e))
    } finally {
      setSibuk(null)
    }
  }

  function labelHari(iso: string, teks: string) {
    if (iso === hariIni) return 'Hari ini'
    if (iso === kemarin) return 'Kemarin'
    return teks
  }

  const pos: PosRiwayat[] = butir.map((b) => {
    if (b.jenis === 'aktivitas') {
      const l = b.data
      return {
        id: `l-${l.id}`,
        tanggal: labelHari(b.tanggalIso, l.tanggal),
        hari: l.hari,
        jam: l.jam,
        keterangan: l.keterangan,
        status: 'Selesai',
        foto: l.fotoUrl,
        fotoVarian: l.foto,
        label: <TagAktivitas />,
        tanda:
          l.lembur === '—' ? undefined : (
            <span className="inline-flex items-center gap-1 rounded-full bg-emas-lembut px-2 py-1 text-[11.5px] font-semibold text-emas-teks">
              <Ikon.Jam size={11} />
              <span className="num">{l.lembur}</span> lembur
            </span>
          ),
      }
    }

    const k = b.data
    const sayaPenangan = !!akun && k.penangan?.id === akun.id
    const perluTindakan = sayaPenangan && k.status !== 'Selesai'
    return {
      id: `k-${k.id}`,
      tanggal: labelHari(b.tanggalIso, k.tanggal),
      hari: k.hari,
      jam: k.jam,
      keterangan: k.keterangan,
      status: k.status,
      foto: k.fotoSebelum ?? k.fotoUrl,
      fotoVarian: k.foto,
      sorot: perluTindakan,
      label: (
        <>
          <TagKendala />
          <Pil status={k.status} />
        </>
      ),
      tanda: (
        <>
          {k.pelaporId !== akun?.id && <Keterangan>Dilaporkan oleh {k.nama}</Keterangan>}
          {k.penangan && !sayaPenangan && <Keterangan>Ditangani {k.penangan.nama}</Keterangan>}
        </>
      ),
      tambahan:
        k.status === 'Selesai' && (k.keteranganSelesai || k.fotoSesudah?.length) ? (
          <div className="mt-3 flex items-start gap-3 rounded-lg bg-hijau-lembut/60 p-2.5">
            {!!k.fotoSesudah?.length && (
              <TumpukanFoto foto={k.fotoSesudah} judul={`Foto sesudah · ${k.tanggal}`} maksTampil={2} />
            )}
            <div className="min-w-0 text-[12px] leading-relaxed text-hijau-tua">
              <b className="block font-semibold">
                Selesai{k.selesaiPada ? ` · ${k.selesaiPada}` : ''}
                {k.diselesaikanOleh ? ` · ${k.diselesaikanOleh}` : ''}
              </b>
              {k.keteranganSelesai}
            </div>
          </div>
        ) : perluTindakan ? (
          <div className="mt-3 flex flex-wrap items-center justify-end gap-2 border-t border-garis pt-3">
            {k.dibukaLagiPada && (
              <span className="mr-auto text-[11.5px] font-semibold text-tanah-teks">
                Dibuka lagi oleh admin · {k.dibukaLagiPada}
              </span>
            )}
            {k.status === 'Baru' ? (
              <Tombol kecil onClick={() => mulai(k)} disabled={sibuk === k.id}>
                <Ikon.Kirim size={13} /> {sibuk === k.id ? 'Memproses…' : 'Mulai tangani'}
              </Tombol>
            ) : (
              <Tombol kecil onClick={() => setDiselesaikan(k)}>
                <Ikon.Centang size={13} /> Tandai selesai
              </Tombol>
            )}
          </div>
        ) : undefined,
    }
  })

  return (
    <>
      {perlu.data.length > 0 && (
        <button
          type="button"
          onClick={() => {
            pilih('Kendala')
            keDaftar()
          }}
          className="mb-4.5 flex w-full items-center gap-3 rounded-kartu border border-emas/60 bg-emas-lembut px-4.5 py-3.5 text-left text-emas-teks transition hover:shadow-kartu"
        >
          <Ikon.Awas size={18} className="flex-none" />
          <span className="flex-1 text-[13px] font-semibold">
            Kendala yang perlu kamu tangani: <span className="num">{perlu.data.length}</span>
          </span>
          <Ikon.Chevron size={16} className="flex-none rotate-90" />
        </button>
      )}

      <section aria-label="Catat Kegiatan" className="mb-4.5">
        <CatatKegiatan
          onTerkirim={(adaKendala) => {
            logbook.muat()
            if (adaKendala) {
              kendala.muat()
              perlu.muat()
            }
          }}
        />
      </section>

      <div ref={daftarRef} className="scroll-mt-[calc(var(--tinggi-topbar)+16px)]">
        <Kartu>
          <KopKartu
            judul="Catatan Harian"
            sub={`Aktivitas dan kendala ${JUMLAH_HARI} hari terakhir · kendala yang masih kamu tangani selalu tampil`}
          />
          <IsiKartu className="border-b border-garis p-4">
            <Segmen lebar opsi={SARINGAN} nilai={saringan} onPilih={(v) => pilih(v as Saringan)} />
          </IsiKartu>
          <StatusData memuat={memuat} galat={galat ?? galatAksi} onUlang={muatUlang} />
          <LinimasaRiwayat
            pos={pos}
            maksTinggi={0}
            kosong={
              saringan === 'Kendala'
                ? 'Tidak ada laporan kendala.'
                : saringan === 'Aktivitas'
                  ? 'Belum ada catatan aktivitas.'
                  : 'Belum ada catatan. Isi form Catat Kegiatan di atas untuk mulai.'
            }
          />
        </Kartu>
      </div>

      {diselesaikan && (
        <ModalSelesaiKendala
          kendala={diselesaikan}
          fotoWajib
          onTutup={() => setDiselesaikan(null)}
          onSelesai={() => {
            setDiselesaikan(null)
            kendala.muat()
            perlu.muat()
          }}
        />
      )}
    </>
  )
}
