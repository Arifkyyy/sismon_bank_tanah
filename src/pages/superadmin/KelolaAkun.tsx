import { useState } from 'react'
import {
  AksiBaris, Baris, GridForm, Input, IsiKartu, KakiForm, KakiTabel, Kartu, Kolom, KopKartu,
  Peringatan, Pil, Pilihan, PilihRapi, Segmen, SelOrang, Tabel, TagJabatan, Tombol, TombolIkon,
} from '@/components/ui'
import { AKUN_ADMIN, PETUGAS } from '@/data/mock'
import { Ikon } from '@/lib/ikon'

export function KelolaAkun() {
  const [jenis, setJenis] = useState('Akun admin')

  return (
    <div className="grid grid-cols-1 gap-4.5 xl:grid-cols-[1fr_1.62fr]">
      <Kartu className="self-start">
        <KopKartu judul="Tambah akun baru" sub="Kata sandi sementara dikirim ke email" />
        <IsiKartu>
          <GridForm>
            <Kolom label="Jenis akun" wajib penuh>
              <Segmen lebar opsi={['Akun admin', 'Akun petugas']} nilai={jenis} onPilih={setJenis} />
            </Kolom>
            <Kolom label="Nama lengkap" wajib penuh>
              <Input placeholder="Contoh: Lestari Wulandari" />
            </Kolom>
            <Kolom label="Jabatan" wajib>
              <Pilihan defaultValue="Security">
                <option>Security</option>
                <option>Office Boy</option>
                <option>Customer Service</option>
                <option>Admin pengawas</option>
              </Pilihan>
            </Kolom>
            <Kolom label="Nomor induk" wajib>
              <Input placeholder="Contoh: 20260915 004" />
            </Kolom>
            <Kolom label="Email kantor" wajib penuh>
              <Input type="email" placeholder="nama.lengkap@banktanah.go.id" />
            </Kolom>
            <Kolom
              label="Unit penempatan"
              penuh
              bantu="Petugas hanya bisa mengisi logbook dari unit yang ditetapkan di sini."
            >
              <Input placeholder="Contoh: Pos Utama — Gedung A" />
            </Kolom>
          </GridForm>
        </IsiKartu>
        <KakiForm>
          <Tombol varian="hantu">Kosongkan</Tombol>
          <Tombol>
            <Ikon.Tambah size={15} /> Buat akun
          </Tombol>
        </KakiForm>
      </Kartu>

      <div className="grid content-start gap-4.5">
        <Kartu>
          <KopKartu
            judul="Akun admin"
            sub={`${AKUN_ADMIN.length} admin pengawas terdaftar`}
            aksi={<Pil status="Diproses">Hanya super admin</Pil>}
          />
          <Tabel kepala={['Nama', 'Email', 'Terakhir masuk', 'Status', 'Aksi']}>
            {AKUN_ADMIN.map((a) => (
              <Baris key={a.email}>
                <td>
                  <SelOrang nama={a.nama} jabatan="OB" />
                </td>
                <td className="text-teks-lembut">{a.email}</td>
                <td className="num whitespace-nowrap text-teks-lembut">{a.masuk}</td>
                <td>
                  <Pil status={a.status} />
                </td>
                <td>
                  <AksiBaris>
                    <TombolIkon label="Ubah">
                      <Ikon.Pena size={15} />
                    </TombolIkon>
                    <TombolIkon label="Atur ulang sandi">
                      <Ikon.Kunci size={15} />
                    </TombolIkon>
                    <TombolIkon label="Hapus akun" bahaya>
                      <Ikon.Sampah size={15} />
                    </TombolIkon>
                  </AksiBaris>
                </td>
              </Baris>
            ))}
          </Tabel>
        </Kartu>

        <Kartu>
          <KopKartu
            judul="Akun petugas"
            sub="48 akun terdaftar"
            aksi={
              <PilihRapi defaultValue="Semua jabatan">
                <option>Semua jabatan</option>
                <option>Security</option>
                <option>OB</option>
                <option>CS</option>
              </PilihRapi>
            }
          />
          <Tabel kepala={['Nama', 'Jabatan', 'Email', 'Status', 'Aksi']}>
            {PETUGAS.slice(0, 5).map((p) => (
              <Baris key={p.email}>
                <td>
                  <SelOrang nama={p.nama} jabatan={p.jabatan} />
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
                    <TombolIkon label="Ubah">
                      <Ikon.Pena size={15} />
                    </TombolIkon>
                    <TombolIkon label="Atur ulang sandi">
                      <Ikon.Kunci size={15} />
                    </TombolIkon>
                    <TombolIkon label="Hapus akun" bahaya>
                      <Ikon.Sampah size={15} />
                    </TombolIkon>
                  </AksiBaris>
                </td>
              </Baris>
            ))}
          </Tabel>
          <KakiTabel dari={1} ke={5} total={48} />
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
    </div>
  )
}
