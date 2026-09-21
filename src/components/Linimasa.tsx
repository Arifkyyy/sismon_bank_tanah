import { cn } from '@/lib/util'

export interface Pos {
  jam: string
  judul: string
  isi: string
  nada?: 'hijau' | 'emas' | 'tanah'
}

const TITIK = {
  hijau: 'bg-hijau ring-hijau-lembut',
  emas: 'bg-emas ring-emas-lembut',
  tanah: 'bg-tanah ring-tanah-lembut',
}

export function Linimasa({ pos }: { pos: Pos[] }) {
  return (
    <div className="relative pl-6.5">
      <span className="absolute bottom-1.5 left-[7px] top-1.5 w-[1.5px] bg-garis-kuat" />
      {pos.map((p) => (
        <div key={p.judul} className="relative pb-5 last:pb-0">
          <span
            className={cn(
              'absolute -left-[23px] top-1.5 h-2.5 w-2.5 rounded-full ring-[3px]',
              TITIK[p.nada ?? 'hijau'],
            )}
          />
          <span className="num text-[11.5px] font-semibold text-teks-samar">{p.jam}</span>
          <b className="mb-0.5 mt-px block text-[13.5px] font-semibold text-ink">{p.judul}</b>
          <p className="m-0 text-[12.5px] text-teks-lembut">{p.isi}</p>
        </div>
      ))}
    </div>
  )
}
