import {
  BarisData, GridForm, Input, IsiKartu, KakiForm, Kartu, Kolom, KopKartu, Pil, Tombol,
} from '@/components/ui'
import { useAuth } from '@/context/AuthContext'
import { Ikon } from '@/lib/ikon'

export function Profil() {
  const { akun, peran, keluar } = useAuth()
  if (!akun) return null
  const petugas = peran === 'user'

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
                <span className="num">0812-1144-9021</span>
              </BarisData>
              {petugas && <BarisData label="Jadwal shift">Pagi · 07.00 – 15.00</BarisData>}
              <BarisData label="Bergabung sejak">19 Juli 2021</BarisData>
            </IsiKartu>
          </Kartu>

          <Kartu>
            <KopKartu judul="Keamanan akun" sub="Ganti kata sandi secara berkala" />
            <IsiKartu>
              <GridForm>
                <Kolom label="Kata sandi saat ini" penuh>
                  <Input type="password" defaultValue="petugas2026" />
                </Kolom>
                <Kolom label="Kata sandi baru">
                  <Input type="password" placeholder="Minimal 8 karakter" />
                </Kolom>
                <Kolom label="Ulangi kata sandi baru">
                  <Input type="password" placeholder="Ketik ulang" />
                </Kolom>
              </GridForm>
            </IsiKartu>
            <KakiForm>
              <Tombol>Simpan kata sandi</Tombol>
            </KakiForm>
          </Kartu>
        </div>

        <div className="grid content-start gap-4.5">
          <Kartu>
            <KopKartu judul="Ringkasan bulan ini" sub="1–15 September 2026" />
            <IsiKartu>
              <BarisData label={petugas ? 'Catatan logbook' : 'Logbook ditinjau'}>
                <span className="num">{petugas ? '45' : '1.204'}</span>
              </BarisData>
              <BarisData label={petugas ? 'Kendala dilaporkan' : 'Kendala ditangani'}>
                <span className="num">{petugas ? '2' : '19'}</span>
              </BarisData>
              <BarisData label={petugas ? 'Jam lembur' : 'Penugasan lembur dibuat'}>
                <span className="num">{petugas ? '12 jam' : '34'}</span>
              </BarisData>
              <BarisData label="Kepatuhan">
                <Pil status="Selesai">100%</Pil>
              </BarisData>
            </IsiKartu>
          </Kartu>

          <Kartu>
            <KopKartu judul="Perangkat yang masuk" sub="Keluarkan perangkat yang tidak Anda kenali" />
            <IsiKartu>
              <BarisData
                label={
                  <>
                    Android · Pos Utama
                    <br />
                    <span className="text-[11px] text-teks-samar">Aktif sekarang</span>
                  </>
                }
              >
                <Pil status="Aktif">Perangkat ini</Pil>
              </BarisData>
              <BarisData
                label={
                  <>
                    Chrome · Windows
                    <br />
                    <span className="text-[11px] text-teks-samar">14 Sep 2026, 16.20</span>
                  </>
                }
              >
                <Tombol varian="hantu" kecil>
                  Keluarkan
                </Tombol>
              </BarisData>
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
