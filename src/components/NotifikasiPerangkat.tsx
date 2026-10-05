import { useEffect, useState } from 'react'
import { Catatan, IsiKartu, Kartu, KopKartu, Tombol } from '@/components/ui'
import { api, pesanGalat } from '@/lib/api'
import { Ikon } from '@/lib/ikon'
import { aktifkan, bacaStatus, matikan } from '@/lib/push'
import type { StatusPush } from '@/lib/push'

const KETERANGAN: Record<StatusPush, string> = {
  aktif: 'Perangkat ini akan menerima notifikasi walau aplikasi sedang ditutup.',
  mati: 'Aktifkan supaya kabar baru tetap sampai walau aplikasi sedang ditutup.',
  ditolak:
    'Izin notifikasi untuk situs ini ditolak. Buka ikon gembok di bilah alamat → Notifikasi → Izinkan, lalu muat ulang halaman.',
  'tidak-didukung':
    'Browser ini belum mendukung notifikasi push. Di iPhone, pasang aplikasi ke layar utama dulu (Bagikan → Tambahkan ke Layar Utama).',
  'server-mati': 'Notifikasi push belum disiapkan di server. Hubungi pengelola sistem.',
}

/** Kartu di halaman Profil untuk menyalakan/mematikan notifikasi push di perangkat ini. */
export function NotifikasiPerangkat() {
  const [status, setStatus] = useState<StatusPush | null>(null)
  const [sibuk, setSibuk] = useState(false)
  const [pesan, setPesan] = useState<{ nada: 'baik' | 'buruk'; teks: string } | null>(null)

  useEffect(() => {
    bacaStatus()
      .then(setStatus)
      .catch((e) => setPesan({ nada: 'buruk', teks: pesanGalat(e) }))
  }, [])

  async function jalankan(aksi: () => Promise<StatusPush>, berhasil?: string) {
    setSibuk(true)
    setPesan(null)
    try {
      const s = await aksi()
      setStatus(s)
      if (berhasil && s === 'aktif') setPesan({ nada: 'baik', teks: berhasil })
    } catch (e) {
      setPesan({ nada: 'buruk', teks: pesanGalat(e) })
    } finally {
      setSibuk(false)
    }
  }

  async function uji() {
    setSibuk(true)
    setPesan(null)
    try {
      await api('/api/push/uji', 'POST')
      setPesan({
        nada: 'baik',
        teks:
          'Notifikasi uji dikirim dan akan muncul sebagai notifikasi sistem dalam beberapa detik. ' +
          'Bila tidak muncul, pastikan notifikasi untuk browser ini diizinkan di pengaturan perangkat.',
      })
    } catch (e) {
      setPesan({ nada: 'buruk', teks: pesanGalat(e) })
    } finally {
      setSibuk(false)
    }
  }

  const aktif = status === 'aktif'
  return (
    <Kartu>
      <div id="notifikasi-perangkat" />
      <KopKartu
        judul="Notifikasi perangkat"
        sub="Kabar kendala dan lembur langsung ke HP atau laptop ini"
        aksi={
          status && (
            <span
              className={
                aktif
                  ? 'rounded-full bg-hijau-lembut px-2.5 py-1 text-[11.5px] font-semibold text-hijau-tua'
                  : 'rounded-full bg-[#EEF2F0] px-2.5 py-1 text-[11.5px] font-semibold text-teks-lembut'
              }
            >
              {aktif ? 'Aktif' : 'Mati'}
            </span>
          )
        }
      />
      <IsiKartu>
        <p className="m-0 text-[12.5px] leading-relaxed text-teks-lembut">
          {status ? KETERANGAN[status] : 'Memeriksa perangkat…'}
        </p>

        {(status === 'mati' || aktif) && (
          <div className="mt-3.5 flex flex-wrap gap-2">
            {aktif ? (
              <>
                <Tombol kecil varian="hantu" onClick={uji} disabled={sibuk}>
                  <Ikon.Kirim size={14} /> Kirim notifikasi uji
                </Tombol>
                <Tombol kecil varian="hantu" onClick={() => jalankan(matikan)} disabled={sibuk}>
                  Matikan
                </Tombol>
              </>
            ) : (
              <Tombol
                kecil
                onClick={() => jalankan(aktifkan, 'Notifikasi aktif di perangkat ini.')}
                disabled={sibuk}
              >
                <Ikon.Lonceng size={14} /> {sibuk ? 'Mengaktifkan…' : 'Aktifkan notifikasi'}
              </Tombol>
            )}
          </div>
        )}

        {pesan && (
          <div
            className={
              pesan.nada === 'baik'
                ? 'mt-3 rounded-xl border border-hijau/30 bg-hijau-lembut px-3.5 py-2.5 text-[12px] text-hijau-tua'
                : 'mt-3 rounded-xl border border-merah/30 bg-merah-lembut px-3.5 py-2.5 text-[12px] text-merah-teks'
            }
          >
            {pesan.teks}
          </div>
        )}

        {aktif && (
          <Catatan>
            Isi notifikasi hanya nama, tanpa keterangan, karena bisa tampil di layar kunci. Notifikasi berhenti
            otomatis saat Anda keluar dari akun di perangkat ini.
          </Catatan>
        )}
      </IsiKartu>
    </Kartu>
  )
}
