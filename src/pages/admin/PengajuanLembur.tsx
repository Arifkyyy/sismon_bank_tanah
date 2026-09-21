import { useState } from 'react'
import { Linimasa } from '@/components/Linimasa'
import {
  AreaTeks, Baris, Catatan, GridForm, Input, IsiKartu, KakiForm, KakiTabel, Kartu, Kolom,
  KopKartu, Pil, Pilihan, Segmen, SelOrang, Tabel, Tombol,
} from '@/components/ui'
import { LEMBUR } from '@/data/mock'
import { Ikon } from '@/lib/ikon'

/** Menghitung selisih dua jam "HH:MM" menjadi teks "N jam M menit". */
function lamaLembur(mulai: string, selesai: string): string {
  const [jm, mm] = mulai.split(':').map(Number)
  const [js, ms] = selesai.split(':').map(Number)
  let menit = js * 60 + ms - (jm * 60 + mm)
  if (menit < 0) menit += 24 * 60 // lewat tengah malam
  return `${Math.floor(menit / 60)} jam ${menit % 60} menit`
}

export function PengajuanLembur() {
  const [jabatan, setJabatan] = useState('Security')
  const [mulai, setMulai] = useState('18:00')
  const [selesai, setSelesai] = useState('22:00')

  return (
    <>
      <div className="grid grid-cols-1 gap-4.5 xl:grid-cols-[1.62fr_1fr]">
        <Kartu className="self-start">
          <KopKartu judul="Buat penugasan lembur" sub="Petugas akan menerima pemberitahuan dan bisa menolak" />
          <IsiKartu>
            <GridForm>
              <Kolom label="Jabatan yang ditugaskan" wajib penuh>
                <Segmen
                  lebar
                  opsi={['Security', 'Office Boy', 'Customer Service']}
                  nilai={jabatan}
                  onPilih={setJabatan}
                />
              </Kolom>

              <Kolom label="Nama petugas" wajib penuh bantu="Daftar menyesuaikan jabatan yang dipilih di atas.">
                <Pilihan defaultValue="Bagas Setiawan — Pos Utama Gedung A">
                  <option>Bagas Setiawan — Pos Utama Gedung A</option>
                  <option>Slamet Riyadi — Pos Parkir Timur</option>
                  <option>Andri Kurniawan — Shift malam</option>
                </Pilihan>
              </Kolom>

              <Kolom label="Tanggal lembur" wajib>
                <Input type="date" defaultValue="2026-09-16" />
              </Kolom>

              <Kolom label="Total lama lembur" bantu="Terisi otomatis dari rentang jam.">
                <Input readOnly value={lamaLembur(mulai, selesai)} />
              </Kolom>

              <Kolom label="Jam mulai" wajib>
                <Input type="time" value={mulai} onChange={(e) => setMulai(e.target.value)} />
              </Kolom>

              <Kolom label="Jam selesai" wajib>
                <Input type="time" value={selesai} onChange={(e) => setSelesai(e.target.value)} />
              </Kolom>

              <Kolom label="Keterangan tugas" wajib penuh>
                <AreaTeks
                  defaultValue="Pengamanan rapat koordinasi direksi di Ruang Serbaguna lantai 5."
                  placeholder="Contoh: pengamanan rapat koordinasi direksi di Ruang Serbaguna lantai 5."
                />
              </Kolom>
            </GridForm>
          </IsiKartu>
          <KakiForm>
            <Tombol varian="hantu">Kosongkan</Tombol>
            <Tombol>
              <Ikon.Kirim size={15} /> Kirim penugasan
            </Tombol>
          </KakiForm>
        </Kartu>

        <Kartu className="self-start">
          <KopKartu judul="Cara penugasan berjalan" sub="Berlaku sama untuk ketiga jabatan" />
          <IsiKartu>
            <Linimasa
              pos={[
                { jam: 'Langkah 1', judul: 'Admin mengirim penugasan', isi: 'Petugas menerima pemberitahuan di halaman Lembur miliknya.' },
                { jam: 'Langkah 2', judul: 'Petugas menjawab', isi: 'Petugas boleh menolak. Alasan penolakan tercatat dan terlihat oleh admin.', nada: 'emas' },
                { jam: 'Langkah 3', judul: 'Jam lembur masuk rekap', isi: 'Hanya penugasan yang diterima yang dihitung di halaman Rekapitulasi.' },
              ]}
            />
            <Catatan>
              Penugasan yang belum dijawab sampai pukul 16.00 otomatis berstatus kedaluwarsa.
            </Catatan>
          </IsiKartu>
        </Kartu>
      </div>

      <Kartu className="mt-4.5">
        <KopKartu judul="Penugasan yang sudah dikirim" sub="Jawaban petugas muncul di kolom status" />
        <Tabel kepala={['Petugas', 'Tanggal', 'Rentang jam', 'Total', 'Keterangan', 'Status']}>
          {LEMBUR.map((l) => (
            <Baris key={l.nama + l.tanggal}>
              <td>
                <SelOrang nama={l.nama} jabatan={l.jabatan} />
              </td>
              <td className="num whitespace-nowrap">{l.tanggal}</td>
              <td className="num whitespace-nowrap">{l.rentang}</td>
              <td className="num whitespace-nowrap">{l.total}</td>
              <td className="max-w-[420px] whitespace-normal text-teks-lembut">{l.keterangan}</td>
              <td>
                <Pil status={l.status} />
              </td>
            </Baris>
          ))}
        </Tabel>
        <KakiTabel dari={1} ke={5} total={34} />
      </Kartu>
    </>
  )
}
