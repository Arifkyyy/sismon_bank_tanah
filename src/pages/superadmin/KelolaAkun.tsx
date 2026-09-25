import { useState } from 'react'
import { Modal } from '@/components/Modal'
import { StatusData } from '@/components/StatusData'
import {
  AksiBaris, Baris, GridForm, Input, IsiKartu, KakiForm, KakiTabel, Kartu, Kolom, KopKartu,
  Peringatan, Pil, Pilihan, PilihRapi, Segmen, SelOrang, Tabel, TagJabatan, Tombol, TombolIkon,
} from '@/components/ui'
import { useKonfirmasi } from '@/context/KonfirmasiContext'
import { Ikon } from '@/lib/ikon'
import { api, pesanGalat, query } from '@/lib/api'
import { useApi } from '@/lib/useApi'
import { DAFTAR_JABATAN, JABATAN_PANJANG, jabatanDariLabel } from '@/lib/util'
import type { AkunAdmin, Jabatan, Petugas, Status } from '@/types'

/** Jawaban POST /api/akun dan /api/akun/{id}/reset-sandi. */
interface HasilSandi {
  id: number
  email: string
  sandiSementara: string
}

function formKosong() {
  return {
    jenis: 'Akun admin',
    nama: '',
    jabatan: 'Security' as Jabatan,
    nip: '',
    email: '',
    unit: '',
  }
}

export function KelolaAkun() {
  const [form, setForm] = useState(formKosong)
  const [jabatanSaring, setJabatanSaring] = useState<Jabatan | 'Semua'>('Semua')
  const [galatAksi, setGalatAksi] = useState<string | null>(null)
  const [sibuk, setSibuk] = useState(false)
  // Sandi sementara hanya ditampilkan sekali, tidak bisa diminta ulang.
  const [sandiBaru, setSandiBaru] = useState<{ nama: string; hasil: HasilSandi } | null>(null)
  const [akanDihapus, setAkanDihapus] = useState<{ id: number; nama: string } | null>(null)
  const [ketikan, setKetikan] = useState('')
  const konfirmasi = useKonfirmasi()

  const admin = useApi<AkunAdmin[]>('/api/akun/admin', [])
  const petugas = useApi<Petugas[]>(
    `/api/petugas${query({ jabatan: jabatanSaring === 'Semua' ? '' : jabatanSaring })}`,
    [],
  )

  const buatPetugas = form.jenis === 'Akun petugas'

  /** Pembungkus satu aksi: kunci tombol, simpan pesan galat, muat ulang daftar. */
  async function jalankan(aksi: () => Promise<unknown>) {
    setSibuk(true)
    setGalatAksi(null)
    try {
      await aksi()
      admin.muat()
      petugas.muat()
      return true
    } catch (e) {
      setGalatAksi(pesanGalat(e))
      return false
    } finally {
      setSibuk(false)
    }
  }

  async function buatAkun() {
    let hasil: HasilSandi | null = null
    const berhasil = await jalankan(async () => {
      hasil = await api<HasilSandi>('/api/akun', 'POST', {
        jenis: buatPetugas ? 'user' : 'admin',
        nama: form.nama,
        jabatan: buatPetugas ? form.jabatan : null,
        nip: form.nip,
        email: form.email,
        unit: form.unit,
      })
    })
    if (!berhasil || !hasil) return
    setSandiBaru({ nama: form.nama, hasil })
    setForm(formKosong())
  }

  async function ubahStatus(id: number, status: Status) {
    await jalankan(() => api(`/api/akun/${id}/status`, 'PATCH', { status }))
  }

  async function resetSandi(id: number, nama: string) {
    const ya = await konfirmasi({
      judul: 'Atur ulang kata sandi?',
      pesan: (
        <>
          Kata sandi lama <b className="font-semibold text-ink">{nama}</b> langsung tidak berlaku. Sandi sementara
          yang baru ditampilkan sekali setelah ini.
        </>
      ),
      tombol: 'Atur ulang',
      nada: 'peringatan',
      ikon: <Ikon.Kunci size={22} />,
    })
    if (!ya) return
    let hasil: HasilSandi | null = null
    const berhasil = await jalankan(async () => {
      hasil = await api<HasilSandi>(`/api/akun/${id}/reset-sandi`, 'POST')
    })
    if (berhasil && hasil) setSandiBaru({ nama, hasil })
  }

  async function hapusAkun() {
    if (!akanDihapus || ketikan !== 'HAPUS') return
    const berhasil = await jalankan(() => api(`/api/akun/${akanDihapus.id}`, 'DELETE'))
    if (!berhasil) return
    setAkanDihapus(null)
    setKetikan('')
  }

  return (
    <div className="grid grid-cols-1 gap-4.5 xl:grid-cols-[1fr_1.62fr]">
      <Kartu className="self-start">
        <KopKartu judul="Tambah akun baru" sub="Kata sandi sementara ditampilkan setelah akun dibuat" />
        <IsiKartu>
          <GridForm>
            <Kolom label="Jenis akun" wajib penuh>
              <Segmen
                lebar
                opsi={['Akun admin', 'Akun petugas']}
                nilai={form.jenis}
                onPilih={(v) => setForm((f) => ({ ...f, jenis: v }))}
              />
            </Kolom>
            <Kolom label="Nama lengkap" wajib penuh>
              <Input
                placeholder="Contoh: Lestari Wulandari"
                value={form.nama}
                onChange={(e) => setForm((f) => ({ ...f, nama: e.target.value }))}
              />
            </Kolom>
            <Kolom label="Jabatan" wajib>
              <Pilihan
                value={buatPetugas ? JABATAN_PANJANG[form.jabatan] : 'Admin pengawas'}
                disabled={!buatPetugas}
                onChange={(e) => setForm((f) => ({ ...f, jabatan: jabatanDariLabel(e.target.value) }))}
              >
                {buatPetugas ? (
                  DAFTAR_JABATAN.map((j) => <option key={j}>{JABATAN_PANJANG[j]}</option>)
                ) : (
                  <option>Admin pengawas</option>
                )}
              </Pilihan>
            </Kolom>
            <Kolom label="Nomor induk" wajib>
              <Input
                placeholder="Contoh: 20260915 004"
                value={form.nip}
                onChange={(e) => setForm((f) => ({ ...f, nip: e.target.value }))}
              />
            </Kolom>
            <Kolom label="Email kantor" wajib penuh>
              <Input
                type="email"
                placeholder="nama.lengkap@banktanah.go.id"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </Kolom>
            <Kolom
              label="Unit penempatan"
              penuh
              bantu="Petugas hanya bisa mengisi logbook dari unit yang ditetapkan di sini."
            >
              <Input
                placeholder="Contoh: Pos Utama — Gedung A"
                value={form.unit}
                onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
              />
            </Kolom>
          </GridForm>
          {galatAksi && (
            <div className="mt-3.5 flex items-start gap-2 rounded-xl border border-merah/30 bg-merah-lembut px-3.5 py-2.5 text-[12px] leading-relaxed text-merah-teks">
              <Ikon.Awas size={14} className="mt-px flex-none" />
              <span>{galatAksi}</span>
            </div>
          )}
        </IsiKartu>
        <KakiForm>
          <Tombol varian="hantu" onClick={() => setForm(formKosong())}>
            Kosongkan
          </Tombol>
          <Tombol onClick={buatAkun} disabled={sibuk}>
            <Ikon.Tambah size={15} /> {sibuk ? 'Memproses…' : 'Buat akun'}
          </Tombol>
        </KakiForm>
      </Kartu>

      <div className="grid content-start gap-4.5">
        <Kartu>
          <KopKartu
            judul="Akun admin"
            sub={`${admin.data.length} admin pengawas terdaftar`}
            aksi={<Pil status="Diproses">Hanya super admin</Pil>}
          />
          <StatusData memuat={admin.memuat} galat={admin.galat} onUlang={admin.muat} />
          <Tabel kepala={['Nama', 'Email', 'Terakhir masuk', 'Status', 'Aksi']}>
            {admin.data.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center text-[13px] text-teks-lembut">
                  {admin.memuat ? 'Memuat daftar admin…' : 'Belum ada akun admin.'}
                </td>
              </tr>
            ) : (
              admin.data.map((a) => (
                <Baris key={a.id}>
                  <td>
                    <SelOrang nama={a.nama} jabatan="OB" foto={a.fotoProfil} />
                  </td>
                  <td className="text-teks-lembut">{a.email}</td>
                  <td className="num whitespace-nowrap text-teks-lembut">{a.masuk}</td>
                  <td>
                    <Pil status={a.status} />
                  </td>
                  <td>
                    <AksiBaris>
                      <TombolIkon
                        label={a.status === 'Nonaktif' ? 'Aktifkan akun' : 'Nonaktifkan akun'}
                        onClick={() => ubahStatus(a.id, a.status === 'Nonaktif' ? 'Aktif' : 'Nonaktif')}
                        disabled={sibuk}
                      >
                        <Ikon.Pena size={15} />
                      </TombolIkon>
                      <TombolIkon
                        label="Atur ulang sandi"
                        onClick={() => resetSandi(a.id, a.nama)}
                        disabled={sibuk}
                      >
                        <Ikon.Kunci size={15} />
                      </TombolIkon>
                      <TombolIkon
                        label="Hapus akun"
                        bahaya
                        onClick={() => {
                          setAkanDihapus({ id: a.id, nama: a.nama })
                          setKetikan('')
                        }}
                        disabled={sibuk}
                      >
                        <Ikon.Sampah size={15} />
                      </TombolIkon>
                    </AksiBaris>
                  </td>
                </Baris>
              ))
            )}
          </Tabel>
        </Kartu>

        <Kartu>
          <KopKartu
            judul="Akun petugas"
            sub={`${petugas.data.length} akun terdaftar`}
            aksi={
              <PilihRapi
                value={jabatanSaring}
                onChange={(e) => setJabatanSaring(e.target.value as Jabatan | 'Semua')}
              >
                <option value="Semua">Semua jabatan</option>
                {DAFTAR_JABATAN.map((j) => (
                  <option key={j}>{j}</option>
                ))}
              </PilihRapi>
            }
          />
          <StatusData memuat={petugas.memuat} galat={petugas.galat} onUlang={petugas.muat} />
          <Tabel kepala={['Nama', 'Jabatan', 'Email', 'Status', 'Aksi']}>
            {petugas.data.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center text-[13px] text-teks-lembut">
                  {petugas.memuat ? 'Memuat daftar petugas…' : 'Tidak ada petugas pada saringan ini.'}
                </td>
              </tr>
            ) : (
              petugas.data.map((p) => (
                <Baris key={p.id}>
                  <td>
                    <SelOrang nama={p.nama} jabatan={p.jabatan} foto={p.fotoProfil} />
                  </td>
                  <td>
                    <TagJabatan jabatan={p.jabatan} />
                  </td>
                  <td className="text-teks-lembut">{p.email}</td>
                  <td>
                    <Pil status={p.status} />
                  </td>
                  <td>
                    <AksiBaris>
                      <TombolIkon
                        label={p.status === 'Nonaktif' ? 'Aktifkan akun' : 'Nonaktifkan akun'}
                        onClick={() => ubahStatus(p.id, p.status === 'Nonaktif' ? 'Aktif' : 'Nonaktif')}
                        disabled={sibuk}
                      >
                        <Ikon.Pena size={15} />
                      </TombolIkon>
                      <TombolIkon
                        label="Atur ulang sandi"
                        onClick={() => resetSandi(p.id, p.nama)}
                        disabled={sibuk}
                      >
                        <Ikon.Kunci size={15} />
                      </TombolIkon>
                      <TombolIkon
                        label="Hapus akun"
                        bahaya
                        onClick={() => {
                          setAkanDihapus({ id: p.id, nama: p.nama })
                          setKetikan('')
                        }}
                        disabled={sibuk}
                      >
                        <Ikon.Sampah size={15} />
                      </TombolIkon>
                    </AksiBaris>
                  </td>
                </Baris>
              ))
            )}
          </Tabel>
          <KakiTabel
            dari={petugas.data.length ? 1 : 0}
            ke={petugas.data.length}
            total={petugas.data.length}
          />
        </Kartu>

        <Kartu className="border-[#F0CFCB]">
          <IsiKartu>
            <Peringatan judul="Menghapus akun bersifat permanen">
              Logbook, laporan kendala, dan riwayat lembur milik akun tersebut ikut terhapus.
              Nonaktifkan akun bila Anda hanya ingin mencabut akses.
            </Peringatan>
          </IsiKartu>
        </Kartu>
      </div>

      {sandiBaru && (
        <Modal
          judul="Kata sandi sementara"
          sub={sandiBaru.nama}
          onTutup={() => setSandiBaru(null)}
          aksi={<Tombol onClick={() => setSandiBaru(null)}>Sudah saya catat</Tombol>}
        >
          <p className="m-0 mb-3.5 text-[12.5px] leading-relaxed text-teks-lembut">
            Catat sekarang — kata sandi ini tidak bisa dilihat lagi setelah jendela ini ditutup.
            Serahkan ke pemilik akun lewat jalur pribadi dan minta ia menggantinya setelah masuk.
          </p>
          <div className="rounded-xl border border-garis bg-[#F7FAF8] px-3.5 py-3">
            <span className="mb-0.5 block text-[11px] text-teks-samar">Email</span>
            <b className="mb-3 block text-[13px] font-semibold text-ink">{sandiBaru.hasil.email}</b>
            <span className="mb-0.5 block text-[11px] text-teks-samar">Kata sandi sementara</span>
            <b className="num block text-[17px] font-extrabold tracking-wide text-ink">
              {sandiBaru.hasil.sandiSementara}
            </b>
          </div>
        </Modal>
      )}

      {akanDihapus && (
        <Modal
          judul="Hapus akun permanen"
          sub={akanDihapus.nama}
          onTutup={() => setAkanDihapus(null)}
          aksi={
            <>
              <Tombol varian="hantu" onClick={() => setAkanDihapus(null)}>
                Batal
              </Tombol>
              <Tombol varian="bahaya" onClick={hapusAkun} disabled={ketikan !== 'HAPUS' || sibuk}>
                <Ikon.Sampah size={15} /> Hapus akun
              </Tombol>
            </>
          }
        >
          <p className="m-0 mb-3.5 text-[12.5px] leading-relaxed text-teks-lembut">
            Seluruh logbook, laporan kendala, riwayat lembur, dan foto bukti milik{' '}
            <b className="font-semibold text-ink">{akanDihapus.nama}</b> ikut terhapus dan tidak bisa
            dikembalikan.
          </p>
          <Kolom label="Ketik HAPUS untuk mengonfirmasi" wajib>
            <Input
              autoFocus
              value={ketikan}
              onChange={(e) => setKetikan(e.target.value)}
              placeholder="HAPUS"
            />
          </Kolom>
          {galatAksi && (
            <div className="mt-2.5 flex items-start gap-2 rounded-xl border border-merah/30 bg-merah-lembut px-3 py-2 text-[11.5px] leading-relaxed text-merah-teks">
              <Ikon.Awas size={14} className="mt-px flex-none" />
              <span>{galatAksi}</span>
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}
