import type { SVGProps } from 'react'

type Props = SVGProps<SVGSVGElement> & { size?: number }

/** Semua ikon memakai stroke, ukuran dan ketebalan garis yang sama. */
function Dasar({ size = 18, children, ...rest }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  )
}

export const Ikon = {
  Grid: (p: Props) => (
    <Dasar {...p}>
      <rect x="3" y="3" width="7" height="8" rx="2" />
      <rect x="14" y="3" width="7" height="5" rx="2" />
      <rect x="14" y="11" width="7" height="10" rx="2" />
      <rect x="3" y="14" width="7" height="7" rx="2" />
    </Dasar>
  ),
  Orang: (p: Props) => (
    <Dasar {...p}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </Dasar>
  ),
  Buku: (p: Props) => (
    <Dasar {...p}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      <path d="M9 7h7" />
    </Dasar>
  ),
  Rekap: (p: Props) => (
    <Dasar {...p}>
      <rect x="3" y="4" width="18" height="17" rx="3" />
      <path d="M8 2v4M16 2v4M3 10h18M8 15h3M14 15h2M8 18h2" />
    </Dasar>
  ),
  Awas: (p: Props) => (
    <Dasar {...p}>
      <path d="M10.3 3.6 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0z" />
      <path d="M12 9v4M12 17h.01" />
    </Dasar>
  ),
  Jam: (p: Props) => (
    <Dasar {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </Dasar>
  ),
  Profil: (p: Props) => (
    <Dasar {...p}>
      <circle cx="12" cy="8" r="4" />
      <path d="M5.5 21a7 7 0 0 1 13 0" />
    </Dasar>
  ),
  Kunci: (p: Props) => (
    <Dasar {...p}>
      <rect x="4" y="10" width="16" height="11" rx="3" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </Dasar>
  ),
  Foto: (p: Props) => (
    <Dasar {...p}>
      <rect x="3" y="5" width="18" height="15" rx="3" />
      <circle cx="9" cy="11" r="2" />
      <path d="m4 18 5-4 4 3 3-2 4 3" />
    </Dasar>
  ),
  Kamera: (p: Props) => (
    <Dasar {...p}>
      <path d="M3 8a2 2 0 0 1 2-2h2l1.5-2h7L17 6h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <circle cx="12" cy="13" r="3.6" />
    </Dasar>
  ),
  Tambah: (p: Props) => (
    <Dasar {...p}>
      <path d="M12 5v14M5 12h14" />
    </Dasar>
  ),
  Sampah: (p: Props) => (
    <Dasar {...p}>
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" />
    </Dasar>
  ),
  Pena: (p: Props) => (
    <Dasar {...p}>
      <path d="M17 3a2.8 2.8 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5z" />
    </Dasar>
  ),
  Mata: (p: Props) => (
    <Dasar {...p}>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </Dasar>
  ),
  Unduh: (p: Props) => (
    <Dasar {...p}>
      <path d="M12 3v12M7 11l5 5 5-5M4 20h16" />
    </Dasar>
  ),
  Centang: (p: Props) => (
    <Dasar {...p}>
      <path d="m5 13 4 4L19 7" />
    </Dasar>
  ),
  Silang: (p: Props) => (
    <Dasar {...p}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Dasar>
  ),
  Perisai: (p: Props) => (
    <Dasar {...p}>
      <path d="M12 2 4 6v6c0 5 3.4 9 8 10 4.6-1 8-5 8-10V6z" />
      <path d="m9 12 2 2 4-4" />
    </Dasar>
  ),
  Naik: (p: Props) => (
    <Dasar {...p}>
      <path d="M3 17 9 11l4 4 8-8M15 7h6v6" />
    </Dasar>
  ),
  Turun: (p: Props) => (
    <Dasar {...p}>
      <path d="M3 7l6 6 4-4 8 8M21 17h-6v-6" />
    </Dasar>
  ),
  Lokasi: (p: Props) => (
    <Dasar {...p}>
      <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.6" />
    </Dasar>
  ),
  Info: (p: Props) => (
    <Dasar {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </Dasar>
  ),
  Kirim: (p: Props) => (
    <Dasar {...p}>
      <path d="M21 3 3 10.5l7 3 3 7zM21 3 10 14" />
    </Dasar>
  ),
  Surel: (p: Props) => (
    <Dasar {...p}>
      <rect x="2" y="4" width="20" height="16" rx="3" />
      <path d="m3 7 9 6 9-6" />
    </Dasar>
  ),
  Cari: (p: Props) => (
    <Dasar {...p}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </Dasar>
  ),
  Lonceng: (p: Props) => (
    <Dasar {...p}>
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </Dasar>
  ),
  Keluar: (p: Props) => (
    <Dasar {...p}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5M21 12H9" />
    </Dasar>
  ),
  Menu: (p: Props) => (
    <Dasar {...p}>
      <path d="M3 6h18M3 12h18M3 18h18" />
    </Dasar>
  ),
  Putar: (p: Props) => (
    <Dasar {...p}>
      <path d="M20 11a8 8 0 0 0-14-4.5L3 9" />
      <path d="M3 4v5h5" />
      <path d="M4 13a8 8 0 0 0 14 4.5L21 15" />
      <path d="M21 20v-5h-5" />
    </Dasar>
  ),
  Chevron: (p: Props) => (
    <Dasar {...p}>
      <path d="m9 6 6 6-6 6" />
    </Dasar>
  ),
}

export type NamaIkon = keyof typeof Ikon
