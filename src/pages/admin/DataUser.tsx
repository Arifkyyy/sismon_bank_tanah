import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Modal } from '@/components/Modal'
import { StatusData } from '@/components/StatusData'
import {
  AksiBaris, Baris, GridForm, Input, Kartu, Kolom, KopKartu, Pil, Pilihan, PilihRapi, SelOrang,
  Tabel, TagJabatan, Tombol, TombolIkon,
} from '@/components/ui'
import { AKAR } from '@/config/menu'
import { Ikon } from '@/lib/ikon'
import { api, pesanGalat, query } from '@/lib/api'
import { useApi } from '@/lib/useApi'
import { DAFTAR_JABATAN } from '@/lib/util'
import type { Jabatan, Peran, Petugas, Status } from '@/types'

const STATUS_AKUN: Status[] = ['Aktif', 'Cuti', 'Nonaktif']

type FormUbah = Required<Pick<Petugas, 'nama' | 'jabatan' | 'email' | 'telepon' | 'nip' | 'unit' | 'status'>>

function formDari(p: Petugas): FormUbah {
  return {
    nama: p.nama,
    jabatan: p.jabatan,
    email: p.email,
    telepon: p.telepon,
    nip: p.nip ?? '',
    unit: p.unit ?? '',
    status: p.status,
  }
}

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

  const [diubah, setDiubah] = useState<Petugas | null>(null)
  const [form, setForm] = useState<FormUbah | null>(null)
  const [sibuk, setSibuk] = useState(false)
  const [galatAksi, setGalatAksi] = useState<string | null>(null)

  function bukaUbah(p: Petugas) {
    setDiubah(p)
    setForm(formDari(p))
    setGalatAksi(null)
  }

  function tutupUbah() {
    if (sibuk) return
    setDiubah(null)
    setForm(null)
  }

  function isi<K extends keyof FormUbah>(kunci: K, nilai: FormUbah[K]) {
    setForm((f) => (f ? { ...f, [kunci]: nilai } : f))
  }

  async function simpan() {
    if (!diubah || !form) return
    if (form.nama.trim().length < 3) return setGalatAksi('Nama lengkap minimal 3 huruf.')
    if (!form.email.trim()) return setGalatAksi('Email wajib diisi.')
    setSibuk(true)
    setGalatAksi(null)
    try {
      await api(`/api/petugas/${diubah.id}`, 'PATCH', form)
      setDiubah(null)
      setForm(null)
      muat()
    } catch (e) {
      setGalatAksi(pesanGalat(e))
    } finally {
      setSibuk(false)
    }
  }

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
                  <TombolIkon label="Ubah data" onClick={() => bukaUbah(p)}>
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

      {diubah && form && (
        <Modal
          judul="Ubah data petugas"
          sub={diubah.nama}
          lebar="max-w-[560px]"
          onTutup={tutupUbah}
          aksi={
            <>
              <Tombol varian="hantu" onClick={tutupUbah} disabled={sibuk}>
                Batal
              </Tombol>
              <Tombol onClick={simpan} disabled={sibuk}>
                <Ikon.Centang size={15} /> {sibuk ? 'Menyimpan…' : 'Simpan perubahan'}
              </Tombol>
            </>
          }
        >
          <GridForm>
            <Kolom label="Nama lengkap" wajib penuh>
              <Input autoFocus value={form.nama} onChange={(e) => isi('nama', e.target.value)} />
            </Kolom>
            <Kolom label="Jabatan" wajib>
              <Pilihan value={form.jabatan} onChange={(e) => isi('jabatan', e.target.value as Jabatan)}>
                {DAFTAR_JABATAN.map((j) => (
                  <option key={j}>{j}</option>
                ))}
              </Pilihan>
            </Kolom>
            <Kolom
              label="Status"
              wajib
              bantu={form.status === 'Nonaktif' ? 'Akun nonaktif tidak bisa masuk ke aplikasi.' : undefined}
            >
              <Pilihan value={form.status} onChange={(e) => isi('status', e.target.value as Status)}>
                {STATUS_AKUN.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </Pilihan>
            </Kolom>
            <Kolom label="Email kantor" wajib penuh bantu="Dipakai petugas untuk masuk ke aplikasi.">
              <Input type="email" value={form.email} onChange={(e) => isi('email', e.target.value)} />
            </Kolom>
            <Kolom label="Nomor telepon">
              <Input
                type="tel"
                inputMode="tel"
                value={form.telepon}
                onChange={(e) => isi('telepon', e.target.value)}
              />
            </Kolom>
            <Kolom label="Nomor induk">
              <Input value={form.nip} onChange={(e) => isi('nip', e.target.value)} />
            </Kolom>
            <Kolom label="Unit / pos tugas" penuh>
              <Input
                placeholder="Contoh: Pos Utama — Gedung A"
                value={form.unit}
                onChange={(e) => isi('unit', e.target.value)}
              />
            </Kolom>
          </GridForm>
          {galatAksi && (
            <div className="mt-3.5 flex items-start gap-2 rounded-xl border border-merah/30 bg-merah-lembut px-3.5 py-2.5 text-[12px] leading-relaxed text-merah-teks">
              <Ikon.Awas size={14} className="mt-px flex-none" />
              <span>{galatAksi}</span>
            </div>
          )}
        </Modal>
      )}
    </Kartu>
  )
}
