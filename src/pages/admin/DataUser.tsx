import { useState } from 'react'
import { Link } from 'react-router-dom'
import { StatusData } from '@/components/StatusData'
import {
  AksiBaris, Baris, Kartu, KopKartu, Pil, PilihRapi, SelOrang,
  Tabel, TagJabatan, Tombol, TombolIkon,
} from '@/components/ui'
import { AKAR } from '@/config/menu'
import { Ikon } from '@/lib/ikon'
import { query } from '@/lib/api'
import { useApi } from '@/lib/useApi'
import { DAFTAR_JABATAN } from '@/lib/util'
import type { Jabatan, Peran, Petugas, Status } from '@/types'

const STATUS_AKUN: Status[] = ['Aktif', 'Cuti', 'Nonaktif']

export function DataUser({ peran }: { peran: Peran }) {
  const superAdmin = peran === 'superadmin'
  const [jabatan, setJabatan] = useState<Jabatan | 'Semua'>('Semua')
  const [status, setStatus] = useState<Status | 'Semua'>('Semua')

  // Jabatan disaring backend. Status disaring di sini karena GET /api/petugas
  // belum menyediakan parameternya.
  const { data: petugas, memuat, galat, muat } = useApi<Petugas[]>(
    `/api/petugas${query({ jabatan: jabatan === 'Semua' ? '' : jabatan })}`,
    [],
  )
  const terlihat = status === 'Semua' ? petugas : petugas.filter((p) => p.status === status)

  return (
    <Kartu>
      <KopKartu
        judul="Daftar petugas"
        sub={`${terlihat.length} akun terdaftar`}
        aksi={
          <>
            <PilihRapi
              value={jabatan}
              onChange={(e) => setJabatan(e.target.value as Jabatan | 'Semua')}
            >
              <option value="Semua">Semua jabatan</option>
              {DAFTAR_JABATAN.map((j) => (
                <option key={j}>{j}</option>
              ))}
            </PilihRapi>
            <PilihRapi
              value={status}
              onChange={(e) => setStatus(e.target.value as Status | 'Semua')}
            >
              <option value="Semua">Semua status</option>
              {STATUS_AKUN.map((s) => (
                <option key={s}>{s}</option>
              ))}
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
      <StatusData memuat={memuat} galat={galat} onUlang={muat} />
      <Tabel kepala={['Nama', 'Jabatan', 'Email', 'Nomor telepon', 'Status', 'Aksi']} maksTinggi={560}>
        {terlihat.length === 0 ? (
          <tr>
            <td colSpan={6} className="px-5 py-12 text-center">
              <span className="mx-auto mb-2.5 grid h-11 w-11 place-items-center rounded-full bg-[#F3F7F4] text-teks-samar">
                <Ikon.Orang size={19} />
              </span>
              <b className="block text-[13.5px] font-semibold text-ink">
                {memuat ? 'Memuat daftar petugas…' : 'Tidak ada petugas pada saringan ini'}
              </b>
              <span className="mt-0.5 block text-[12px] text-teks-lembut">
                Ganti jabatan atau status di atas.
              </span>
            </td>
          </tr>
        ) : (
          terlihat.map((p) => (
            <Baris key={p.id}>
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
          ))
        )}
      </Tabel>
    </Kartu>
  )
}
