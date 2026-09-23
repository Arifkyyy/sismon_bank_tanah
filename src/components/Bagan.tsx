import { useApi } from '@/lib/useApi'
import type { HariBagan, SebaranJabatan } from '@/types'

/** Batang bertumpuk: hijau = jumlah catatan, emas = jam lembur. */
export function BaganTujuhHari({ labelCatatan = 'Logbook masuk' }: { labelCatatan?: string }) {
  const { data: tujuhHari } = useApi<HariBagan[]>('/api/statistik/tujuh-hari', [])

  // Dua skala terpisah: kalau dipaksa satu skala, batang lembur jadi
  // terlalu tipis untuk dibaca karena angkanya jauh lebih kecil.
  // `|| 1` menjaga pembagian saat semua nilainya nol.
  const maksLog = Math.max(1, ...tujuhHari.map((d) => d.logbook))
  const maksLembur = Math.max(1, ...tujuhHari.map((d) => d.lembur))

  if (tujuhHari.length === 0) {
    return (
      <div className="grid h-[186px] place-items-center text-[12.5px] text-teks-samar">
        Belum ada data tujuh hari terakhir
      </div>
    )
  }

  return (
    <>
      <div className="flex h-[186px] items-end gap-3 px-0.5">
        {tujuhHari.map((d) => (
          <div key={d.hari} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
            <div className="flex h-full w-full max-w-[42px] flex-col justify-end gap-0.5">
              <div
                className="rounded-t-md bg-gradient-to-b from-hijau-terang to-hijau"
                style={{ height: `${(d.logbook / maksLog) * 62}%` }}
                title={`${d.logbook} ${labelCatatan.toLowerCase()}`}
              />
              <div
                className="rounded-b-md bg-emas"
                style={{ height: `${(d.lembur / maksLembur) * 26}%` }}
                title={`${d.lembur} jam lembur`}
              />
            </div>
            <span className="text-[11px] font-medium text-teks-samar">{d.hari}</span>
          </div>
        ))}
      </div>
      <div className="mt-3.5 flex gap-4 border-t border-garis pt-3 text-[11.5px] text-teks-lembut">
        <span className="flex items-center gap-1.5">
          <i className="h-2.5 w-2.5 rounded bg-hijau" />
          {labelCatatan}
        </span>
        <span className="flex items-center gap-1.5">
          <i className="h-2.5 w-2.5 rounded bg-emas" />
          Jam lembur
        </span>
      </div>
    </>
  )
}

/** Warna irisan donat per jabatan; backend hanya mengirim label dan nilai. */
const WARNA_IRISAN: Record<string, string> = {
  Security: '#10874C',
  'Customer Service': '#F2BE26',
  'Office Boy': '#DE7B2C',
  Messenger: '#3E7FA3',
}
const WARNA_CADANGAN = '#8AA0A8'

/** Donat sebaran jabatan. */
export function Donat() {
  const { data: sebaran } = useApi<SebaranJabatan[]>('/api/statistik/sebaran-jabatan', [])
  const data = sebaran.map((d) => ({ ...d, warna: WARNA_IRISAN[d.label] ?? WARNA_CADANGAN }))
  const total = data.reduce((a, b) => a + b.nilai, 0)

  if (total === 0) {
    return (
      <div className="grid h-[132px] place-items-center text-[12.5px] text-teks-samar">
        Belum ada petugas terdaftar
      </div>
    )
  }

  let jalan = 0
  const potongan = data
    .map((d) => {
      const mulai = (jalan / total) * 100
      jalan += d.nilai
      const selesai = (jalan / total) * 100
      return `${d.warna} ${mulai}% ${selesai}%`
    })
    .join(', ')

  return (
    <div className="flex items-center gap-6">
      <div
        className="relative h-[132px] w-[132px] flex-none rounded-full"
        style={{ background: `conic-gradient(${potongan})` }}
      >
        <div className="absolute inset-[17px] grid place-items-center rounded-full bg-white text-center">
          <div>
            <b className="num block text-2xl font-extrabold leading-none tracking-tight text-ink">{total}</b>
            <span className="text-[10.5px] text-teks-lembut">petugas</span>
          </div>
        </div>
      </div>
      <ul className="m-0 flex-1 list-none p-0">
        {data.map((d) => (
          <li
            key={d.label}
            className="flex items-center gap-2.5 border-b border-garis py-2 text-[12.5px] last:border-b-0"
          >
            <i className="h-2.5 w-2.5 rounded" style={{ background: d.warna }} />
            {d.label}
            <b className="num ml-auto font-bold text-ink">{d.nilai}</b>
          </li>
        ))}
      </ul>
    </div>
  )
}
