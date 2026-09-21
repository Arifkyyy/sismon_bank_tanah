import { GaleriFoto } from '@/components/Foto'
import { Kamera } from '@/components/Kamera'
import { Tombol } from '@/components/ui'
import { Ikon } from '@/lib/ikon'

/** Batas foto per catatan — cukup untuk beberapa sudut pandang, tidak membebani. */
export const MAKS_FOTO = 5

/**
 * Kendali foto bukti: kamera, galeri hasil jepretan, dan tombol untuk
 * menambah foto berikutnya. Dipakai sama di Logbook dan Laporan Kendala.
 */
export function FotoBukti({
  foto,
  kameraTerbuka,
  capWaktu,
  maks = MAKS_FOTO,
  pesan,
  sub,
  rasio,
  catatan,
  hadapAwal,
  onBuka,
  onTutup,
  onAmbil,
  onHapus,
}: {
  foto: string[]
  kameraTerbuka: boolean
  capWaktu: string
  maks?: number
  pesan?: string
  sub?: string
  rasio?: string
  catatan?: string
  hadapAwal?: 'user' | 'environment'
  onBuka: () => void
  onTutup: () => void
  onAmbil: (foto: string) => void
  onHapus: (indeks: number) => void
}) {
  const penuh = foto.length >= maks

  return (
    <div className="flex flex-col gap-3">
      {foto.length > 0 && (
        <>
          <div className="flex items-center gap-2 rounded-xl border border-hijau/30 bg-hijau-lembut px-3.5 py-2.5 text-[12.5px] font-semibold text-hijau-tua">
            <Ikon.Centang size={15} />
            <span className="num">{foto.length}</span> foto tersimpan
            <span className="num ml-auto text-[11.5px] font-semibold text-hijau-tua/70">
              maks {maks}
            </span>
          </div>
          <GaleriFoto foto={foto} onHapus={onHapus} />
        </>
      )}

      {kameraTerbuka ? (
        <Kamera
          capWaktu={capWaktu}
          pesan={pesan}
          sub={sub}
          rasio={rasio}
          catatan={catatan}
          hadapAwal={hadapAwal}
          jumlah={foto.length}
          maks={maks}
          onAmbil={onAmbil}
          onTutup={onTutup}
        />
      ) : (
        <Tombol
          kecil
          varian={foto.length > 0 ? 'hantu' : 'utama'}
          disabled={penuh}
          onClick={onBuka}
          className={penuh ? 'cursor-not-allowed opacity-50' : undefined}
        >
          <Ikon.Kamera size={14} />
          {penuh ? 'Batas foto tercapai' : foto.length > 0 ? 'Ambil foto lagi' : 'Buka kamera'}
        </Tombol>
      )}
    </div>
  )
}
