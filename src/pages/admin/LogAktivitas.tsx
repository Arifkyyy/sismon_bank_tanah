import {
  Baris, FotoKecil, KakiTabel, Kartu, KopKartu, PilihRapi, SelOrang, Tabel, TagJabatan, Tombol,
} from '@/components/ui'
import { LOGBOOK } from '@/data/mock'
import { Ikon } from '@/lib/ikon'

export function LogAktivitas() {
  return (
    <Kartu>
      <KopKartu
        judul="Log aktivitas petugas"
        sub="Setiap catatan wajib disertai foto dari kamera"
        aksi={
          <>
            <PilihRapi defaultValue="Semua jabatan">
              <option>Semua jabatan</option>
              <option>Security</option>
              <option>OB</option>
              <option>CS</option>
            </PilihRapi>
            <input
              type="date"
              defaultValue="2026-09-15"
              className="rounded-[10px] border border-garis-kuat bg-white px-3 py-2.5 text-[13px] focus:border-hijau focus:outline-none"
            />
            <Tombol varian="hantu" kecil>
              <Ikon.Unduh size={15} /> Unduh Excel
            </Tombol>
          </>
        }
      />
      <Tabel kepala={['Nama', 'Jabatan', 'Tanggal', 'Hari', 'Jam', 'Foto', 'Keterangan', 'Lembur']}>
        {LOGBOOK.map((l) => (
          <Baris key={l.nama + l.jam}>
            <td>
              <SelOrang nama={l.nama} jabatan={l.jabatan} />
            </td>
            <td>
              <TagJabatan jabatan={l.jabatan} />
            </td>
            <td className="num whitespace-nowrap">{l.tanggal}</td>
            <td className="text-teks-lembut">{l.hari}</td>
            <td className="num">{l.jam}</td>
            <td>
              <FotoKecil varian={l.foto} />
            </td>
            <td className="max-w-[330px] whitespace-normal text-teks-lembut">{l.keterangan}</td>
            <td className="num">
              {l.lembur === '—' ? (
                <span className="text-teks-samar">—</span>
              ) : (
                <span className="rounded-full bg-emas-lembut px-2.5 py-1 text-[11.5px] font-semibold text-emas-teks">
                  {l.lembur}
                </span>
              )}
            </td>
          </Baris>
        ))}
      </Tabel>
      <KakiTabel dari={1} ke={7} total={326} />
    </Kartu>
  )
}
