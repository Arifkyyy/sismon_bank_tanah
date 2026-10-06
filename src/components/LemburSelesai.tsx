import { useState } from 'react'
import { MAKS_JAM_LEMBUR } from '@/components/AntreanLembur'
import { Modal } from '@/components/Modal'
import { GridForm, Input, Kolom, Tombol } from '@/components/ui'
import { cetakPdf } from '@/lib/cetak'
import { Ikon } from '@/lib/ikon'
import { jumlahJamLembur, lamaLembur, menitLembur } from '@/lib/tanggal'
import type { Lembur } from '@/types'

/** '18.00 – 22.00' → ['18:00', '22:00'], bentuk yang dipakai <input type="time">. */
function jamRencana(l: Lembur): [string, string] {
  const [a = '', b = ''] = l.rentang.split('–').map((s) => s.trim().replace('.', ':'))
  return [a, b]
}

/** Lembur yang diterima dan tanggalnya sudah lewat tampil sebagai 'Selesai'. */
const diterima = (l: Lembur) => l.status === 'Diterima' || l.status === 'Selesai'

/**
 * Rekap lembur sebagai PDF (dialog cetak browser). Dipakai petugas untuk
 * lemburnya sendiri dan admin untuk tabel penugasan yang sedang disaring.
 */
export function cetakRekapLembur(daftar: Lembur[], keterangan: string[], denganNama: boolean) {
  const dihitung = daftar.filter(diterima)
  cetakPdf({
    judul: 'Rekap Lembur',
    keterangan,
    ringkasan: [
      ['Lembur diterima', `${dihitung.length} penugasan`],
      ['Total jam diterima', `${jumlahJamLembur(dihitung)} jam`],
    ],
    // Jumlah dan urutan kepala harus sama persis dengan isi tiap baris di bawah.
    kepala: [...(denganNama ? ['Petugas'] : []), 'Tanggal', 'Jam dikerjakan', 'Total', 'Status'],
    baris: [...daftar]
      .sort((a, b) => a.tanggalIso.localeCompare(b.tanggalIso))
      .map((l) => [
        ...(denganNama ? [`${l.nama} (${l.jabatan})`] : []),
        l.tanggal,
        l.rentangAktual ? `${l.rentangAktual} (rencana ${l.rentang})` : l.rentang,
        l.total,
        l.status,
      ]),
    kosong: 'Tidak ada penugasan lembur pada periode ini.',
  })
}

/**
 * Jam aktual hanya bisa dikoreksi untuk lembur yang diterima. Lembur yang
 * pernah ditandai dibayar ditolak backend, jadi tombolnya disembunyikan.
 */
export const bisaKoreksiJam = (l: Lembur) => diterima(l) && !l.dibayarPada

/** Pop-up koreksi jam yang benar-benar dikerjakan petugas. */
export function ModalJamAktual({
  lembur: l,
  onTutup,
  onSimpan,
}: {
  lembur: Lembur
  onTutup: () => void
  /** null keduanya = kembali ke jam rencana */
  onSimpan: (mulai: string | null, selesai: string | null) => Promise<string | null>
}) {
  const [rMulai, rSelesai] = jamRencana(l)
  const [mulai, setMulai] = useState(l.mulaiAktual ?? rMulai)
  const [selesai, setSelesai] = useState(l.selesaiAktual ?? rSelesai)
  const [galat, setGalat] = useState('')
  const [sibuk, setSibuk] = useState(false)

  const menit = menitLembur(mulai, selesai)
  const terlaluLama = menit > MAKS_JAM_LEMBUR * 60

  async function simpan(m: string | null, s: string | null) {
    setSibuk(true)
    const g = await onSimpan(m, s)
    setSibuk(false)
    if (g) setGalat(g)
    else onTutup()
  }

  return (
    <Modal
      judul="Koreksi jam lembur"
      sub={`${l.nama} · ${l.tanggal} · rencana ${l.rentang}`}
      onTutup={onTutup}
      aksi={
        <>
          {l.rentangAktual && (
            <Tombol varian="hantu" className="mr-auto" disabled={sibuk} onClick={() => simpan(null, null)}>
              Kembali ke rencana
            </Tombol>
          )}
          <Tombol varian="hantu" onClick={onTutup}>
            Batal
          </Tombol>
          <Tombol disabled={sibuk || terlaluLama || Number.isNaN(menit)} onClick={() => simpan(mulai, selesai)}>
            <Ikon.Centang size={15} /> Simpan
          </Tombol>
        </>
      }
    >
      <p className="m-0 mb-3.5 text-[12.5px] leading-relaxed text-teks-lembut">
        Isi jam yang benar-benar dikerjakan bila berbeda dari rencana. Total jam lembur ikut dihitung dari jam ini.
      </p>
      <GridForm>
        <Kolom label="Jam mulai" wajib>
          <Input type="time" value={mulai} onChange={(e) => setMulai(e.target.value)} />
        </Kolom>
        <Kolom label="Jam selesai" wajib>
          <Input type="time" value={selesai} onChange={(e) => setSelesai(e.target.value)} />
        </Kolom>
      </GridForm>
      <p className="num m-0 mt-3 text-[12.5px] text-teks-lembut">
        Total {lamaLembur(mulai, selesai)}
      </p>
      {(terlaluLama || galat) && (
        <div className="mt-2.5 flex items-start gap-2 rounded-xl border border-merah/30 bg-merah-lembut px-3 py-2 text-[11.5px] leading-relaxed text-merah-teks">
          <Ikon.Awas size={14} className="mt-px flex-none" />
          <span>{terlaluLama ? `Lembur paling lama ${MAKS_JAM_LEMBUR} jam.` : galat}</span>
        </div>
      )}
    </Modal>
  )
}
