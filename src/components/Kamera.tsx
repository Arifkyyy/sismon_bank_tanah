import { useCallback, useEffect, useRef, useState } from 'react'
import { Catatan, Tombol } from '@/components/ui'
import { Ikon } from '@/lib/ikon'
import { cn } from '@/lib/util'

type Hadap = 'user' | 'environment'
type Status = 'memuat' | 'siap' | 'gagal'

/** Pesan yang ramah untuk tiap penolakan getUserMedia. */
function pesanGagal(e: unknown): string {
  const nama = e instanceof DOMException ? e.name : ''
  switch (nama) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'Izin kamera ditolak. Aktifkan izin kamera untuk situs ini lewat ikon gembok di bilah alamat, lalu coba lagi.'
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'Kamera tidak terdeteksi pada perangkat ini.'
    case 'NotReadableError':
      return 'Kamera sedang dipakai aplikasi lain. Tutup aplikasi tersebut lalu coba lagi.'
    default:
      return 'Kamera tidak dapat dibuka. Periksa perangkat kamera Anda lalu coba lagi.'
  }
}

/** Menggambar cap waktu langsung ke dalam gambar supaya ikut tersimpan. */
function gambarCapWaktu(ctx: CanvasRenderingContext2D, teks: string, w: number, h: number) {
  const ukuran = Math.max(13, Math.round(w * 0.03))
  const sisi = Math.round(w * 0.025)
  const isiX = Math.round(ukuran * 0.7)
  const isiY = Math.round(ukuran * 0.45)
  ctx.font = `600 ${ukuran}px "Plus Jakarta Sans", system-ui, sans-serif`
  ctx.textBaseline = 'top'
  const lebar = ctx.measureText(teks).width
  const kotakT = ukuran + isiY * 2
  const kotakY = h - sisi - kotakT
  const r = Math.round(kotakT / 2)

  ctx.fillStyle = 'rgba(7,41,50,.72)'
  ctx.beginPath()
  // roundRect belum ada di sebagian browser lama — mundur ke kotak biasa.
  if (typeof ctx.roundRect === 'function') ctx.roundRect(sisi, kotakY, lebar + isiX * 2, kotakT, r)
  else ctx.rect(sisi, kotakY, lebar + isiX * 2, kotakT)
  ctx.fill()

  ctx.fillStyle = '#FFFFFF'
  ctx.fillText(teks, sisi + isiX, kotakY + isiY)
}

/**
 * Bingkai kamera yang benar-benar hidup: memakai getUserMedia, lalu
 * menyalin bingkai video ke canvas saat rana ditekan. Tidak ada tombol
 * unggah dari galeri — ini disengaja: foto bukti harus diambil saat itu juga.
 *
 * Catatan: browser hanya mengizinkan kamera pada konteks aman (HTTPS atau
 * localhost). Di luar itu komponen menampilkan pesan, bukan gagal diam-diam.
 */
export function Kamera({
  capWaktu,
  pesan = 'Kamera siap',
  sub = 'Arahkan ke wajah dan latar lokasi pos',
  rasio = 'aspect-[4/3]',
  catatan,
  hadapAwal = 'user',
  jumlah = 0,
  maks,
  onAmbil,
  onTutup,
}: {
  capWaktu: string
  pesan?: string
  sub?: string
  rasio?: string
  catatan?: string
  hadapAwal?: Hadap
  /** jumlah foto yang sudah terkumpul — ditampilkan di pojok bingkai */
  jumlah?: number
  /** batas jumlah foto; rana dimatikan bila sudah tercapai */
  maks?: number
  onAmbil?: (foto: string) => void
  onTutup?: () => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [status, setStatus] = useState<Status>('memuat')
  const [galat, setGalat] = useState('')
  const [hadap, setHadap] = useState<Hadap>(hadapAwal)
  const [percobaan, setPercobaan] = useState(0)
  const [kilat, setKilat] = useState(false)

  useEffect(() => {
    let dibatalkan = false
    let aktif: MediaStream | null = null

    async function mulai() {
      setStatus('memuat')
      setGalat('')

      if (!window.isSecureContext) {
        setStatus('gagal')
        setGalat('Kamera hanya bisa diakses lewat HTTPS atau localhost.')
        return
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus('gagal')
        setGalat('Browser ini tidak mendukung akses kamera.')
        return
      }

      try {
        aktif = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: hadap, width: { ideal: 1280 }, height: { ideal: 960 } },
          audio: false,
        })
        if (dibatalkan) {
          aktif.getTracks().forEach((t) => t.stop())
          return
        }
        const v = videoRef.current
        if (v) {
          v.srcObject = aktif
          await v.play().catch(() => undefined)
        }
        setStatus('siap')
      } catch (e) {
        if (dibatalkan) return
        setStatus('gagal')
        setGalat(pesanGagal(e))
      }
    }

    mulai()
    return () => {
      dibatalkan = true
      aktif?.getTracks().forEach((t) => t.stop())
    }
  }, [hadap, percobaan])

  const penuh = maks !== undefined && jumlah >= maks

  const ambil = useCallback(() => {
    const v = videoRef.current
    if (!v || status !== 'siap' || penuh) return
    const w = v.videoWidth
    const h = v.videoHeight
    if (!w || !h) return

    const kanvas = document.createElement('canvas')
    kanvas.width = w
    kanvas.height = h
    const ctx = kanvas.getContext('2d')
    if (!ctx) return

    // Pratinjau kamera depan dicerminkan, jadi hasilnya dicerminkan juga
    // supaya sama dengan yang dilihat petugas saat memotret.
    if (hadap === 'user') {
      ctx.translate(w, 0)
      ctx.scale(-1, 1)
    }
    ctx.drawImage(v, 0, 0, w, h)
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    gambarCapWaktu(ctx, capWaktu, w, h)

    setKilat(true)
    window.setTimeout(() => setKilat(false), 180)
    onAmbil?.(kanvas.toDataURL('image/jpeg', 0.82))
  }, [capWaktu, hadap, onAmbil, penuh, status])

  return (
    <div>
      <div
        className={cn(
          'relative grid overflow-hidden rounded-2xl border border-ink-deep/20 bg-gradient-to-b from-[#173F4E] to-ink shadow-kartu',
          rasio,
        )}
      >
        <video
          ref={videoRef}
          playsInline
          muted
          className={cn(
            'absolute inset-0 h-full w-full object-cover transition-opacity duration-300',
            status === 'siap' ? 'opacity-100' : 'opacity-0',
            hadap === 'user' && '-scale-x-100',
          )}
        />

        {status !== 'siap' && (
          <div className="absolute inset-0 bg-[radial-gradient(48%_40%_at_50%_42%,rgba(36,152,92,.4),transparent_70%)]" />
        )}

        {/* Bingkai sudut — penanda area bidik */}
        <span className="pointer-events-none absolute left-3.5 top-3.5 h-6 w-6 rounded-tl-md border-l-2 border-t-2 border-white/65" />
        <span className="pointer-events-none absolute right-3.5 top-3.5 h-6 w-6 rounded-tr-md border-r-2 border-t-2 border-white/65" />
        <span className="pointer-events-none absolute bottom-[58px] left-3.5 h-6 w-6 rounded-bl-md border-b-2 border-l-2 border-white/65" />
        <span className="pointer-events-none absolute bottom-[58px] right-3.5 h-6 w-6 rounded-br-md border-b-2 border-r-2 border-white/65" />

        <div className="num pointer-events-none absolute left-1/2 top-3.5 -translate-x-1/2 whitespace-nowrap rounded-full bg-ink-deep/70 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur">
          {capWaktu}
        </div>

        {status === 'siap' && (
          <>
            <span className="pointer-events-none absolute left-1/2 top-11 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-hijau/20 px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-white backdrop-blur">
              <i className="h-1.5 w-1.5 animate-pulse rounded-full bg-hijau-terang" />
              Live
            </span>
            <button
              type="button"
              aria-label="Balik kamera depan/belakang"
              onClick={() => setHadap((h) => (h === 'user' ? 'environment' : 'user'))}
              className="absolute bottom-[18px] right-4 grid h-10 w-10 place-items-center rounded-full bg-ink-deep/55 text-white backdrop-blur transition hover:bg-ink-deep/80"
            >
              <Ikon.Putar size={17} />
            </button>
            {jumlah > 0 && (
              <span className="num pointer-events-none absolute bottom-[26px] left-4 rounded-full bg-ink-deep/55 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
                {jumlah}
                {maks ? `/${maks}` : ''} foto
              </span>
            )}
          </>
        )}

        {status === 'memuat' && (
          <div className="relative grid place-items-center px-6 text-center text-white/80">
            <span className="mb-2.5 block h-8 w-8 animate-spin rounded-full border-2 border-white/25 border-t-white/90" />
            <b className="block text-[13.5px] font-semibold text-white">Menyalakan kamera…</b>
            <span className="text-[11.5px]">Izinkan akses kamera bila browser bertanya</span>
          </div>
        )}

        {status === 'gagal' && (
          <div className="relative grid place-items-center px-6 text-center text-white/80">
            <span className="mx-auto mb-2.5 grid h-11 w-11 place-items-center rounded-full bg-merah/25 text-white">
              <Ikon.Awas size={21} />
            </span>
            <b className="block text-[13.5px] font-semibold text-white">Kamera tidak aktif</b>
            <span className="mx-auto mt-0.5 block max-w-[300px] text-[11.5px] leading-relaxed">
              {galat}
            </span>
            <span className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <Tombol kecil onClick={() => setPercobaan((n) => n + 1)}>
                <Ikon.Putar size={13} /> Coba lagi
              </Tombol>
              {onTutup && (
                <button
                  type="button"
                  onClick={onTutup}
                  className="rounded-xl px-3 py-[7px] text-[12.5px] font-semibold text-white/75 underline hover:text-white"
                >
                  Tutup kamera
                </button>
              )}
            </span>
          </div>
        )}

        {status === 'siap' && (
          <button
            type="button"
            aria-label={penuh ? 'Batas foto tercapai' : 'Ambil foto'}
            disabled={penuh}
            onClick={ambil}
            className={cn(
              'absolute bottom-3.5 left-1/2 grid h-[52px] w-[52px] -translate-x-1/2 place-items-center rounded-full border-4 border-white/35 bg-white bg-clip-padding transition active:scale-95',
              penuh ? 'cursor-not-allowed opacity-45' : 'hover:border-emas',
            )}
          >
            <i className={cn('block h-5 w-5 rounded-full', penuh ? 'bg-teks-samar' : 'bg-hijau')} />
          </button>
        )}

        {/* Kilat rana */}
        <span
          aria-hidden
          className={cn(
            'pointer-events-none absolute inset-0 bg-white transition-opacity duration-150',
            kilat ? 'opacity-80' : 'opacity-0',
          )}
        />
      </div>

      {status === 'siap' && (pesan || sub) && (
        <div className="mt-2.5 flex items-center gap-2 text-[11.5px] text-teks-samar">
          <Ikon.Kamera size={13} />
          <b className="font-semibold text-teks-lembut">{pesan}</b>
          <span className="truncate">· {sub}</span>
          {onTutup && (
            <button
              type="button"
              onClick={onTutup}
              className="ml-auto flex-none font-semibold text-teks-lembut underline hover:text-hijau"
            >
              Tutup kamera
            </button>
          )}
        </div>
      )}

      <Catatan>
        {catatan ??
          'Tombol unggah dari galeri dimatikan. Foto diberi cap waktu otomatis saat diambil dan bisa diambil lebih dari satu kali.'}
      </Catatan>
    </div>
  )
}
