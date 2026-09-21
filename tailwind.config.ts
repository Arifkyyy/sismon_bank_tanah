import type { Config } from 'tailwindcss'

/**
 * Seluruh palet diambil dari logo Badan Bank Tanah.
 * - ink    : teal kelembagaan, dipakai untuk judul & teks utama
 * - hijau  : warna tindakan (tombol utama, status aman)
 * - emas   : status menunggu / jam lembur
 * - tanah  : laporan kendala
 * - merah  : HANYA untuk tindakan menghapus
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: '#0B3747', deep: '#072932', light: '#0F4657' },
        hijau: {
          DEFAULT: '#10874C',
          terang: '#24985C',
          tua: '#145D31',
          lembut: '#E7F2EB',
        },
        emas: { DEFAULT: '#F2BE26', lembut: '#FDF3D7', teks: '#8A6A05' },
        tanah: { DEFAULT: '#DE7B2C', lembut: '#FCEEE0', teks: '#A8541A' },
        merah: { DEFAULT: '#C4443B', lembut: '#FAEAE8', teks: '#8E3029' },
        kertas: '#F1F5F2',
        garis: { DEFAULT: '#E1EAE4', kuat: '#CBD9D1' },
        teks: { DEFAULT: '#12343F', lembut: '#5E7883', samar: '#8AA0A8' },
        // gradasi sidebar (sesuai spesifikasi Figma)
        sidebar: { atas: '#09381A', bawah: '#1A9E48', dasar: '#12824D' },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        inter: ['Inter', '"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      borderRadius: { kartu: '18px', sidebar: '26px' },
      boxShadow: {
        kartu: '0 1px 2px rgba(11,55,71,.04), 0 8px 24px -12px rgba(11,55,71,.18)',
        naik: '0 2px 4px rgba(11,55,71,.05), 0 18px 40px -18px rgba(11,55,71,.28)',
        tombol: '0 10px 22px -10px rgba(16,135,76,.75)',
      },
      transitionTimingFunction: {
        // sedikit memantul di akhir — dipakai penanda menu yang meluncur
        pantul: 'cubic-bezier(.34,1.18,.42,1)',
      },
      spacing: { sidebar: '270px', '4.5': '18px', '6.5': '26px', '13': '52px' },
    },
  },
  plugins: [],
} satisfies Config
