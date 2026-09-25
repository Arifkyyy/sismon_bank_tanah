import { useState } from 'react'
import { Modal } from '@/components/Modal'
import { StatCard } from '@/components/StatCard'
import { StatusData } from '@/components/StatusData'
import {
  AksiBaris, Baris, InputRapi, Kartu, KopKartu, Pil, PilihRapi, SelOrang, Tabel, TagJabatan, Tombol,
  TombolIkon,
} from '@/components/ui'
import { useKonfirmasi } from '@/context/KonfirmasiContext'
import { Ikon } from '@/lib/ikon'
import { api, pesanGalat, query } from '@/lib/api'
import { useApi } from '@/lib/useApi'
import { formatTanggal, keIso } from '@/lib/tanggal'
import { cn, DAFTAR_JABATAN } from '@/lib/util'
import { sesiItem } from '@/pages/user/KerjaWajib'
import type { ChecklistLembar, ChecklistRingkas, Jabatan, Sesi, Status } from '@/types'

/** Status lembar dipetakan ke warna pil yang sudah ada. */
const PIL: Record<ChecklistRingkas['status'], Status> = {
  Dikirim: 'Selesai',
  Draf: 'Diproses',
  'Belum diisi': 'Menunggu',
}

function Tanda({ status }: { status?: 'Ya' | 'Tidak' }) {
  if (!status) return <span className="text-teks-samar">–</span>
  return status === 'Ya' ? (
    <span className="inline-grid h-5 w-5 place-items-center rounded-[5px] bg-hijau text-white" aria-label="Sudah">
      <Ikon.Centang size={13} strokeWidth={3} />
    </span>
  ) : (
    <span className="inline-grid h-5 w-5 place-items-center rounded-[5px] bg-merah text-white" aria-label="Tidak">
      <Ikon.Silang size={12} strokeWidth={3} />
    </span>
  )
}

/** Isi lembar satu petugas dalam bentuk tabel, seperti lembar SOP kertasnya. */
function IsiLembar({ lembar }: { lembar: ChecklistLembar }) {
  const kolom: Sesi[] = lembar.item.some((i) => i.mode === 'sesi') ? ['Pagi', 'Siang', 'Sore'] : ['Harian']
  const jawaban = new Map(lembar.jawaban.map((j) => [`${j.itemId}|${j.sesi}`, j]))

  return (
    // Tinggi dibatasi supaya pop-up tidak melebihi layar; baris kepala tetap menempel.
    <div className="scrollbar-lembut max-h-[55vh] overflow-auto overscroll-contain rounded-xl border border-garis">
      <table className="w-full border-separate border-spacing-0 text-[12.5px]">
        <thead>
          <tr className="text-left text-[11.5px] text-teks-lembut">
            <th className="sticky top-0 z-[1] w-8 border-b border-garis bg-[#F7FAF8] px-3 py-2.5 font-semibold">No.</th>
            <th className="sticky top-0 z-[1] border-b border-garis bg-[#F7FAF8] px-3 py-2.5 font-semibold">
              Area / kegiatan
            </th>
            {kolom.map((s) => (
              <th
                key={s}
                className="sticky top-0 z-[1] w-16 border-b border-garis bg-[#F7FAF8] px-2 py-2.5 text-center font-semibold"
              >
                {s === 'Harian' ? 'Status' : s}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lembar.item.map((i, n) => {
            const catatan = sesiItem(i)
              .map((s) => ({ s, j: jawaban.get(`${i.id}|${s}`) }))
              .filter(({ j }) => j?.catatan)
            return (
              <tr key={i.id} className="align-top [&:last-child>td]:border-b-0 [&>td]:border-b [&>td]:border-garis">
                <td className="num px-3 py-2.5 text-teks-lembut">{n + 1}</td>
                <td className="px-3 py-2.5">
                  <span className="font-semibold text-ink">{i.teks}</span>
                  {catatan.map(({ s, j }) => (
                    <span
                      key={s}
                      className={cn(
                        'mt-1 block text-[11.5px] leading-relaxed',
                        j?.status === 'Tidak' ? 'text-merah-teks' : 'text-teks-lembut',
                      )}
                    >
                      {s !== 'Harian' && <b className="font-semibold">{s}: </b>}
                      {j?.catatan}
                    </span>
                  ))}
                </td>
                {kolom.map((s) => (
                  <td key={s} className="px-2 py-2.5 text-center">
                    {sesiItem(i).includes(s) ? <Tanda status={jawaban.get(`${i.id}|${s}`)?.status} /> : null}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function KerjaWajibPetugas() {
  const hariIni = keIso(new Date())
  const [tanggal, setTanggal] = useState(hariIni)
  const [jabatan, setJabatan] = useState<Jabatan | 'Semua'>('Semua')
  const [dilihat, setDilihat] = useState<ChecklistRingkas | null>(null)
  const [sibuk, setSibuk] = useState(false)
  const [galatAksi, setGalatAksi] = useState<string | null>(null)
  const konfirmasi = useKonfirmasi()

  const { data: rekap, memuat, galat, muat } = useApi<ChecklistRingkas[]>(
    `/api/checklist${query({ tanggal, jabatan: jabatan === 'Semua' ? '' : jabatan })}`,
    [],
  )
  const lembar = useApi<ChecklistLembar | null>(
    dilihat ? `/api/checklist/lembar${query({ petugas_id: dilihat.petugasId, tanggal })}` : null,
    null,
  )

  // Security dan Messenger belum punya daftar kerja wajib: tidak dihitung di kartu statistik.
  const wajib = rekap.filter((r) => r.totalKotak > 0)
  const jumlah = (s: ChecklistRingkas['status']) => wajib.filter((r) => r.status === s).length
  const temuan = wajib.reduce((n, r) => n + r.tidak, 0)
  const { tanggal: tanggalTeks, hari } = formatTanggal(tanggal)

  function tutup() {
    if (sibuk) return
    setDilihat(null)
    lembar.setData(null)
    setGalatAksi(null)
  }

  async function bukaKunci(r: ChecklistRingkas) {
    if (!r.id) return
    const ya = await konfirmasi({
      judul: 'Buka kunci kerja wajib?',
      pesan: (
        <>
          Lembar milik <b className="font-semibold text-ink">{r.nama}</b> kembali menjadi draf, sehingga petugas
          bisa mengubah dan mengirim ulang isiannya.
        </>
      ),
      tombol: 'Buka kunci',
      nada: 'peringatan',
      ikon: <Ikon.Kunci size={22} />,
    })
    if (!ya) return
    setSibuk(true)
    setGalatAksi(null)
    try {
      await api(`/api/checklist/${r.id}/buka-kunci`, 'POST')
      muat()
      if (dilihat) {
        setDilihat({ ...dilihat, status: 'Draf', dikirimPada: null })
        lembar.muat()
      }
    } catch (e) {
      setGalatAksi(pesanGalat(e))
    } finally {
      setSibuk(false)
    }
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4.5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          nama="Sudah dikirim"
          angka={String(jumlah('Dikirim'))}
          satuan={`/ ${wajib.length}`}
          ikon={<Ikon.Centang size={17} />}
          ket="Petugas yang lembarnya lengkap"
        />
        <StatCard
          nama="Masih draf"
          angka={String(jumlah('Draf'))}
          nada="emas"
          ikon={<Ikon.Pena size={17} />}
          ket="Sudah mulai mengisi, belum dikirim"
        />
        <StatCard
          nama="Belum diisi"
          angka={String(jumlah('Belum diisi'))}
          nada="tanah"
          ikon={<Ikon.Jam size={17} />}
          ket="Belum ada isian sama sekali"
        />
        <StatCard
          nama="Temuan ✗"
          angka={String(temuan)}
          nada="ink"
          ikon={<Ikon.Awas size={17} />}
          ket="Pekerjaan yang tidak bisa dikerjakan"
        />
      </div>

      <Kartu className="mt-4.5">
        <KopKartu
          judul="Kerja wajib petugas"
          sub={`${hari}, ${tanggalTeks}`}
          aksi={
            <>
              <InputRapi
                type="date"
                value={tanggal}
                max={hariIni}
                onChange={(e) => e.target.value && setTanggal(e.target.value)}
                aria-label="Tanggal"
              />
              <PilihRapi value={jabatan} onChange={(e) => setJabatan(e.target.value as Jabatan | 'Semua')}>
                <option value="Semua">Semua jabatan</option>
                {DAFTAR_JABATAN.map((j) => (
                  <option key={j}>{j}</option>
                ))}
              </PilihRapi>
            </>
          }
        />
        <StatusData memuat={memuat} galat={galat} onUlang={muat} />
        {galatAksi && !dilihat && (
          <div className="mx-5 my-3 flex items-start gap-2 rounded-xl border border-merah/30 bg-merah-lembut px-3.5 py-2.5 text-[12px] leading-relaxed text-merah-teks">
            <Ikon.Awas size={14} className="mt-px flex-none" />
            <span>{galatAksi}</span>
          </div>
        )}
        <Tabel kepala={['Nama', 'Jabatan', 'Progres', 'Temuan ✗', 'Status', 'Dikirim', 'Aksi']} maksTinggi={560}>
          {rekap.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-5 py-12 text-center">
                <span className="mx-auto mb-2.5 grid h-11 w-11 place-items-center rounded-full bg-[#F3F7F4] text-teks-samar">
                  <Ikon.Daftar size={19} />
                </span>
                <b className="block text-[13.5px] font-semibold text-ink">
                  {memuat ? 'Memuat kerja wajib…' : 'Tidak ada petugas pada saringan ini'}
                </b>
              </td>
            </tr>
          ) : (
            rekap.map((r) => (
              <Baris key={r.petugasId}>
                <td>
                  <SelOrang nama={r.nama} jabatan={r.jabatan} />
                </td>
                <td>
                  <TagJabatan jabatan={r.jabatan} />
                </td>
                {r.totalKotak === 0 ? (
                  <td colSpan={4} className="text-[12px] text-teks-samar">
                    Daftar kerja wajib jabatan ini belum disusun
                  </td>
                ) : (
                  <>
                    <td className="min-w-[150px]">
                      <div className="flex items-center gap-2.5">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#E3EAE6]">
                          <div className="h-full rounded-full bg-hijau" style={{ width: `${r.persen}%` }} />
                        </div>
                        <span className="num whitespace-nowrap text-[12px] text-teks-lembut">
                          {r.terisi}/{r.totalKotak}
                        </span>
                      </div>
                    </td>
                    <td className={cn('num', r.tidak > 0 ? 'font-semibold text-merah' : 'text-teks-samar')}>
                      {r.tidak}
                    </td>
                    <td>
                      <Pil status={PIL[r.status]}>{r.status}</Pil>
                    </td>
                    <td className="num whitespace-nowrap text-teks-lembut">{r.dikirimPada ?? '—'}</td>
                  </>
                )}
                <td>
                  <AksiBaris>
                    <TombolIkon
                      label="Lihat isian"
                      onClick={() => setDilihat(r)}
                      disabled={r.totalKotak === 0 || r.status === 'Belum diisi'}
                    >
                      <Ikon.Mata size={15} />
                    </TombolIkon>
                    <TombolIkon
                      label="Buka kunci"
                      onClick={() => bukaKunci(r)}
                      disabled={r.status !== 'Dikirim' || sibuk}
                    >
                      <Ikon.Kunci size={15} />
                    </TombolIkon>
                  </AksiBaris>
                </td>
              </Baris>
            ))
          )}
        </Tabel>
      </Kartu>

      {dilihat && (
        <Modal
          judul={`Kerja wajib ${dilihat.nama}`}
          sub={`${dilihat.jabatan} · ${hari}, ${tanggalTeks}`}
          lebar="max-w-[720px]"
          onTutup={tutup}
          aksi={
            <>
              {dilihat.status === 'Dikirim' && (
                <Tombol varian="hantu" onClick={() => bukaKunci(dilihat)} disabled={sibuk}>
                  <Ikon.Kunci size={15} /> Buka kunci
                </Tombol>
              )}
              <Tombol onClick={tutup}>Tutup</Tombol>
            </>
          }
        >
          <div className="mb-3.5 flex flex-wrap items-center gap-2 text-[12px] text-teks-lembut">
            <Pil status={PIL[dilihat.status]}>{dilihat.status}</Pil>
            {lembar.data && (
              <span>
                {lembar.data.terisi} dari {lembar.data.totalKotak} kotak terisi
                {lembar.data.tidak > 0 && ` · ${lembar.data.tidak} temuan ✗`}
                {lembar.data.dikirimPada && ` · dikirim ${lembar.data.dikirimPada}`}
              </span>
            )}
          </div>
          {lembar.galat ? (
            <div className="flex items-center gap-2 rounded-xl border border-merah/30 bg-merah-lembut px-3.5 py-2.5 text-[12px] text-merah-teks">
              <span className="flex-1">{lembar.galat}</span>
              <Tombol varian="hantu" kecil onClick={lembar.muat}>
                Coba lagi
              </Tombol>
            </div>
          ) : lembar.data ? (
            <IsiLembar lembar={lembar.data} />
          ) : (
            <p className="m-0 text-[12.5px] text-teks-samar">Memuat isian…</p>
          )}
          {galatAksi && (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-merah/30 bg-merah-lembut px-3.5 py-2.5 text-[12px] leading-relaxed text-merah-teks">
              <Ikon.Awas size={14} className="mt-px flex-none" />
              <span>{galatAksi}</span>
            </div>
          )}
        </Modal>
      )}
    </>
  )
}
