import { useState } from 'react'
import {
  BarisData, GridForm, Input, IsiKartu, KakiForm, Kartu, Kolom, KopKartu, Pil, Tombol,
} from '@/components/ui'
import { useAuth } from '@/context/AuthContext'
import { Ikon } from '@/lib/ikon'
import { api, pesanGalat, query } from '@/lib/api'
import { useApi } from '@/lib/useApi'
import { keIso } from '@/lib/tanggal'
import type { Kendala, Logbook } from '@/types'

/** Mengambil angka jam dari teks seperti '4 jam'. */
function jamDari(total: string): number {
  return Number.parseFloat(total.replace(',', '.')) || 0
}

export function Profil() {
  const { akun, peran, keluar } = useAuth()
  const petugas = peran === 'user'

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

        <div className="relative z-[2] grid h-[86px] w-[86px] flex-none place-items-center rounded-3xl border-[1.5px] border-white/30 bg-white/15 text-[30px] font-extrabold text-white backdrop-blur">
          {akun.inisial}
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
        <Tombol className="relative z-[2] border border-white/25 bg-white/15 text-white shadow-none hover:bg-white/25">
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
    </>
  )
}
