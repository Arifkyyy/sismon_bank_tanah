import { IsiKartu, Kartu, KopKartu, Pil, TagJabatan, Tombol } from '@/components/ui'
import { Ikon } from '@/lib/ikon'
import type { Status } from '@/types'

const WARNA: [string, string, string][] = [
  ['Sidebar atas', '#09381A', 'Titik awal gradasi sidebar'],
  ['Sidebar bawah', '#1A9E48', 'Titik akhir gradasi sidebar'],
  ['Teal kelembagaan', '#0B3747', 'Judul, teks utama, kop profil'],
  ['Hijau utama', '#10874C', 'Tombol utama, status aman'],
  ['Hijau terang', '#24985C', 'Gradasi dan aksen'],
  ['Hijau tua', '#145D31', 'Teks di atas latar hijau muda'],
  ['Emas', '#F2BE26', 'Menunggu, lembur, penanda aktif'],
  ['Tanah', '#DE7B2C', 'Kendala dan peringatan ringan'],
  ['Merah', '#C4443B', 'Tindakan menghapus dan penolakan'],
  ['Kertas', '#F1F5F2', 'Latar halaman dan penanda menu'],
  ['Garis', '#E1EAE4', 'Garis pemisah dan bingkai kartu'],
]

const STATUS: Status[] = ['Aktif', 'Menunggu', 'Diproses', 'Diterima', 'Ditolak', 'Selesai', 'Cuti', 'Baru']

const ATURAN: [string, string][] = [
  ['Sudut kartu 18px, tombol 12px', 'Sudut besar hanya untuk wadah, sudut kecil untuk kontrol. Jangan disamakan.'],
  ['Bayangan tipis, bukan tebal', 'Kartu dipisahkan oleh garis 1px. Bayangan hanya menambah kedalaman sedikit.'],
  ['Angka selalu tabular', 'Kolom jam, tanggal, dan jumlah memakai angka selebar sama agar lurus ke bawah.'],
  ['Foto wajib dari kamera', 'Di semua form, tombol unggah galeri tidak disediakan sama sekali.'],
  ['Satu warna satu arti', 'Emas selalu berarti menunggu jawaban. Oranye selalu berarti kendala.'],
  ['Sidebar tanpa bayangan', 'Bayangan ke kanan membuat cekungan penanda menu terlihat beda warna.'],
]

export function SistemDesain() {
  return (
    <>
      <Kartu>
        <KopKartu judul="Dari mana warnanya" sub="Seluruh palet diambil dari logo Badan Bank Tanah" />
        <IsiKartu>
          <p className="m-0 mb-4.5 max-w-[72ch] text-[13.5px] leading-relaxed text-teks-lembut">
            Huruf B pada logo memberi dua nada hijau, huruf T memberi emas dan oranye tanah, dan garis
            tepinya memberi teal gelap. Teal dipakai sebagai warna kelembagaan, hijau untuk tindakan,
            emas untuk hal yang perlu dijawab, dan oranye tanah untuk kendala. Merah hanya muncul pada
            tindakan menghapus.
          </p>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(148px,1fr))] gap-3.5">
            {WARNA.map(([nama, hex, guna]) => (
              <div key={hex} className="overflow-hidden rounded-xl border border-garis bg-white">
                <div className="h-[74px]" style={{ background: hex }} />
                <div className="px-3 py-2.5">
                  <b className="block text-[12.5px] text-ink">{nama}</b>
                  <code className="font-sans text-[11px] tracking-wide text-teks-lembut">{hex}</code>
                  <div className="mt-1 text-[11px] text-teks-samar">{guna}</div>
                </div>
              </div>
            ))}
          </div>
        </IsiKartu>
      </Kartu>

      <div className="mt-4.5 grid grid-cols-1 gap-4.5 xl:grid-cols-2">
        <Kartu>
          <KopKartu judul="Tipografi" sub="Plus Jakarta Sans untuk isi, Inter untuk kop sidebar" />
          <IsiKartu>
            {[
              ['Judul halaman · 20/800', <span key="1" className="text-xl font-extrabold tracking-[-0.025em] text-ink">Rekapitulasi</span>],
              ['Angka statistik · 31/800', <span key="2" className="num text-[31px] font-extrabold tracking-[-0.035em] text-ink">1.204</span>],
              ['Judul kartu · 15/700', <span key="3" className="text-[15px] font-bold text-ink">Log aktivitas petugas</span>],
              ['Teks isi · 14/400', <span key="4" className="text-sm">Serah terima shift pagi di Pos Utama.</span>],
              ['Label tabel · 11,5/600', <span key="5" className="text-[11.5px] font-semibold text-teks-samar">Tanggal</span>],
              ['Kop sidebar · Inter 15/700', <span key="6" className="font-inter text-[15px] font-bold text-ink">Badan Bank Tanah</span>],
              ['Sub kop · Inter 10/500', <span key="7" className="font-inter text-[10px] font-medium text-teks-lembut">Indonesia Land Bank Authority</span>],
            ].map(([ket, contoh], i) => (
              <div key={i} className="flex items-baseline gap-4 border-b border-garis py-3 last:border-b-0">
                <span className="w-[160px] flex-none text-[11.5px] text-teks-samar">{ket}</span>
                {contoh}
              </div>
            ))}
          </IsiKartu>
        </Kartu>

        <Kartu>
          <KopKartu judul="Tombol dan status" sub="Setiap warna punya satu arti tetap" />
          <IsiKartu>
            <div className="mb-5 flex flex-wrap gap-2.5">
              <Tombol>Kirim catatan</Tombol>
              <Tombol varian="hantu">Kosongkan</Tombol>
              <Tombol varian="gelap">Lihat detail</Tombol>
              <Tombol varian="bahaya">Hapus foto</Tombol>
            </div>
            <div className="mb-5 flex flex-wrap gap-2">
              {STATUS.map((s) => (
                <Pil key={s} status={s} />
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <TagJabatan jabatan="Security" />
              <TagJabatan jabatan="OB" />
              <TagJabatan jabatan="CS" />
              <TagJabatan jabatan="Messenger" />
            </div>
          </IsiKartu>
        </Kartu>
      </div>

      <Kartu className="mt-4.5">
        <KopKartu judul="Aturan yang dipakai di seluruh halaman" sub="Supaya tampilan tetap konsisten saat dikembangkan" />
        <IsiKartu className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
          {ATURAN.map(([judul, isi]) => (
            <div key={judul} className="flex gap-3 border-b border-garis py-3">
              <span className="mt-0.5 flex-none text-hijau">
                <Ikon.Centang size={16} />
              </span>
              <div>
                <b className="mb-0.5 block text-[13.5px] text-ink">{judul}</b>
                <span className="text-[12.5px] leading-relaxed text-teks-lembut">{isi}</span>
              </div>
            </div>
          ))}
        </IsiKartu>
      </Kartu>
    </>
  )
}
