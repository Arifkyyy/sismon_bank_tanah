import { useCallback, useEffect, useRef, useState } from 'react'
import { Catatan, Tombol } from '@/components/ui'
import { Ikon } from '@/lib/ikon'
import { useJamHidup, waktuPenuh } from '@/lib/tanggal'
import { cn } from '@/lib/util'

type Hadap = 'user' | 'environment'
type Status = 'memuat' | 'siap' | 'gagal'

/** Keterangan yang menyertai satu jepretan. */
export interface MetaFoto {
  /** waktu pengambilan dalam ISO penuh, mis. '2026-09-22T14:03:21.442+07:00' */
  waktu: string
  /** waktu yang sama dalam bentuk terbaca, sama persis dengan yang tercetak di foto */
  waktuTeks: string
}

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

/** Waktu jepretan dalam ISO lokal berikut selisih zona, mis. '…T14:03:21.442+07:00'. */
function isoLokal(t: Date): string {
  const p = (n: number, l = 2) => String(n).padStart(l, '0')
  const selisih = -t.getTimezoneOffset()
  const tanda = selisih < 0 ? '-' : '+'
  const jam = Math.floor(Math.abs(selisih) / 60)
  const menit = Math.abs(selisih) % 60
  return (
    `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}` +
    `T${p(t.getHours())}:${p(t.getMinutes())}:${p(t.getSeconds())}.${p(t.getMilliseconds(), 3)}` +
    `${tanda}${p(jam)}:${p(menit)}`
  )
}

/**
 * Menggambar cap waktu langsung ke dalam gambar supaya ikut tersimpan — foto
 * yang sudah keluar dari aplikasi tetap membawa waktu pengambilannya.
 * Ukurannya sengaja kecil supaya tidak menutupi isi foto.
 */
function gambarCapWaktu(ctx: CanvasRenderingContext2D, teks: string, w: number, h: number) {
  const ukuran = Math.max(11, Math.round(w * 0.016))
  const sisi = Math.round(w * 0.022)
  const isiX = Math.round(ukuran * 0.75)
  const isiY = Math.round(ukuran * 0.5)
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
 * Setiap jepretan dicap dengan waktu nyata perangkat sampai detik — dibakar ke
 * dalam gambar sekaligus dikirim balik lewat `onAmbil` untuk disimpan sebagai data.
 *
 * Catatan: browser hanya mengizinkan kamera pada konteks aman (HTTPS atau
 * localhost). Di luar itu komponen menampilkan pesan, bukan gagal diam-diam.
 */
export function Kamera({
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
  pesan?: string
  sub?: string
  rasio?: string
  catatan?: string
  hadapAwal?: Hadap
  /** jumlah foto yang sudah terkumpul — ditampilkan di pojok bingkai */
  jumlah?: number
  /** batas jumlah foto; rana dimatikan bila sudah tercapai */
  maks?: number
  onAmbil?: (foto: string, meta: MetaFoto) => void
  onTutup?: () => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [status, setStatus] = useState<Status>('memuat')
  const [galat, setGalat] = useState('')
  const [hadap, setHadap] = useState<Hadap>(hadapAwal)
  // Arah yang benar-benar diberikan perangkat — belum tentu sama dengan yang
  // diminta (mis. laptop yang cuma punya satu kamera). Cermin pratinjau dan
  // hasil jepretan mengikuti nilai ini, bukan permintaan.
  const [hadapNyata, setHadapNyata] = useState<Hadap>(hadapAwal)
  const [banyakKamera, setBanyakKamera] = useState(true)
  const [percobaan, setPercobaan] = useState(0)
  const [kilat, setKilat] = useState(false)

  const sekarang = useJamHidup()
  const jamTeks = waktuPenuh(sekarang)

  useEffect(() => {
    let dibatalkan = false
    let aktif: MediaStream | null = null

    /**
     * Meminta kamera dengan arah tertentu, mundur bertahap bila ditolak:
     * exact → ideal → kamera apa adanya. `exact` dipakai lebih dulu karena
     * hanya itu yang dipatuhi Chrome Android dan Safari iOS saat berpindah
     * kamera; tanpa `exact` permintaan 'environment' sering dibalas kamera
     * depan yang sedang aktif. Nilai balik `pasti` menandai apakah arah yang
     * diminta memang terpenuhi.
     */
    async function minta(arah: Hadap): Promise<{ arus: MediaStream; pasti: boolean }> {
      const ukuran = { width: { ideal: 1280 }, height: { ideal: 960 } }
      try {
        const arus = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { exact: arah }, ...ukuran },
          audio: false,
        })
        return { arus, pasti: true }
      } catch (e) {
        const nama = e instanceof DOMException ? e.name : ''
        // Hanya penolakan karena arah yang tak tersedia yang boleh dilonggarkan;
        // izin ditolak atau kamera dipakai aplikasi lain tetap dilempar ke atas.
        if (nama !== 'OverconstrainedError' && nama !== 'NotFoundError' && nama !== 'TypeError') throw e
        try {
          const arus = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: arah }, ...ukuran },
            audio: false,
          })
          return { arus, pasti: false }
        } catch {
          const arus = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
          return { arus, pasti: false }
        }
      }
    }

    async function mulai() {
      setStatus('memuat')
      setGalat('')

      if (!window.isSecureContext) {
        setStatus('gagal')
        setGalat('Kamera hanya bisa dibuka lewat HTTPS atau localhost. Di ponsel, buka aplikasi ini memakai alamat https.')
        return
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus('gagal')
        setGalat('Browser ini tidak mendukung akses kamera.')
        return
      }

      try {
        const { arus, pasti } = await minta(hadap)
        aktif = arus
        if (dibatalkan) {
          aktif.getTracks().forEach((t) => t.stop())
          return
        }

        // Arah sebenarnya dibaca dari track; kalau perangkat tidak melaporkannya,
        // anggap terpenuhi bila permintaan `exact` tadi berhasil.
        const jalur = aktif.getVideoTracks()[0]
        const lapor = jalur?.getSettings().facingMode
        const nyata: Hadap = lapor === 'environment' || lapor === 'user' ? lapor : pasti ? hadap : 'user'
        setHadapNyata(nyata)

        const v = videoRef.current
        if (v) {
          v.srcObject = aktif
          await v.play().catch(() => undefined)
        }
        setStatus('siap')

        // Tombol balik hanya berguna kalau perangkat memang punya lebih dari
        // satu kamera. Daftar ini baru terisi setelah izin diberikan.
        navigator.mediaDevices
          .enumerateDevices?.()
          .then((daftar) => {
            if (dibatalkan) return
            const kamera = daftar.filter((d) => d.kind === 'videoinput')
            if (kamera.length) setBanyakKamera(kamera.length > 1)
          })
          .catch(() => undefined)
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
  const belakang = hadapNyata === 'environment'
  // Arah yang diminta tidak terpenuhi — perangkat cuma punya satu kamera.
  const takTersedia = status === 'siap' && hadap !== hadapNyata

  /**
   * Berpindah kamera. Tujuan dihitung dari arah yang sedang benar-benar aktif,
   * bukan dari yang terakhir diminta, supaya sekali tekan selalu terasa pindah.
   */
  const balik = useCallback(() => {
    const tujuan: Hadap = belakang ? 'user' : 'environment'
    if (hadap === tujuan) setPercobaan((n) => n + 1)
    else setHadap(tujuan)
  }, [belakang, hadap])

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
    if (hadapNyata === 'user') {
      ctx.translate(w, 0)
      ctx.scale(-1, 1)
    }
    ctx.drawImage(v, 0, 0, w, h)
    ctx.setTransform(1, 0, 0, 1, 0, 0)

    // Waktu dibaca ulang saat rana ditekan, bukan diambil dari jam yang
    // berdetak, supaya detiknya persis sama dengan saat bingkai disalin.
    const saat = new Date()
    const waktuTeks = waktuPenuh(saat)
    gambarCapWaktu(ctx, waktuTeks, w, h)

    setKilat(true)
    window.setTimeout(() => setKilat(false), 180)
    onAmbil?.(kanvas.toDataURL('image/jpeg', 0.82), { waktu: isoLokal(saat), waktuTeks })
  }, [hadapNyata, onAmbil, penuh, status])

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
            hadapNyata === 'user' && '-scale-x-100',
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

        {/* Jam berdetak — angka yang sama yang akan tercetak di foto */}
        <div className="num pointer-events-none absolute left-1/2 top-3.5 -translate-x-1/2 whitespace-nowrap rounded-full bg-ink-deep/70 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur">
          {jamTeks}
        </div>

        {status === 'siap' && (
          <>
            <span className="pointer-events-none absolute left-1/2 top-11 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-hijau/20 px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-white backdrop-blur">
              <i className="h-1.5 w-1.5 animate-pulse rounded-full bg-hijau-terang" />
              Live
            </span>
            {banyakKamera && (
              <button
                type="button"
                aria-label={belakang ? 'Ganti ke kamera depan' : 'Ganti ke kamera belakang'}
                title={belakang ? 'Ganti ke kamera depan' : 'Ganti ke kamera belakang'}
                onClick={balik}
                className="absolute bottom-[18px] right-4 grid h-10 w-10 place-items-center rounded-full bg-ink-deep/55 text-white backdrop-blur transition hover:bg-ink-deep/80"
              >
                <Ikon.Putar size={17} />
              </button>
            )}
            <span
              className={cn(
                'pointer-events-none absolute bottom-[26px] rounded-full bg-ink-deep/55 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur',
                banyakKamera ? 'right-[68px]' : 'right-4',
              )}
            >
              {belakang ? 'Kamera belakang' : 'Kamera depan'}
            </span>
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
              <button
                type="button"
                onClick={balik}
                className="rounded-xl px-3 py-[7px] text-[12.5px] font-semibold text-white/75 underline hover:text-white"
              >
                Coba kamera {belakang ? 'depan' : 'belakang'}
              </button>
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

      {takTersedia && (
        <div className="mt-2.5 flex items-start gap-2 rounded-xl border border-emas/40 bg-emas-lembut px-3 py-2 text-[11.5px] leading-relaxed text-emas-teks">
          <Ikon.Awas size={14} className="mt-px flex-none" />
          <span>
            Perangkat ini tidak menyediakan kamera {hadap === 'environment' ? 'belakang' : 'depan'}, jadi
            yang dipakai kamera {belakang ? 'belakang' : 'depan'}.
          </span>
        </div>
      )}

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
          'Tombol unggah dari galeri dimatikan. Foto otomatis dicap waktu nyata perangkat saat diambil dan bisa diambil lebih dari satu kali.'}
      </Catatan>
    </div>
  )
}
