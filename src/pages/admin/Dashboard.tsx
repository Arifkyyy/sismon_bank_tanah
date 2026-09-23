import { Link } from 'react-router-dom'
import { BaganTujuhHari, Donat } from '@/components/Bagan'
import { Linimasa } from '@/components/Linimasa'
import { StatCard } from '@/components/StatCard'
import { Baris, FotoKecil, Kartu, KopKartu, IsiKartu, Pil, PilihRapi, SelOrang, Tabel, Tombol } from '@/components/ui'
import { AKAR } from '@/config/menu'
import { KENDALA, LOGBOOK } from '@/data/mock'
import { Ikon } from '@/lib/ikon'
import { DAFTAR_JABATAN, JABATAN_PANJANG } from '@/lib/util'
import type { Peran } from '@/types'

export function DashboardAdmin({ peran }: { peran: Peran }) {
  const akar = AKAR[peran]
  const superAdmin = peran === 'superadmin'

  return (
    <>
      <div className="grid grid-cols-1 gap-4.5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard nama="Petugas bertugas hari ini" angka="46" satuan="/ 53" nada="ink" ikon={<Ikon.Orang size={17} />} ket="7 petugas cuti atau libur" />
        <StatCard nama="Logbook masuk hari ini" angka="58" ikon={<Ikon.Buku size={17} />} arah="naik" ket="12% lebih banyak dari kemarin" />
        <StatCard nama="Kendala belum selesai" angka="2" nada="tanah" ikon={<Ikon.Awas size={17} />} ket="1 baru, 1 sedang diproses" />
        <StatCard nama="Jam lembur bulan ini" angka="186" satuan="jam" nada="emas" ikon={<Ikon.Jam size={17} />} arah="naik" ket="24 jam dibanding Agustus" />
      </div>

      <div className="mt-4.5 grid grid-cols-1 gap-4.5 xl:grid-cols-[1.62fr_1fr]">
        <Kartu>
          <KopKartu
            judul="Logbook dan lembur tujuh hari terakhir"
            sub="Batang hijau logbook, batang emas jam lembur"
            aksi={
              <PilihRapi defaultValue="Semua jabatan">
                <option>Semua jabatan</option>
                {DAFTAR_JABATAN.map((j) => (
                  <option key={j}>{JABATAN_PANJANG[j]}</option>
                ))}
              </PilihRapi>
            }
          />
          <IsiKartu>
            <BaganTujuhHari />
          </IsiKartu>
        </Kartu>

        <Kartu>
          <KopKartu judul="Sebaran petugas" sub="Berdasarkan jabatan" />
          <IsiKartu>
            <Donat />
          </IsiKartu>
        </Kartu>
      </div>

      <div className="mt-4.5 grid grid-cols-1 gap-4.5 xl:grid-cols-[1fr_1.62fr]">
        <Kartu>
          <KopKartu
            judul="Aktivitas terbaru"
            sub="Lima catatan terakhir"
            aksi={
              <Link to={`${akar}/log-aktivitas`}>
                <Tombol varian="hantu" kecil>
                  Lihat semua
                </Tombol>
              </Link>
            }
          />
          <IsiKartu>
            <Linimasa
              pos={LOGBOOK.slice(0, 5).map((l, i) => ({
                jam: `${l.jam} · ${l.hari}`,
                judul: `${l.nama} — ${l.jabatan}`,
                isi: l.keterangan,
                nada: i === 2 ? 'emas' : i === 4 ? 'tanah' : 'hijau',
              }))}
            />
          </IsiKartu>
        </Kartu>

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
          <Tabel kepala={['Pelapor', 'Kendala', 'Waktu', 'Foto', 'Status']}>
            {KENDALA.slice(0, 4).map((k) => (
              <Baris key={k.nama + k.jam}>
                <td>
                  <SelOrang nama={k.nama} jabatan={k.jabatan} />
                </td>
                <td className="max-w-[290px] whitespace-normal text-teks-lembut">{k.keterangan}</td>
                <td className="num whitespace-nowrap text-teks-lembut">
                  {k.tanggal}
                  <br />
                  <span className="text-[11.5px]">{k.jam}</span>
                </td>
                <td>
                  <FotoKecil varian={k.foto} />
                </td>
                <td>
                  <Pil status={k.status} />
                </td>
              </Baris>
            ))}
          </Tabel>
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
    </>
  )
}
