import { useEffect, useRef, useState } from 'react';
import { Modal } from '@/components/Modal';
import type { Rentang } from '@/components/RentangTanggal';
import { RentangTanggal } from '@/components/RentangTanggal';
import { cetakRekapLembur } from '@/components/LemburSelesai';
import { StatCard } from '@/components/StatCard';
import { Avatar, AreaTeks, InputRapi, Kolom, Pil, PilihRapi, Segmen, Tombol } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useLemburSaya } from '@/context/LemburContext';
import { query } from '@/lib/api';
import { Ikon } from '@/lib/ikon';
import { daftarBulan, formatRentang, formatTanggal, jumlahJamLembur, keIso } from '@/lib/tanggal';
import { useApi } from '@/lib/useApi';
import { cn } from '@/lib/util';
import type { Lembur } from '@/types';

const rupiah = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

const BULAN_PILIHAN = daftarBulan();

type Periode = 'Harian' | 'Bulanan' | 'Custom';

/** Uang lembur satu penugasan; penugasan yang ditolak tidak dibayar. */
function teksUpah(l: Lembur): string {
  if (l.status === 'Ditolak') return 'Tidak dihitung';
  return l.upah == null ? '–' : rupiah(l.upah);
}

/** Kartu satu penugasan lembur, dipakai juga di dashboard petugas. */
export function KartuLembur({ lembur, onTerima, onTolak }: { lembur: Lembur; onTerima?: (id: string) => void; onTolak?: (l: Lembur) => void }) {
  const menunggu = lembur.status === 'Menunggu';
  const ditolak = lembur.status === 'Ditolak';
  const bisaDijawab = menunggu && Boolean(onTerima && onTolak);
  // Sama dengan backend: penugasan yang tanggalnya lewat hanya bisa ditolak.
  const lewat = lembur.tanggalIso < keIso(new Date());
  // Akun pembuat bisa sudah dihapus; backend lalu mengirim null.
  const pembuat = lembur.dibuatOleh ?? 'Admin';

  return (
    <div className="overflow-hidden rounded-kartu border border-garis bg-white shadow-kartu">
      <div className={cn('h-1', menunggu ? 'bg-gradient-to-r from-emas to-tanah' : ditolak ? 'bg-garis-kuat' : 'bg-hijau')} />
      <div className="px-5 py-4.5">
        <div className="mb-4 flex items-center gap-3">
          <Avatar nama={pembuat} emas={lembur.pembuatPeran === 'superadmin'} foto={lembur.pembuatFoto} />
          <div className="min-w-0 flex-1">
            <b className="block text-[13.5px] font-semibold text-ink">{pembuat}</b>
            <span className="text-[11.5px] text-teks-samar">{[lembur.pembuatPeran === 'superadmin' ? 'Super Admin' : 'Admin', lembur.pembuatUnit].filter(Boolean).join(' · ')}</span>
          </div>
          <Pil status={lembur.status} />
        </div>

        <p className="m-0 mb-3.5 text-[13px] leading-relaxed text-teks-lembut">{lembur.keterangan}</p>

        <div className="grid grid-cols-1 gap-3 rounded-xl border border-garis bg-[#F7FAF8] p-3.5 sm:grid-cols-2">
          {[
            ['Tanggal', lembur.tanggal],
            // Bila admin mengoreksi jam aktual, total dan uang lembur dihitung dari jam itu.
            lembur.rentangAktual
              ? ['Jam dikerjakan', `${lembur.rentangAktual} (rencana ${lembur.rentang})`]
              : ['Rentang jam', lembur.rentang],
            ['Total lembur', lembur.total],
            ['Jabatan', lembur.jabatan],
            ['Tarif per jam', lembur.tarifPerJam == null ? '–' : rupiah(lembur.tarifPerJam)],
            [menunggu ? 'Perkiraan uang lembur' : 'Uang lembur', teksUpah(lembur)],
          ].map(([label, nilai]) => (
            <div key={label}>
              <span className="mb-0.5 block text-[11px] text-teks-samar">{label}</span>
              <b className="num text-[13px] font-semibold text-ink">{nilai}</b>
            </div>
          ))}
        </div>

        {ditolak && lembur.alasan && (
          <div className="mt-3.5 rounded-xl border border-tanah/30 bg-tanah-lembut px-3.5 py-2.5 text-[12.5px] leading-relaxed text-tanah-teks">
            <b className="font-semibold">Alasan penolakan Anda:</b> {lembur.alasan}
          </div>
        )}

        {bisaDijawab ? (
          <>
            {lewat && (
              <p className="m-0 mt-3.5 text-xs text-tanah-teks">
                Tanggal lembur ini sudah lewat, jadi tidak bisa diterima lagi. Tolak dan tulis alasannya untuk admin.
              </p>
            )}
            <div className="mt-3.5 flex gap-2.5">
              <Tombol varian="hantu" className="flex-1" onClick={() => onTolak?.(lembur)}>
                <Ikon.Silang size={15} /> Tolak
              </Tombol>
              {!lewat && (
                <Tombol className="flex-1" onClick={() => onTerima?.(lembur.id)}>
                  <Ikon.Centang size={15} /> Terima
                </Tombol>
              )}
            </div>
          </>
        ) : menunggu ? (
          <p className="m-0 mt-3.5 text-xs text-teks-samar">Jawab penugasan ini di halaman Lembur.</p>
        ) : (
          <p className="m-0 mt-3.5 text-xs text-teks-samar">
            Anda {ditolak ? 'menolak' : 'menerima'} penugasan ini
            {lembur.dijawabPada ? ` pada ${lembur.dijawabPada}` : ''}.
          </p>
        )}

        {!ditolak && !menunggu && (
          <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs text-teks-samar">
            {lembur.dibayarPada ? (
              <>
                <Pil status="Selesai">Sudah dibayar</Pil>
                <span className="num">{lembur.dibayarPada}</span>
              </>
            ) : (
              <Pil status="Menunggu">Belum dibayar</Pil>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function LemburUser() {
  // Hanya penugasan yang ditujukan kepada petugas yang sedang masuk.
  const { menunggu, riwayat, terima, tolak } = useLemburSaya();
  const { akun } = useAuth();
  const [ditolakkan, setDitolakkan] = useState<Lembur | null>(null);
  const [alasan, setAlasan] = useState('');
  const [galat, setGalat] = useState('');

  // Penyaring periode untuk riwayat dan angka uang lembur; bawaannya bulan ini.
  const [periode, setPeriode] = useState<Periode>('Bulanan');
  const [tanggal, setTanggal] = useState(() => keIso(new Date()));
  const [bulan, setBulan] = useState(BULAN_PILIHAN[0].kunci);
  const [rentang, setRentang] = useState<Rentang | null>(null);

  let dari: string | null = null;
  let sampai: string | null = null;
  let labelPeriode: string;
  if (periode === 'Harian') {
    dari = sampai = tanggal;
    const t = formatTanggal(tanggal);
    labelPeriode = `${t.hari}, ${t.tanggal}`;
  } else if (periode === 'Bulanan') {
    const [y, m] = bulan.split('-').map(Number);
    dari = `${bulan}-01`;
    sampai = keIso(new Date(y, m, 0)); // hari ke-0 bulan berikutnya = akhir bulan ini
    labelPeriode = BULAN_PILIHAN.find((b) => b.kunci === bulan)?.label ?? bulan;
  } else if (rentang) {
    dari = rentang.mulai;
    sampai = rentang.sampai;
    labelPeriode = formatRentang(rentang.mulai, rentang.sampai);
  } else {
    labelPeriode = 'Rentang tanggal belum dipilih';
  }

  const tersaring = useApi<Lembur[]>(dari && sampai ? `/api/lembur${query({ dari, sampai })}` : null, []);

  // Setelah menerima/menolak, daftar tersaring ikut diambil ulang.
  const jejak = riwayat.map((l) => `${l.id}:${l.status}`).join();
  const jejakAwal = useRef(jejak);
  const muatTersaring = tersaring.muat;
  useEffect(() => {
    if (jejak === jejakAwal.current) return;
    jejakAwal.current = jejak;
    void muatTersaring();
  }, [jejak, muatTersaring]);

  const riwayatPeriode = dari ? tersaring.data.filter((l) => l.status !== 'Menunggu') : [];
  const diterima = riwayatPeriode.filter((l) => l.status === 'Diterima' || l.status === 'Selesai');
  const totalJam = jumlahJamLembur(diterima);
  // Tiap penugasan membawa upahnya sendiri: tarif dikunci backend saat dikirim.
  const totalUpah = diterima.reduce((n, l) => n + (l.upah ?? 0), 0);
  const belumDibayar = diterima.reduce((n, l) => n + (l.dibayarPada ? 0 : (l.upah ?? 0)), 0);

  function bukaTolak(l: Lembur) {
    setDitolakkan(l);
    setAlasan('');
    setGalat('');
  }

  function kirimPenolakan() {
    // Admin memakai alasan ini untuk mencari pengganti, jadi tidak boleh kosong.
    if (alasan.trim().length < 10) {
      setGalat('Tulis alasan minimal 10 karakter agar admin paham situasinya.');
      return;
    }
    if (ditolakkan) tolak(ditolakkan.id, alasan.trim());
    setDitolakkan(null);
  }

  return (
    <>
      <div className="mb-4.5 flex flex-wrap items-center gap-2">
        <Segmen opsi={['Harian', 'Bulanan', 'Custom']} nilai={periode} onPilih={(v) => setPeriode(v as Periode)} />
        {periode === 'Harian' && (
          <>
            <InputRapi type="date" aria-label="Tanggal lembur" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
            <Tombol varian="hantu" kecil onClick={() => setTanggal(keIso(new Date(Date.now() - 86_400_000)))}>
              Kemarin
            </Tombol>
            <Tombol varian="hantu" kecil onClick={() => setTanggal(keIso(new Date()))}>
              Hari ini
            </Tombol>
          </>
        )}
        {periode === 'Bulanan' && (
          <PilihRapi aria-label="Bulan lembur" value={bulan} onChange={(e) => setBulan(e.target.value)} className="min-w-[180px]">
            {BULAN_PILIHAN.map((b) => (
              <option key={b.kunci} value={b.kunci}>
                {b.label}
              </option>
            ))}
          </PilihRapi>
        )}
        {periode === 'Custom' && <RentangTanggal nilai={rentang} onPilih={setRentang} className="w-[260px]" />}
        <Tombol
          varian="hantu"
          kecil
          className="ml-auto"
          disabled={tersaring.memuat || riwayatPeriode.length === 0}
          onClick={() =>
            cetakRekapLembur(riwayatPeriode, [`${akun?.nama ?? ''} · ${akun?.peran ?? ''}`, `Periode: ${labelPeriode}`], false)
          }
        >
          <Ikon.Unduh size={15} /> Unduh PDF
        </Tombol>
      </div>

      <div className="grid grid-cols-1 gap-4.5 sm:grid-cols-3">
        <StatCard gaya="pekat" nama="Menunggu jawaban Anda" angka={String(menunggu.length)} ikon={<Ikon.Jam size={17} />} ket={menunggu.length ? `Terdekat: ${[...menunggu].sort((a, b) => a.tanggalIso.localeCompare(b.tanggalIso))[0].tanggal}` : 'Semua penugasan sudah dijawab'} />
        <StatCard gaya="pekat" nama="Lembur diterima" angka={String(diterima.length)} ikon={<Ikon.Centang size={17} />} ket={`Total ${totalJam} jam · ${labelPeriode}`} />
        <StatCard gaya="pekat" nama="Uang lembur" angka={rupiah(totalUpah)} ikon={<Ikon.Rekap size={17} />} ket={`${!diterima.length ? 'Belum ada lembur diterima' : belumDibayar ? `${rupiah(belumDibayar)} belum dibayar` : 'Semua sudah dibayar'} · ${labelPeriode}`} />
      </div>

      <div className="mb-3.5 mt-6 flex items-center gap-3">
        <h3 className="m-0 text-[15px] font-bold text-ink">Perlu Anda jawab</h3>
        <Pil status="Menunggu">{menunggu.length} penugasan</Pil>
      </div>
      {menunggu.length ? (
        <div className="grid grid-cols-1 gap-4.5 xl:grid-cols-2">
          {menunggu.map((l) => (
            <KartuLembur key={l.id} lembur={l} onTerima={terima} onTolak={bukaTolak} />
          ))}
        </div>
      ) : (
        <div className="rounded-kartu border border-dashed border-garis-kuat bg-white px-5 py-8 text-center">
          <span className="mx-auto mb-2.5 grid h-11 w-11 place-items-center rounded-full bg-hijau-lembut text-hijau-tua">
            <Ikon.Centang size={20} />
          </span>
          <b className="block text-[13.5px] font-semibold text-ink">Tidak ada penugasan menunggu</b>
          <span className="mt-0.5 block text-[12px] text-teks-lembut">Jawaban Anda langsung terkirim ke admin dan tercatat di riwayat di bawah.</span>
        </div>
      )}

      <h3 className="mb-3.5 mt-6.5 text-[15px] font-bold text-ink">
        Riwayat penugasan <span className="text-[12.5px] font-normal text-teks-lembut">· {labelPeriode}</span>
      </h3>
      {tersaring.galat ? (
        <div className="rounded-kartu border border-merah/30 bg-merah-lembut px-5 py-4 text-[12.5px] text-merah-teks">{tersaring.galat}</div>
      ) : riwayatPeriode.length ? (
        /* Riwayat terus bertambah tiap penugasan, jadi digulir di tempat */
        <div className="scrollbar-lembut -mx-1 grid grid-cols-1 gap-4.5 px-1 py-1 lg:max-h-[460px] lg:overflow-y-auto lg:overscroll-contain xl:grid-cols-2">
          {riwayatPeriode.map((l) => (
            <KartuLembur key={l.id} lembur={l} />
          ))}
        </div>
      ) : (
        <div className="rounded-kartu border border-dashed border-garis-kuat bg-white px-5 py-8 text-center">
          <span className="mx-auto mb-2.5 grid h-11 w-11 place-items-center rounded-full bg-[#EEF2F0] text-teks-lembut">
            <Ikon.Jam size={20} />
          </span>
          <b className="block text-[13.5px] font-semibold text-ink">
            {riwayat.length ? 'Tidak ada penugasan pada periode ini' : 'Belum ada penugasan yang dijawab'}
          </b>
          <span className="mt-0.5 block text-[12px] text-teks-lembut">
            {riwayat.length ? 'Pilih tanggal atau bulan lain untuk melihat lembur sebelumnya.' : 'Penugasan yang Anda terima atau tolak akan tercatat di sini.'}
          </span>
        </div>
      )}

      {ditolakkan && (
        <Modal
          judul="Tolak penugasan lembur"
          sub={`${ditolakkan.tanggal} · ${ditolakkan.rentang} · ${ditolakkan.total}`}
          onTutup={() => setDitolakkan(null)}
          aksi={
            <>
              <Tombol varian="hantu" onClick={() => setDitolakkan(null)}>
                Batal
              </Tombol>
              <Tombol onClick={kirimPenolakan}>
                <Ikon.Kirim size={15} /> Kirim penolakan
              </Tombol>
            </>
          }
        >
          <p className="m-0 mb-3.5 text-[12.5px] leading-relaxed text-teks-lembut">{ditolakkan.keterangan}</p>
          <Kolom label="Alasan menolak" wajib bantu="Alasan ini terlihat oleh admin supaya bisa segera mencari pengganti.">
            <AreaTeks
              autoFocus
              value={alasan}
              onChange={(e) => {
                setAlasan(e.target.value);
                if (galat) setGalat('');
              }}
              placeholder="Contoh: sedang sakit, atau ada tugas lain di jam yang sama."
              className="min-h-[110px]"
            />
          </Kolom>
          {galat && (
            <div className="mt-2.5 flex items-start gap-2 rounded-xl border border-merah/30 bg-merah-lembut px-3 py-2 text-[11.5px] leading-relaxed text-merah-teks">
              <Ikon.Awas size={14} className="mt-px flex-none" />
              <span>{galat}</span>
            </div>
          )}
        </Modal>
      )}
    </>
  );
}
