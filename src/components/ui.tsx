import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { Ikon } from '@/lib/ikon'
import { cn, inisial, warnaAvatar, WARNA_FOTO, WARNA_JABATAN, WARNA_STATUS } from '@/lib/util'
import type { Jabatan, Status } from '@/types'

/* ---------------------------------------------------------------- Tombol */

type VarianTombol = 'utama' | 'hantu' | 'gelap' | 'bahaya'

interface PropsTombol extends ButtonHTMLAttributes<HTMLButtonElement> {
  varian?: VarianTombol
  kecil?: boolean
  lebar?: boolean
}

const GAYA_TOMBOL: Record<VarianTombol, string> = {
  utama: 'bg-gradient-to-br from-hijau-terang to-hijau text-white shadow-tombol hover:brightness-105 active:translate-y-px',
  hantu: 'border border-garis-kuat bg-white text-teks hover:border-hijau hover:text-hijau',
  gelap: 'bg-ink text-white hover:brightness-125',
  bahaya: 'bg-merah-lembut text-merah hover:bg-merah hover:text-white',
}

export function Tombol({ varian = 'utama', kecil, lebar, className, ...rest }: PropsTombol) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold transition',
        kecil ? 'px-3 py-[7px] text-[12.5px]' : 'px-5 py-3 text-sm',
        lebar && 'w-full',
        GAYA_TOMBOL[varian],
        className,
      )}
      {...rest}
    />
  )
}

/* ----------------------------------------------------------------- Kartu */

export function Kartu({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('min-w-0 rounded-kartu border border-garis bg-white shadow-kartu', className)}>
      {children}
    </div>
  )
}

export function KopKartu({
  judul,
  sub,
  aksi,
}: {
  judul: ReactNode
  sub?: ReactNode
  aksi?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-garis px-5 py-4">
      <div className="min-w-0">
        <h3 className="m-0 text-[15px] font-bold tracking-[-0.015em] text-ink">{judul}</h3>
        {sub && <p className="m-0 mt-0.5 text-xs text-teks-lembut">{sub}</p>}
      </div>
      {aksi && <div className="ml-auto flex flex-wrap items-center gap-2">{aksi}</div>}
    </div>
  )
}

export function IsiKartu({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('p-5', className)}>{children}</div>
}

export function KakiForm({ children }: { children: ReactNode }) {
  return (
    <div className="flex justify-end gap-2.5 rounded-b-kartu border-t border-garis bg-[#FAFCFB] px-5 py-4">
      {children}
    </div>
  )
}

/* ------------------------------------------------------------- Pil & tag */

export function Pil({ status, children }: { status: Status; children?: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11.5px] font-semibold',
        WARNA_STATUS[status],
      )}
    >
      <i className="h-1.5 w-1.5 rounded-full bg-current" />
      {children ?? status}
    </span>
  )
}

export function TagJabatan({ jabatan }: { jabatan: Jabatan }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-[7px] border px-2 py-0.5 text-[11.5px] font-semibold',
        WARNA_JABATAN[jabatan],
      )}
    >
      {jabatan}
    </span>
  )
}

/* ---------------------------------------------------------------- Avatar */

export function Avatar({
  nama,
  jabatan,
  ukuran = 34,
  emas,
}: {
  nama: string
  jabatan?: Jabatan
  ukuran?: number
  emas?: boolean
}) {
  return (
    <span
      className="grid flex-none place-items-center rounded-[10px] font-bold text-white"
      style={{
        width: ukuran,
        height: ukuran,
        fontSize: ukuran * 0.36,
        background: emas
          ? 'linear-gradient(135deg,#F2BE26,#DE7B2C)'
          : jabatan
            ? warnaAvatar(jabatan)
            : 'linear-gradient(135deg,#24985C,#145D31)',
        color: emas ? '#072932' : undefined,
      }}
    >
      {inisial(nama)}
    </span>
  )
}

export function SelOrang({ nama, jabatan }: { nama: string; jabatan: Jabatan }) {
  return (
    <div className="flex items-center gap-3">
      <Avatar nama={nama} jabatan={jabatan} />
      <div>
        <b className="block whitespace-nowrap text-[13px] font-semibold text-ink">{nama}</b>
        <span className="block text-[11.5px] text-teks-samar">{jabatan}</span>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------ Foto bukti */

export function FotoKecil({ varian = 'a' }: { varian?: 'a' | 'b' | 'c' }) {
  return (
    <button
      type="button"
      aria-label="Lihat foto"
      className={cn(
        'grid h-[34px] w-11 place-items-center overflow-hidden rounded-md border border-garis-kuat bg-gradient-to-br text-white/90 hover:border-hijau',
        WARNA_FOTO[varian],
      )}
    >
      <Ikon.Foto size={15} />
    </button>
  )
}

/* ----------------------------------------------------------------- Tabel */

export function Tabel({ kepala, children }: { kepala: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {kepala.map((k) => (
              <th
                key={k}
                className="whitespace-nowrap border-b border-garis bg-[#FAFCFB] px-4 py-3 text-left text-[11.5px] font-semibold text-teks-samar"
              >
                {k}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

export function Baris({ children }: { children: ReactNode }) {
  return <tr className="hover:bg-[#FAFCFB] [&>td]:border-b [&>td]:border-garis [&>td]:px-4 [&>td]:py-3 [&>td]:align-middle [&>td]:text-[13px] [&:last-child>td]:border-b-0">{children}</tr>
}

export function KakiTabel({ dari, ke, total }: { dari: number; ke: number; total: number }) {
  return (
    <div className="flex items-center justify-between border-t border-garis px-5 py-3 text-[12.5px] text-teks-lembut">
      <span className="num">
        Menampilkan {dari}–{ke} dari {total.toLocaleString('id-ID')} data
      </span>
      <div className="flex gap-1.5">
        {['‹', '1', '2', '3', '›'].map((h, i) => (
          <button
            key={h}
            type="button"
            aria-current={i === 1 ? 'true' : undefined}
            className={cn(
              'h-[31px] min-w-[31px] rounded-lg border px-2 text-[12.5px]',
              i === 1
                ? 'border-ink bg-ink font-semibold text-white'
                : 'border-garis bg-white hover:border-hijau hover:text-hijau',
            )}
          >
            {h}
          </button>
        ))}
      </div>
    </div>
  )
}

export function AksiBaris({ children }: { children: ReactNode }) {
  return <div className="flex justify-end gap-1.5">{children}</div>
}

export function TombolIkon({
  label,
  bahaya,
  children,
  onClick,
}: {
  label: string
  bahaya?: boolean
  children: ReactNode
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        'grid h-[31px] w-[31px] place-items-center rounded-lg border border-garis bg-white text-teks-lembut',
        bahaya
          ? 'hover:border-merah hover:bg-merah-lembut hover:text-merah'
          : 'hover:border-hijau hover:bg-hijau-lembut hover:text-hijau',
      )}
    >
      {children}
    </button>
  )
}

/* ------------------------------------------------------------------ Form */

export function Kolom({
  label,
  wajib,
  bantu,
  penuh,
  children,
}: {
  label: string
  wajib?: boolean
  bantu?: string
  penuh?: boolean
  children: ReactNode
}) {
  return (
    <div className={cn(penuh && 'sm:col-span-2')}>
      <label className="mb-1.5 block text-[12.5px] font-semibold text-teks-lembut">
        {label} {wajib && <span className="text-tanah">*</span>}
      </label>
      {children}
      {bantu && <p className="m-0 mt-1.5 text-[11.5px] text-teks-samar">{bantu}</p>}
    </div>
  )
}

const GAYA_INPUT =
  'w-full rounded-xl border border-garis-kuat bg-white px-3.5 py-3 text-sm transition focus:border-hijau focus:outline-none focus:ring-[3px] focus:ring-hijau/15 disabled:bg-[#F7FAF8] read-only:bg-[#F7FAF8]'

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(GAYA_INPUT, className)} {...rest} />
}

export function Pilihan({ className, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(GAYA_INPUT, 'appearance-none pr-9', className)} {...rest} />
}

export function AreaTeks({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(GAYA_INPUT, 'min-h-[92px] resize-y leading-relaxed', className)} {...rest} />
}

export function GridForm({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
}

/* ------------------------------------------------------- Kendali lainnya */

export function Segmen({
  opsi,
  nilai,
  onPilih,
  lebar,
}: {
  opsi: string[]
  nilai: string
  onPilih: (v: string) => void
  lebar?: boolean
}) {
  return (
    <div className={cn('inline-flex rounded-xl bg-[#EBF1ED] p-1', lebar && 'w-full')}>
      {opsi.map((o) => (
        <button
          key={o}
          type="button"
          aria-pressed={o === nilai}
          onClick={() => onPilih(o)}
          className={cn(
            'whitespace-nowrap rounded-[9px] px-4 py-[7px] text-[12.5px] font-semibold transition',
            lebar && 'flex-1',
            o === nilai ? 'bg-white text-ink shadow-sm' : 'text-teks-lembut hover:text-ink',
          )}
        >
          {o}
        </button>
      ))}
    </div>
  )
}

export function PilihRapi({ className, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'max-w-full appearance-none rounded-[10px] border border-garis-kuat bg-white bg-[length:12px] bg-[right_11px_center] bg-no-repeat py-2.5 pl-3 pr-8 text-[13px] focus:border-hijau focus:outline-none',
        className,
      )}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%235E7883' stroke-width='3'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")",
      }}
      {...rest}
    />
  )
}

export function Peringatan({ judul, children }: { judul: string; children: ReactNode }) {
  return (
    <div className="flex gap-3 rounded-xl border border-[#F0CFCB] bg-merah-lembut px-4 py-3.5 text-[12.5px] leading-relaxed text-merah-teks">
      <span className="mt-0.5 flex-none">
        <Ikon.Awas size={18} />
      </span>
      <div>
        <b className="mb-0.5 block text-[13px]">{judul}</b>
        {children}
      </div>
    </div>
  )
}

export function Catatan({ children }: { children: ReactNode }) {
  return (
    <div className="mt-3 flex gap-2.5 rounded-[10px] bg-emas-lembut px-3 py-2.5 text-[11.5px] leading-relaxed text-[#7A5D04]">
      <span className="mt-px flex-none">
        <Ikon.Info size={15} />
      </span>
      <div>{children}</div>
    </div>
  )
}

export function BarisData({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-garis py-3 text-[13px] last:border-b-0">
      <span className="text-teks-lembut">{label}</span>
      <b className="text-right font-semibold text-ink">{children}</b>
    </div>
  )
}
