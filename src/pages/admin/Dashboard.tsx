import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Donat } from '@/components/Bagan'
import { PratinjauFoto } from '@/components/Foto'
import { Linimasa } from '@/components/Linimasa'
import { StatCard } from '@/components/StatCard'
import { Avatar, Baris, FotoKecil, Kartu, KopKartu, IsiKartu, Pil, SelOrang, Tabel, Tombol } from '@/components/ui'
import { StatusData } from '@/components/StatusData'
import { AKAR } from '@/config/menu'
import { useLembur } from '@/context/LemburContext'
import { Ikon } from '@/lib/ikon'
import { query } from '@/lib/api'
import { useApi } from '@/lib/useApi'
import { keIso } from '@/lib/tanggal'
import { JABATAN_PANJANG } from '@/lib/util'
import type { Kendala, Logbook, Peran, Petugas } from '@/types'

/** Mengambil angka jam dari teks seperti '4 jam'. */
function jamDari(total: string): number {
  return Number.parseFloat(total.replace(',', '.')) || 0
}

export function DashboardAdmin({ peran }: { peran: Peran }) {
  const [pratinjau, setPratinjau] = useState<{ foto: string[]; judul: string } | null>(null)
  const akar = AKAR[peran]
  const superAdmin = peran === 'superadmin'

  const hariIniIso = keIso(new Date())
  const awalBulan = `${hariIniIso.slice(0, 7)}-01`

  const petugas = useApi<Petugas[]>('/api/petugas', [])
  const logbookHariIni = useApi<Logbook[]>(`/api/logbook${query({ tanggal: hariIniIso })}`, [])
  const kendalaTerbuka = useApi<Kendala[]>('/api/kendala?batas=200', [])
  const { daftar: lembur, memuat: memuatLembur, galat: galatLembur, muat: muatLembur } = useLembur()
  // id penugasan berurutan dari backend: yang terbesar adalah yang paling baru dibuat.
  const lemburTerbaru = [...lembur].sort((a, b) => Number(b.id) - Number(a.id)).slice(0, 10)

  const bertugas = petugas.data.filter((p) => p.status === 'Aktif').length
  const belumSelesai = kendalaTerbuka.data.filter((k) => k.status !== 'Selesai')
  const jumlahBaru = belumSelesai.filter((k) => k.status === 'Baru').length
  const jumlahDiproses = belumSelesai.filter((k) => k.status === 'Diproses').length
  const jamLemburBulanIni = lembur
    .filter((l) => l.status === 'Diterima' || l.status === 'Selesai')
    .filter((l) => l.tanggalIso >= awalBulan && l.tanggalIso <= hariIniIso)
    .reduce((n, l) => n + jamDari(l.total), 0)

  return (
    <>
      <div className="grid grid-cols-1 gap-4.5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard gaya="pekat" nama="Jumlah Petugas Yang Aktif" angka={String(bertugas)} satuan={`/ ${petugas.data.length}`} nada="ink" ikon={<Ikon.Orang size={17} />} ket={`${petugas.data.length - bertugas} petugas cuti atau nonaktif`} />
        <StatCard gaya="pekat" nama="Logbook masuk hari ini" angka={String(logbookHariIni.data.length)} ikon={<Ikon.Buku size={17} />} ket="Catatan yang masuk hari ini" />
        <StatCard gaya="pekat" nama="Kendala belum selesai" angka={String(belumSelesai.length)} nada="tanah" ikon={<Ikon.Awas size={17} />} ket={`${jumlahBaru} baru, ${jumlahDiproses} sedang diproses`} />
        <StatCard gaya="pekat" nama="Jam lembur bulan ini" angka={String(jamLemburBulanIni)} satuan="jam" nada="emas" ikon={<Ikon.Jam size={17} />} ket="Lembur yang diterima petugas" />
      </div>

      {/* Dua kolom hampir sama lebar; daftar yang panjang digulir di dalam kartunya. */}
      <div className="mt-4.5 grid grid-cols-1 gap-4.5 xl:grid-cols-[1.1fr_1fr]">
        <Kartu>
          <KopKartu
            judul="Penugasan lembur terbaru"
            sub="Daftar penugasan yang perlu dipantau"
            aksi={
              <Link to={`${akar}/pengajuan-lembur`}>
                <Tombol varian="hantu" kecil>
                  Lihat semua
                </Tombol>
              </Link>
            }
          />
          <StatusData memuat={memuatLembur} galat={galatLembur} onUlang={muatLembur} />
          {lemburTerbaru.length === 0 ? (
            <p className="m-0 px-5 py-8 text-center text-[12.5px] text-teks-lembut">
              {memuatLembur ? 'Memuat penugasan…' : 'Belum ada penugasan lembur yang dikirim.'}
            </p>
          ) : (
            <ul className="scrollbar-lembut m-0 max-h-[252px] list-none overflow-y-auto overscroll-contain p-0">
              {lemburTerbaru.map((l) => (
                <li key={l.id} className="flex items-center gap-3.5 border-b border-garis px-5 py-3.5 last:border-b-0">
                  <Avatar nama={l.nama} jabatan={l.jabatan} foto={l.fotoProfil} ukuran={42} />
                  <div className="min-w-0 flex-1">
                    <span className="num block text-[11.5px] text-teks-samar">
                      {l.tanggal} · {l.rentang}
                    </span>
                    <b className="block truncate text-[13px] font-bold text-ink">
                      {l.nama} - {JABATAN_PANJANG[l.jabatan]}
                    </b>
                    <span className="block truncate text-[12.5px] text-teks-lembut">{l.keterangan}</span>
                  </div>
                  <Pil status={l.status} />
                </li>
              ))}
            </ul>
          )}
        </Kartu>

        <Kartu>
          <KopKartu judul="Sebaran petugas" sub="Berdasarkan jabatan" />
          <IsiKartu>
            <Donat />
          </IsiKartu>
        </Kartu>
      </div>

      <div className="mt-4.5 grid grid-cols-1 gap-4.5 xl:grid-cols-[1.1fr_1fr]">
        <Kartu>
          <KopKartu
            judul="Kendala yang perlu ditindak"
            sub="Diurutkan dari yang terbaru"
            aksi={
              <Link to={`${akar}/laporan-kendala`}>
                <Tombol varian="hantu" kecil>
                  Buka halaman
                </Tombol>
              </Link>
            }
          />
          <StatusData
            memuat={kendalaTerbuka.memuat}
            galat={kendalaTerbuka.galat}
            onUlang={kendalaTerbuka.muat}
          />
          <Tabel kepala={['Pelapor', 'Kendala', 'Foto', 'Status']} maksTinggi={276}>
            {belumSelesai.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-12 text-center text-[13px] text-teks-lembut">
                  {kendalaTerbuka.memuat
                    ? 'Memuat laporan kendala…'
                    : 'Tidak ada kendala yang perlu ditindak.'}
                </td>
              </tr>
            ) : (
              belumSelesai.slice(0, 10).map((k) => (
                <Baris key={k.id}>
                  <td>
                    <SelOrang nama={k.nama} jabatan={k.jabatan} foto={k.fotoProfil} />
                  </td>
                  <td className="max-w-[240px] whitespace-normal text-[12.5px] text-teks-lembut">
                    {k.keterangan}
                    <span className="num mt-0.5 block text-[11px] text-teks-samar">
                      {k.tanggal} · {k.jam}
                    </span>
                  </td>
                  <td>
                    <FotoKecil
                      varian={k.foto}
                      url={k.fotoUrl?.[0]}
                      onClick={() =>
                        k.fotoUrl?.length &&
                        setPratinjau({ foto: k.fotoUrl, judul: `Foto kendala · ${k.nama}` })
                      }
                    />
                  </td>
                  <td>
                    <Pil status={k.status} />
                  </td>
                </Baris>
              ))
            )}
          </Tabel>
        </Kartu>

        <Kartu>
          <KopKartu
            judul="Aktivitas terbaru"
            sub="Catatan terbaru hari ini"
            aksi={
              <Link to={`${akar}/log-aktivitas`}>
                <Tombol varian="hantu" kecil>
                  Lihat semua
                </Tombol>
              </Link>
            }
          />
          <StatusData
            memuat={logbookHariIni.memuat}
            galat={logbookHariIni.galat}
            onUlang={logbookHariIni.muat}
          />
          <IsiKartu className="scrollbar-lembut max-h-[276px] overflow-y-auto overscroll-contain">
            {logbookHariIni.data.length === 0 ? (
              <p className="m-0 py-6 text-center text-[12.5px] text-teks-lembut">
                Belum ada catatan masuk hari ini.
              </p>
            ) : (
              <Linimasa
                pos={logbookHariIni.data.slice(0, 10).map((l) => ({
                  jam: `${l.jam} · ${l.hari}`,
                  judul: `${l.nama} — ${l.jabatan}`,
                  isi: l.keterangan,
                }))}
              />
            )}
          </IsiKartu>
        </Kartu>
      </div>

      {superAdmin && (
        <Kartu className="mt-4.5">
          <KopKartu judul="Kendali super admin" sub="Tindakan yang hanya bisa dilakukan super admin" />
          <IsiKartu className="grid grid-cols-1 gap-4.5 sm:grid-cols-3">
            {[
              ['Tambah akun baru', 'Buat akun admin atau petugas', 'kelola-akun'],
              ['Hapus data foto', 'Bersihkan arsip foto lama', 'hapus-data-foto'],
              ['Nonaktifkan akun', 'Cabut akses petugas atau admin', 'kelola-akun'],
            ].map(([judul, ket, tujuan]) => (
              <Link
                key={judul}
                to={`${akar}/${tujuan}`}
                className="rounded-xl border border-garis-kuat bg-white p-4 no-underline transition hover:border-hijau hover:bg-hijau-lembut"
              >
                <b className="block text-[12.5px] font-bold text-ink">{judul}</b>
                <span className="text-[10.5px] text-teks-samar">{ket}</span>
              </Link>
            ))}
          </IsiKartu>
        </Kartu>
      )}
      {pratinjau && (
        <PratinjauFoto foto={pratinjau.foto} judul={pratinjau.judul} onTutup={() => setPratinjau(null)} />
      )}
    </>
  )
}
