import { StatCard } from '@/components/StatCard'
import {
  AksiBaris, Baris, FotoKecil, KakiTabel, Kartu, KopKartu, Pil, PilihRapi, SelOrang,
  Tabel, TagJabatan, Tombol, TombolIkon,
} from '@/components/ui'
import { KENDALA } from '@/data/mock'
import { Ikon } from '@/lib/ikon'

export function LaporanKendalaAdmin() {
  return (
    <>
      <div className="grid grid-cols-1 gap-4.5 sm:grid-cols-3">
        <StatCard nama="Laporan baru" angka="1" nada="tanah" ikon={<Ikon.Awas size={17} />} ket="Belum ditinjau admin" />
        <StatCard nama="Sedang diproses" angka="2" nada="emas" ikon={<Ikon.Jam size={17} />} ket="Sudah diteruskan ke teknisi" />
        <StatCard nama="Selesai bulan ini" angka="17" ikon={<Ikon.Centang size={17} />} ket="Rata-rata tuntas 1,4 hari" />
      </div>

      <Kartu className="mt-4.5">
        <KopKartu
          judul="Laporan kendala masuk"
          sub="Ubah status setelah kendala ditindaklanjuti"
          aksi={
            <>
              <PilihRapi defaultValue="Semua status">
                <option>Semua status</option>
                <option>Baru</option>
                <option>Diproses</option>
                <option>Selesai</option>
              </PilihRapi>
              <Tombol varian="hantu" kecil>
                <Ikon.Unduh size={15} /> Unduh
              </Tombol>
            </>
          }
        />
        <Tabel kepala={['Pelapor', 'Jabatan', 'Tanggal', 'Hari', 'Jam', 'Foto', 'Keterangan', 'Status', 'Aksi']} maksTinggi={560}>
          {KENDALA.map((k) => (
            <Baris key={k.nama + k.jam}>
              <td>
                <SelOrang nama={k.nama} jabatan={k.jabatan} />
              </td>
              <td>
                <TagJabatan jabatan={k.jabatan} />
              </td>
              <td className="num whitespace-nowrap">{k.tanggal}</td>
              <td className="text-teks-lembut">{k.hari}</td>
              <td className="num">{k.jam}</td>
              <td>
                <FotoKecil varian={k.foto} />
              </td>
              <td className="max-w-[300px] whitespace-normal text-teks-lembut">{k.keterangan}</td>
              <td>
                <Pil status={k.status} />
              </td>
              <td>
                <AksiBaris>
                  <TombolIkon label="Lihat detail">
                    <Ikon.Mata size={15} />
                  </TombolIkon>
                  <TombolIkon label="Ubah status">
                    <Ikon.Pena size={15} />
                  </TombolIkon>
                </AksiBaris>
              </td>
            </Baris>
          ))}
        </Tabel>
        <KakiTabel dari={1} ke={5} total={19} />
      </Kartu>
    </>
  )
}
