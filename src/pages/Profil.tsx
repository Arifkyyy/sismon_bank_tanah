import { useRef, useState } from 'react'
import { Modal } from '@/components/Modal'
import {
  BarisData, GridForm, Input, IsiKartu, KakiForm, Kartu, Kolom, KopKartu, Pil, Tombol,
} from '@/components/ui'
import { useAuth } from '@/context/AuthContext'
import { Ikon } from '@/lib/ikon'
import { api, pesanGalat, query } from '@/lib/api'
import { useApi } from '@/lib/useApi'
import { keIso } from '@/lib/tanggal'
import type { Akun, Kendala, Logbook } from '@/types'

/** Sisi terpanjang foto profil setelah diperkecil, dalam piksel. */
const SISI_FOTO = 512

/** Memperkecil gambar pilihan pengguna jadi data URL JPEG persegi (dipotong di tengah). */
function kecilkanFoto(berkas: File): Promise<string> {
  return new Promise((selesai, gagal) => {
    const url = URL.createObjectURL(berkas)
    const gambar = new Image()
    gambar.onload = () => {
      const sisi = Math.min(gambar.naturalWidth, gambar.naturalHeight)
      const ukuran = Math.min(sisi, SISI_FOTO)
      const kanvas = document.createElement('canvas')
      kanvas.width = ukuran
      kanvas.height = ukuran
      kanvas
        .getContext('2d')!
        .drawImage(
          gambar,
          (gambar.naturalWidth - sisi) / 2,
          (gambar.naturalHeight - sisi) / 2,
          sisi,
          sisi,
          0,
          0,
          ukuran,
          ukuran,
        )
      URL.revokeObjectURL(url)
      selesai(kanvas.toDataURL('image/jpeg', 0.85))
    }
    gambar.onerror = () => {
      URL.revokeObjectURL(url)
      gagal(new Error('Berkas ini bukan gambar yang bisa dibuka.'))
    }
    gambar.src = url
  })
}

function DialogUbahProfil({
  akun,
  jabatan,
  onTutup,
  onTersimpan,
}: {
  akun: Akun
  jabatan: string
  onTutup: () => void
  onTersimpan: (akun: Akun) => void
}) {
  const [nama, setNama] = useState(akun.nama)
  // undefined = foto tidak diubah, null = foto dihapus, teks = foto baru (data URL)
  const [fotoBaru, setFotoBaru] = useState<string | null | undefined>(undefined)
  const [galat, setGalat] = useState('')
  const [menyimpan, setMenyimpan] = useState(false)
  const pilihBerkas = useRef<HTMLInputElement>(null)

  const pratinjau = fotoBaru === undefined ? akun.foto : fotoBaru

  async function pilihFoto(berkas: File | undefined) {
    if (!berkas) return
    setGalat('')
    try {
      setFotoBaru(await kecilkanFoto(berkas))
    } catch (e) {
      setGalat(pesanGalat(e))
    }
  }

  async function simpan() {
    if (!nama.trim()) {
      setGalat('Nama tidak boleh kosong.')
      return
    }
    setMenyimpan(true)
    setGalat('')
    try {
      const hasil = await api<Akun>('/api/auth/profil', 'PATCH', {
        nama,
        foto: fotoBaru || undefined,
        hapusFoto: fotoBaru === null,
      })
      onTersimpan(hasil)
    } catch (e) {
      setGalat(pesanGalat(e))
      setMenyimpan(false)
    }
  }

  return (
    <Modal
      judul="Ubah profil"
      sub="Jabatan hanya bisa diubah oleh admin"
      onTutup={onTutup}
      aksi={
        <>
          <Tombol varian="hantu" onClick={onTutup} disabled={menyimpan}>
            Batal
          </Tombol>
          <Tombol onClick={simpan} disabled={menyimpan}>
            {menyimpan ? 'Menyimpan…' : 'Simpan profil'}
          </Tombol>
        </>
      }
    >
      <div className="mb-4 flex items-center gap-4">
        <span className="grid h-[72px] w-[72px] flex-none place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-hijau-terang to-hijau text-[24px] font-extrabold text-white">
          {pratinjau ? <img src={pratinjau} alt="" className="h-full w-full object-cover" /> : akun.inisial}
        </span>
        <div className="flex flex-wrap gap-2">
          <Tombol varian="hantu" kecil onClick={() => pilihBerkas.current?.click()} disabled={menyimpan}>
            <Ikon.Foto size={14} /> {pratinjau ? 'Ganti foto' : 'Pasang foto'}
          </Tombol>
          {pratinjau && (
            <Tombol varian="bahaya" kecil onClick={() => setFotoBaru(null)} disabled={menyimpan}>
              <Ikon.Sampah size={14} /> Hapus foto
            </Tombol>
          )}
        </div>
        <input
          ref={pilihBerkas}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            void pilihFoto(e.target.files?.[0])
            e.target.value = ''
          }}
        />
      </div>

      <div className="grid gap-3.5">
        <Kolom label="Nama lengkap" wajib>
          <Input value={nama} maxLength={120} onChange={(e) => setNama(e.target.value)} autoFocus />
        </Kolom>
        <Kolom label="Jabatan" bantu="Hubungi admin bila jabatan Anda keliru.">
          <Input value={jabatan} disabled />
        </Kolom>
      </div>

      {galat && (
        <div className="mt-3.5 rounded-xl border border-merah/30 bg-merah-lembut px-3.5 py-2.5 text-[12px] text-merah-teks">
          {galat}
        </div>
      )}
    </Modal>
  )
}

/** Mengambil angka jam dari teks seperti '4 jam'. */
function jamDari(total: string): number {
  return Number.parseFloat(total.replace(',', '.')) || 0
}

export function Profil() {
  const { akun, peran, keluar, perbaruiAkun } = useAuth()
  const petugas = peran === 'user'
  const [ubahProfil, setUbahProfil] = useState(false)

  const [sandiLama, setSandiLama] = useState('')
  const [sandiBaru, setSandiBaru] = useState('')
  const [ulangi, setUlangi] = useState('')
  const [pesan, setPesan] = useState<{ nada: 'baik' | 'buruk'; teks: string } | null>(null)
  const [menyimpan, setMenyimpan] = useState(false)

  const hariIniIso = keIso(new Date())
  const awalBulan = `${hariIniIso.slice(0, 7)}-01`
  const jendela = query({ dari: awalBulan, sampai: hariIniIso })

  // Untuk admin, backend mengembalikan seluruh petugas; untuk petugas, miliknya.
  const { data: logbook } = useApi<Logbook[]>(`/api/logbook${jendela}`, [])
  const { data: kendala } = useApi<Kendala[]>(`/api/kendala${jendela}`, [])
  const { data: lembur } = useApi<{ tanggalIso: string; total: string; status: string }[]>(
    '/api/lembur',
    [],
  )

  const lemburBulanIni = lembur.filter(
    (l) => l.tanggalIso >= awalBulan && l.tanggalIso <= hariIniIso,
  )
  const jamLembur = lemburBulanIni
    .filter((l) => l.status === 'Diterima' || l.status === 'Selesai')
    .reduce((n, l) => n + jamDari(l.total), 0)
  const kendalaSelesai = kendala.filter((k) => k.status === 'Selesai').length
  // Kepatuhan = bagian hari berjalan yang punya catatan.
  const hariTercatat = new Set(logbook.map((l) => l.tanggalIso)).size
  const hariBerjalan = Number(hariIniIso.slice(8, 10))
  const patuh = hariBerjalan ? Math.round((hariTercatat / hariBerjalan) * 100) : 0

  async function gantiSandi() {
    if (sandiBaru.length < 8) {
      setPesan({ nada: 'buruk', teks: 'Kata sandi baru minimal 8 karakter.' })
      return
    }
    if (sandiBaru !== ulangi) {
      setPesan({ nada: 'buruk', teks: 'Ulangan kata sandi tidak sama.' })
      return
    }
    setMenyimpan(true)
    setPesan(null)
    try {
      await api('/api/auth/ganti-sandi', 'POST', { sandiLama, sandiBaru })
      setPesan({ nada: 'baik', teks: 'Kata sandi berhasil diganti.' })
      setSandiLama('')
      setSandiBaru('')
      setUlangi('')
    } catch (e) {
      setPesan({ nada: 'buruk', teks: pesanGalat(e) })
    } finally {
      setMenyimpan(false)
    }
  }

  if (!akun) return null

  return (
    <>
      <div className="relative flex flex-wrap items-center gap-5 overflow-hidden rounded-kartu bg-[linear-gradient(140deg,#0F4657,#0B3747_55%,#145D31)] p-7">
        <div className="tekstur-kontur absolute inset-0 opacity-50" />
        <div className="tekstur-petak absolute inset-0" />

        <div className="relative z-[2] grid h-[86px] w-[86px] flex-none place-items-center overflow-hidden rounded-3xl border-[1.5px] border-white/30 bg-white/15 text-[30px] font-extrabold text-white backdrop-blur">
          {akun.foto ? <img src={akun.foto} alt="" className="h-full w-full object-cover" /> : akun.inisial}
        </div>
        <div className="relative z-[2] min-w-[240px] flex-1">
          <h2 className="m-0 mb-1 text-[23px] font-extrabold tracking-[-0.025em] text-white">{akun.nama}</h2>
          <p className="m-0 mb-3 text-[13px] text-white/70">{akun.email}</p>
          <div className="flex flex-wrap gap-2">
            {[
              [<Ikon.Perisai size={13} key="a" />, akun.peran],
              [<Ikon.Lokasi size={13} key="b" />, akun.unit],
              [<Ikon.Centang size={13} key="c" />, 'Akun aktif'],
            ].map(([ikon, teks], i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/15 px-3 py-1.5 text-[11.5px] font-semibold text-white"
              >
                {ikon}
                {teks}
              </span>
            ))}
          </div>
        </div>
        <Tombol
          onClick={() => setUbahProfil(true)}
          className="relative z-[2] border border-white/25 bg-white/15 text-white shadow-none hover:bg-white/25"
        >
          <Ikon.Pena size={15} /> Ubah profil
        </Tombol>
      </div>

      <div className="mt-4.5 grid grid-cols-1 gap-4.5 xl:grid-cols-[1.62fr_1fr]">
        <div className="grid content-start gap-4.5">
          <Kartu>
            <KopKartu judul="Data diri" sub="Hubungi admin bila ada data yang keliru" />
            <IsiKartu>
              <BarisData label="Nama lengkap">{akun.nama}</BarisData>
              <BarisData label={petugas ? 'Nomor induk petugas' : 'NIP'}>
                <span className="num">{akun.nip}</span>
              </BarisData>
              <BarisData label={petugas ? 'Jabatan' : 'Peran di sistem'}>{akun.peran}</BarisData>
              <BarisData label="Unit penempatan">{akun.unit}</BarisData>
              <BarisData label="Email kantor">{akun.email}</BarisData>
              <BarisData label="Nomor telepon">
                <span className="num">{akun.telepon || '—'}</span>
              </BarisData>
              <BarisData label="Bergabung sejak">{akun.bergabung || '—'}</BarisData>
            </IsiKartu>
          </Kartu>

          <Kartu>
            <KopKartu judul="Keamanan akun" sub="Ganti kata sandi secara berkala" />
            <IsiKartu>
              <GridForm>
                <Kolom label="Kata sandi saat ini" penuh>
                  <Input
                    type="password"
                    autoComplete="current-password"
                    value={sandiLama}
                    onChange={(e) => setSandiLama(e.target.value)}
                  />
                </Kolom>
                <Kolom label="Kata sandi baru">
                  <Input
                    type="password"
                    autoComplete="new-password"
                    placeholder="Minimal 8 karakter"
                    value={sandiBaru}
                    onChange={(e) => setSandiBaru(e.target.value)}
                  />
                </Kolom>
                <Kolom label="Ulangi kata sandi baru">
                  <Input
                    type="password"
                    autoComplete="new-password"
                    placeholder="Ketik ulang"
                    value={ulangi}
                    onChange={(e) => setUlangi(e.target.value)}
                  />
                </Kolom>
              </GridForm>
              {pesan && (
                <div
                  className={
                    pesan.nada === 'baik'
                      ? 'mt-3.5 rounded-xl border border-hijau/30 bg-hijau-lembut px-3.5 py-2.5 text-[12px] text-hijau-tua'
                      : 'mt-3.5 rounded-xl border border-merah/30 bg-merah-lembut px-3.5 py-2.5 text-[12px] text-merah-teks'
                  }
                >
                  {pesan.teks}
                </div>
              )}
            </IsiKartu>
            <KakiForm>
              <Tombol onClick={gantiSandi} disabled={menyimpan}>
                {menyimpan ? 'Menyimpan…' : 'Simpan kata sandi'}
              </Tombol>
            </KakiForm>
          </Kartu>
        </div>

        <div className="grid content-start gap-4.5">
          <Kartu>
            <KopKartu judul="Ringkasan bulan ini" sub="Dihitung dari data bulan berjalan" />
            <IsiKartu>
              <BarisData label={petugas ? 'Catatan aktivitas' : 'Logbook ditinjau'}>
                <span className="num">{logbook.length.toLocaleString('id-ID')}</span>
              </BarisData>
              <BarisData label={petugas ? 'Kendala dilaporkan' : 'Kendala ditangani'}>
                <span className="num">{petugas ? kendala.length : kendalaSelesai}</span>
              </BarisData>
              <BarisData label={petugas ? 'Jam lembur' : 'Penugasan lembur dibuat'}>
                <span className="num">{petugas ? `${jamLembur} jam` : lemburBulanIni.length}</span>
              </BarisData>
              {petugas && (
                <BarisData label="Kepatuhan">
                  <Pil status={patuh >= 96 ? 'Selesai' : patuh >= 70 ? 'Diproses' : 'Ditolak'}>
                    {patuh}%
                  </Pil>
                </BarisData>
              )}
            </IsiKartu>
          </Kartu>

          <Kartu>
            <IsiKartu>
              <Tombol varian="bahaya" lebar onClick={keluar}>
                Keluar dari akun
              </Tombol>
            </IsiKartu>
          </Kartu>
        </div>
      </div>

      {ubahProfil && (
        <DialogUbahProfil
          akun={akun}
          jabatan={akun.peran}
          onTutup={() => setUbahProfil(false)}
          onTersimpan={(baru) => {
            perbaruiAkun(baru)
            setUbahProfil(false)
          }}
        />
      )}
    </>
  )
}
