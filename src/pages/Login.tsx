import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AKAR } from '@/config/menu'
import { useAuth } from '@/context/AuthContext'
import { Ikon } from '@/lib/ikon'
import { Tombol } from '@/components/ui'
import type { Peran } from '@/types'

const PERAN: { id: Peran; nama: string; ket: string }[] = [
  { id: 'superadmin', nama: 'Super Admin', ket: 'Akses penuh' },
  { id: 'admin', nama: 'Admin', ket: 'Pengawas' },
  { id: 'user', nama: 'Petugas', ket: 'Lapangan' },
]

export function Login() {
  const { masuk } = useAuth()
  const navigate = useNavigate()
  const [lihatSandi, setLihatSandi] = useState(false)

  function pilih(peran: Peran) {
    masuk(peran)
    navigate(AKAR[peran])
  }

  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-[1.02fr_0.98fr]">
      {/* Panel kiri: foto lahan dengan lapisan duotone hijau-teal */}
      <div className="relative min-h-[250px] overflow-hidden bg-ink">
        <div
          className="absolute inset-0 bg-cover bg-[52%_50%] grayscale-[35%] contrast-[1.06]"
          style={{ backgroundImage: "url('/login-bg.jpg')" }}
        />
        <div className="absolute inset-0 mix-blend-multiply bg-[linear-gradient(155deg,rgba(11,55,71,.94)_0%,rgba(16,135,76,.82)_55%,rgba(20,93,49,.95)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(90%_70%_at_30%_30%,transparent_30%,rgba(7,41,50,.55)_100%)]" />
        <div className="tekstur-kontur absolute inset-0 opacity-50" />
        <div className="tekstur-petak absolute inset-0" />

        {/* Lengkung pemisah ke panel kanan */}
        <svg
          className="pointer-events-none absolute right-[-2px] top-0 z-[4] hidden h-full w-[170px] lg:block"
          viewBox="0 0 170 1000"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d="M170 0 H128 C64 150 -6 380 52 606 C96 772 148 864 170 1000 Z" fill="#ffffff" />
        </svg>

        <div className="relative z-[3] flex h-full flex-col justify-between p-7 lg:p-13">
          <div className="flex items-center gap-3.5">
            <img src="/logo-bt.png" alt="Logo Badan Bank Tanah" className="w-[46px]" />
            <div>
              <b className="block text-[15px] font-bold tracking-[-0.01em] text-white">Badan Bank Tanah</b>
              <span className="block text-[11.5px] text-white/60">Indonesia Land Bank Authority</span>
            </div>
          </div>

          <div>
            <h1 className="m-0 mb-3.5 max-w-[17ch] text-[28px] font-extrabold leading-[1.1] tracking-[-0.03em] text-white lg:text-[40px]">
              Satu catatan
              <em className="block not-italic text-emas">untuk satu hari.</em>
            </h1>
            <p className="m-0 max-w-[42ch] text-[14.5px] text-white/75">
              Logbook harian, laporan kendala, dan lembur petugas Security, Office Boy, dan Customer
              Service dalam satu tempat.
            </p>
            <div className="mt-7 hidden gap-6 border-t border-white/20 pt-5 lg:flex">
              {[
                ['248', 'Petugas aktif'],
                ['3', 'Jabatan'],
                ['24/7', 'Pemantauan'],
              ].map(([angka, ket]) => (
                <div key={ket} className="text-white">
                  <b className="num block text-[19px] font-bold">{angka}</b>
                  <span className="text-[11.5px] text-white/60">{ket}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Panel kanan: formulir */}
      <div className="flex min-w-0 items-center justify-center bg-white px-5 py-9 lg:px-10 lg:py-12">
        <div className="w-full max-w-[392px]">
          <div className="mb-7 text-center">
            <img src="/logo-bank-tanah.png" alt="Badan Bank Tanah" className="mx-auto mb-5 w-[150px]" />
            <h2 className="m-0 mb-1.5 text-[27px] font-extrabold tracking-[-0.025em] text-ink">
              Masuk ke akun Anda
            </h2>
            <p className="m-0 text-sm text-teks-lembut">Gunakan email kantor yang terdaftar.</p>
          </div>

          <div className="mb-3.5">
            <label htmlFor="em" className="mb-1.5 block text-[12.5px] font-semibold text-teks-lembut">
              Email
            </label>
            <div className="relative flex items-center">
              <span className="pointer-events-none absolute left-3.5 text-teks-samar">
                <Ikon.Surel size={17} />
              </span>
              <input
                id="em"
                type="email"
                autoComplete="username"
                defaultValue="rahmat.hidayat@banktanah.go.id"
                className="w-full rounded-xl border border-garis-kuat py-3 pl-11 pr-3.5 text-sm focus:border-hijau focus:outline-none focus:ring-[3px] focus:ring-hijau/15"
              />
            </div>
          </div>

          <div className="mb-3.5">
            <label htmlFor="pw" className="mb-1.5 block text-[12.5px] font-semibold text-teks-lembut">
              Kata sandi
            </label>
            <div className="relative flex items-center">
              <span className="pointer-events-none absolute left-3.5 text-teks-samar">
                <Ikon.Kunci size={17} />
              </span>
              <input
                id="pw"
                type={lihatSandi ? 'text' : 'password'}
                autoComplete="current-password"
                defaultValue="petugas2026"
                className="w-full rounded-xl border border-garis-kuat py-3 pl-11 pr-11 text-sm focus:border-hijau focus:outline-none focus:ring-[3px] focus:ring-hijau/15"
              />
              <button
                type="button"
                onClick={() => setLihatSandi((v) => !v)}
                aria-label={lihatSandi ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                className="absolute right-3 text-teks-samar hover:text-hijau"
              >
                <Ikon.Mata size={17} />
              </button>
            </div>
          </div>

          <div className="mb-5 mt-1 flex items-center justify-between text-[12.5px]">
            <label className="flex cursor-pointer items-center gap-2 text-teks-lembut">
              <input type="checkbox" className="accent-hijau" /> Ingat perangkat ini
            </label>
            <a href="#" onClick={(e) => e.preventDefault()} className="font-semibold text-hijau no-underline">
              Lupa kata sandi?
            </a>
          </div>

          <Tombol lebar onClick={() => pilih('admin')}>
            Masuk
          </Tombol>

          <div className="mt-6 border-t border-garis pt-5">
            <p className="m-0 mb-2.5 text-center text-xs text-teks-samar">
              Pratinjau tampilan sesuai peran
            </p>
            <div className="grid grid-cols-3 gap-2.5">
              {PERAN.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => pilih(p.id)}
                  className="rounded-xl border border-garis-kuat bg-white px-2 py-3 text-center transition hover:border-hijau hover:bg-hijau-lembut"
                >
                  <b className="block text-[12.5px] font-bold text-ink">{p.nama}</b>
                  <span className="text-[10.5px] text-teks-samar">{p.ket}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
