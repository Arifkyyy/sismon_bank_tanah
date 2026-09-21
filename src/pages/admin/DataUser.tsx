import { Link } from 'react-router-dom'
import {
  AksiBaris, Baris, KakiTabel, Kartu, KopKartu, Pil, PilihRapi, SelOrang,
  Tabel, TagJabatan, Tombol, TombolIkon,
} from '@/components/ui'
import { AKAR } from '@/config/menu'
import { PETUGAS } from '@/data/mock'
import { Ikon } from '@/lib/ikon'
import type { Peran } from '@/types'

export function DataUser({ peran }: { peran: Peran }) {
  const superAdmin = peran === 'superadmin'

  return (
    <Kartu>
      <KopKartu
        judul="Daftar petugas"
        sub={`${PETUGAS.length} akun terdaftar`}
        aksi={
          <>
            <PilihRapi defaultValue="Semua jabatan">
              <option>Semua jabatan</option>
              <option>Security</option>
              <option>OB</option>
              <option>CS</option>
            </PilihRapi>
            <PilihRapi defaultValue="Semua status">
              <option>Semua status</option>
              <option>Aktif</option>
              <option>Cuti</option>
              <option>Nonaktif</option>
            </PilihRapi>
            {superAdmin && (
              <Link to={`${AKAR[peran]}/kelola-akun`}>
                <Tombol kecil>
                  <Ikon.Tambah size={15} /> Tambah petugas
                </Tombol>
              </Link>
            )}
          </>
        }
      />
      <Tabel kepala={['Nama', 'Jabatan', 'Email', 'Nomor telepon', 'Status', 'Aksi']}>
        {PETUGAS.map((p) => (
          <Baris key={p.email}>
            <td>
              <SelOrang nama={p.nama} jabatan={p.jabatan} />
            </td>
            <td>
              <TagJabatan jabatan={p.jabatan} />
            </td>
            <td className="text-teks-lembut">{p.email}</td>
            <td className="num whitespace-nowrap text-teks-lembut">{p.telepon}</td>
            <td>
              <Pil status={p.status} />
            </td>
            <td>
              <AksiBaris>
                <TombolIkon label="Lihat detail">
                  <Ikon.Mata size={15} />
                </TombolIkon>
                <TombolIkon label="Ubah data">
                  <Ikon.Pena size={15} />
                </TombolIkon>
                {superAdmin && (
                  <TombolIkon label="Hapus akun" bahaya>
                    <Ikon.Sampah size={15} />
                  </TombolIkon>
                )}
              </AksiBaris>
            </td>
          </Baris>
        ))}
      </Tabel>
      <KakiTabel dari={1} ke={8} total={48} />
    </Kartu>
  )
}
