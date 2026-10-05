/** Penanda jenis catatan, sama di Catatan Harian (petugas) dan Laporan Petugas (admin). */
export function TagAktivitas() {
  return (
    <span className="inline-flex items-center rounded-[7px] border border-[#CFE3D6] bg-[#EDF6F0] px-2 py-0.5 text-[11.5px] font-semibold text-hijau-tua">
      Aktivitas
    </span>
  )
}

export function TagKendala() {
  return (
    <span className="inline-flex items-center gap-1 rounded-[7px] border border-[#F0DCAE] bg-[#FDF6E4] px-2 py-0.5 text-[11.5px] font-semibold text-tanah-teks">
      ⚠️ Kendala
    </span>
  )
}
