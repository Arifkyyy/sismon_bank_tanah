"""
Jadwal shift petugas.

- Jenis shift disusun admin per jabatan. 'Libur' disediakan sistem dan berlaku
  untuk semua jabatan. Shift yang sudah dipakai hanya bisa dinonaktifkan.
- Jadwal: satu kotak = satu petugas pada satu tanggal. Tanggal shift = tanggal
  shift dimulai (Malam 6 Okt 23.00 – 7 Okt 07.00 tercatat 6 Okt).
- Tukar shift: petugas mengajukan ke rekan satu jabatan → rekan setuju/tolak →
  admin setujui/tolak. Bila disetujui, isi kotak keduanya ditukar pada tanggal
  pemohon dan tanggal rekan. Admin yang mengubah kotak yang sedang diajukan
  tukar otomatis membatalkan permintaan itu.
"""
from calendar import monthrange
from datetime import date, timedelta

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app import format as f
from app import push
from app.audit import catat
from app.database import ambil_db
from app.deps import PENGAWAS, butuh_peran
from app.foto_util import url_foto_profil
from app.models import JABATAN, TUKAR_BERJALAN, JadwalShift, Shift, ShiftJabatan, TukarShift, User
from app.schemas import (
    AjukanTukar, AktifShift, AturKotak, HariRekan, HasilAturKotak, HasilMassal, IsiMassal, Jabatan, JadwalPeriode,
    JadwalSaya, JawabTukar, KotakJadwal, PetugasJadwal, PihakTukar, RekanShift, SalinPeriode, ShiftKeluar,
    ShiftMasuk, StatusTukar, TukarKeluar,
)

router = APIRouter(prefix="/api/shift", tags=["Jadwal shift"])
pengawas = butuh_peran(*PENGAWAS)
petugas_saja = butuh_peran("user")

# Batas rentang satu permintaan jadwal (cukup untuk tampilan satu bulan + sisa minggu).
MAKS_HARI = 62

Sel = tuple[int, date]
_MUAT_SHIFT = selectinload(Shift.daftar_jabatan)
_MUAT_KOTAK = selectinload(JadwalShift.shift).selectinload(Shift.daftar_jabatan)
_MUAT_TUKAR = (
    selectinload(TukarShift.pemohon),
    selectinload(TukarShift.rekan),
    selectinload(TukarShift.shift_pemohon).selectinload(Shift.daftar_jabatan),
    selectinload(TukarShift.shift_rekan).selectinload(Shift.daftar_jabatan),
)


# ------------------------------------------------------------------ bantuan

def _rentang(dari: date, sampai: date) -> list[date]:
    if sampai < dari:
        raise HTTPException(422, "Tanggal akhir tidak boleh sebelum tanggal awal.")
    n = (sampai - dari).days + 1
    if n > MAKS_HARI:
        raise HTTPException(422, f"Rentang tanggal paling lama {MAKS_HARI} hari.")
    return [dari + timedelta(days=i) for i in range(n)]


def _keluar_shift(s: Shift, dipakai: bool = False) -> ShiftKeluar:
    ada_jam = s.jam_mulai is not None and s.jam_selesai is not None
    return ShiftKeluar(
        id=s.id,
        nama=s.nama,
        kode=s.kode,
        mulai=s.jam_mulai.strftime("%H:%M") if s.jam_mulai is not None else None,
        selesai=s.jam_selesai.strftime("%H:%M") if s.jam_selesai is not None else None,
        rentang=f"{f.jam_teks(s.jam_mulai)} – {f.jam_teks(s.jam_selesai)}" if ada_jam else None,
        lintas_hari=ada_jam and s.jam_selesai < s.jam_mulai,
        dua_puluh_empat_jam=ada_jam and s.jam_selesai == s.jam_mulai,
        jabatan=s.jabatan,
        warna=s.warna,
        aktif=s.aktif,
        sistem=s.sistem,
        dipakai=dipakai,
    )


def _ambil_shift(db: Session, shift_id: int) -> Shift:
    s = db.get(Shift, shift_id, options=(_MUAT_SHIFT,))
    if not s:
        raise HTTPException(404, "Shift tidak ditemukan.")
    return s


def _petugas(db: Session, petugas_id: int) -> User:
    p = db.get(User, petugas_id)
    if not p or p.peran != "user":
        raise HTTPException(422, "Petugas tidak ditemukan.")
    return p


def _urut_petugas(p: User) -> tuple[int, str]:
    """Urutan jabatan mengikuti JABATAN (Security, OB, CS, Messenger), lalu nama."""
    return (JABATAN.index(p.jabatan) if p.jabatan in JABATAN else len(JABATAN), p.nama.lower())


def _kotak_ada(db: Session, user_ids: set[int], dari: date, sampai: date) -> dict[Sel, JadwalShift]:
    if not user_ids:
        return {}
    baris = db.scalars(
        select(JadwalShift)
        .options(_MUAT_KOTAK)
        .where(JadwalShift.user_id.in_(user_ids), JadwalShift.tanggal.between(dari, sampai))
    )
    return {(j.user_id, j.tanggal): j for j in baris}


def _tukar_berjalan(db: Session, user_ids: set[int], tanggal: set[date] | None = None,
                    dari: date | None = None, sampai: date | None = None) -> list[TukarShift]:
    """Permintaan yang masih berjalan dan melibatkan petugas/tanggal ini."""
    if not user_ids:
        return []
    q = select(TukarShift).where(
        TukarShift.status.in_(TUKAR_BERJALAN),
        or_(TukarShift.pemohon_id.in_(user_ids), TukarShift.rekan_id.in_(user_ids)),
    )
    if tanggal is not None:
        q = q.where(or_(TukarShift.tanggal_pemohon.in_(tanggal), TukarShift.tanggal_rekan.in_(tanggal)))
    if dari is not None and sampai is not None:
        q = q.where(
            or_(TukarShift.tanggal_pemohon.between(dari, sampai), TukarShift.tanggal_rekan.between(dari, sampai))
        )
    return list(db.scalars(q))


def _sel_diajukan(daftar: list[TukarShift]) -> set[Sel]:
    return {s for t in daftar for s in t.sel}


def _batalkan_terdampak(db: Session, sel: set[Sel], admin: User, tugas: BackgroundTasks) -> int:
    """Membatalkan permintaan tukar yang kotaknya diubah admin. Mengembalikan jumlahnya."""
    if not sel:
        return 0
    jumlah = 0
    for t in _tukar_berjalan(db, {u for u, _ in sel}, tanggal={d for _, d in sel}):
        if not (t.sel & sel):
            continue
        t.status = "Dibatalkan"
        t.catatan_batal = "Jadwal diubah admin"
        t.diperbarui_pada = f.sekarang()
        catat(db, admin, "batal_tukar_shift", f"Tukar shift #{t.id} dibatalkan karena jadwalnya diubah")
        tugas.add_task(
            push.tukar_selesai, [t.pemohon_id, t.rekan_id],
            "Permintaan tukar shift dibatalkan karena jadwal diubah admin", t.id,
        )
        jumlah += 1
    return jumlah


def _tulis_kotak(
    db: Session, j: JadwalShift | None, user_id: int, tanggal: date, shift_id: int | None, oleh: User,
    dari_tukar: int | None = None,
) -> JadwalShift | None:
    """shift_id None = kotak dikosongkan (barisnya dihapus)."""
    if shift_id is None:
        if j is not None:
            db.delete(j)
        return None
    if j is None:
        j = JadwalShift(user_id=user_id, tanggal=tanggal)
        db.add(j)
    j.shift_id = shift_id
    # Diubah admin = bukan lagi hasil tukar, jadi tanda ⇄ hilang.
    j.dari_tukar_id = dari_tukar
    j.diatur_oleh = oleh.id
    j.diubah_pada = f.sekarang()
    return j


def _keluar_kotak(j: JadwalShift, diajukan: set[Sel]) -> KotakJadwal:
    return KotakJadwal(
        petugas_id=j.user_id,
        tanggal=j.tanggal.isoformat(),
        shift_id=j.shift_id,
        tukar=j.dari_tukar_id is not None,
        diajukan_tukar=(j.user_id, j.tanggal) in diajukan,
    )


def _shift_dipakai(db: Session) -> set[int]:
    return (
        set(db.scalars(select(JadwalShift.shift_id).distinct()))
        | set(db.scalars(select(TukarShift.shift_pemohon_id).distinct()))
        | set(db.scalars(select(TukarShift.shift_rekan_id).distinct()))
    )


# ---------------------------------------------------------------- jenis shift

def _periksa_kode(db: Session, kode: str, jabatan: list[str], kecuali_id: int | None = None) -> None:
    """Kode tampil di kotak jadwal, jadwal tiap jabatan tidak boleh punya dua shift aktif berkode sama."""
    lain = db.scalars(
        select(Shift).options(_MUAT_SHIFT).where(Shift.aktif.is_(True), Shift.id != (kecuali_id or 0))
    )
    for s in lain:
        if s.kode.upper() != kode:
            continue
        if s.sistem:
            raise HTTPException(422, f"Kode {kode} sudah dipakai shift {s.nama}.")
        sama = sorted(set(s.jabatan) & set(jabatan))
        if sama:
            raise HTTPException(422, f"Kode {kode} sudah dipakai shift {s.nama} untuk {', '.join(sama)}.")


@router.get("/jenis", response_model=list[ShiftKeluar])
def daftar_jenis(
    jabatan: Jabatan | None = None,
    semua: bool = Query(False, description="true = ikut menampilkan shift nonaktif"),
    db: Session = Depends(ambil_db),
    _: User = Depends(pengawas),
):
    q = select(Shift).options(_MUAT_SHIFT).order_by(Shift.sistem.desc(), Shift.jam_mulai, Shift.nama)
    if jabatan:
        q = q.where(or_(Shift.sistem.is_(True), Shift.daftar_jabatan.any(ShiftJabatan.jabatan == jabatan)))
    if not semua:
        q = q.where(Shift.aktif.is_(True))
    dipakai = _shift_dipakai(db)
    return [_keluar_shift(s, s.id in dipakai) for s in db.scalars(q)]


@router.post("/jenis", response_model=ShiftKeluar, status_code=201)
def tambah_jenis(isi: ShiftMasuk, db: Session = Depends(ambil_db), admin: User = Depends(pengawas)):
    kode = isi.kode.upper()
    jabatan = sorted(set(isi.jabatan))
    if isi.aktif:
        _periksa_kode(db, kode, jabatan)
    s = Shift(
        nama=isi.nama.strip(), kode=kode, jam_mulai=isi.mulai, jam_selesai=isi.selesai, warna=isi.warna,
        aktif=isi.aktif, sistem=False, dibuat_oleh=admin.id,
        daftar_jabatan=[ShiftJabatan(jabatan=j) for j in jabatan],
    )
    db.add(s)
    catat(
        db, admin, "tambah_shift",
        f"{s.nama} ({kode}) {f.jam_teks(isi.mulai)} – {f.jam_teks(isi.selesai)} untuk {', '.join(jabatan)}",
    )
    db.commit()
    return _keluar_shift(_ambil_shift(db, s.id))


@router.put("/jenis/{shift_id}", response_model=ShiftKeluar)
def ubah_jenis(shift_id: int, isi: ShiftMasuk, db: Session = Depends(ambil_db), admin: User = Depends(pengawas)):
    s = _ambil_shift(db, shift_id)
    if s.sistem:
        raise HTTPException(409, f"Shift {s.nama} disediakan sistem dan tidak bisa diubah.")
    kode = isi.kode.upper()
    jabatan = sorted(set(isi.jabatan))
    if isi.aktif:
        _periksa_kode(db, kode, jabatan, kecuali_id=s.id)

    # Jabatan yang dicabut tidak boleh masih terjadwal memakai shift ini mulai hari ini.
    dicabut = set(s.jabatan) - set(jabatan)
    if dicabut:
        masih = db.scalar(
            select(User.jabatan)
            .join(JadwalShift, JadwalShift.user_id == User.id)
            .where(JadwalShift.shift_id == s.id, JadwalShift.tanggal >= f.hari_ini(), User.jabatan.in_(dicabut))
            .limit(1)
        )
        if masih:
            raise HTTPException(
                409, f"Shift {s.nama} masih terjadwal untuk petugas {masih} mulai hari ini. Ubah jadwal mereka dulu."
            )

    s.nama = isi.nama.strip()
    s.kode = kode
    s.jam_mulai = isi.mulai
    s.jam_selesai = isi.selesai
    s.warna = isi.warna
    s.aktif = isi.aktif
    # Ditambah/dibuang satu per satu: mengganti seluruh daftar membuat baris berkunci sama bentrok.
    for j in list(s.daftar_jabatan):
        if j.jabatan not in jabatan:
            s.daftar_jabatan.remove(j)
    for j in jabatan:
        if j not in s.jabatan:
            s.daftar_jabatan.append(ShiftJabatan(jabatan=j))
    catat(db, admin, "ubah_shift", f"Shift #{s.id}: {s.nama} ({kode}) untuk {', '.join(jabatan)}")
    db.commit()
    return _keluar_shift(_ambil_shift(db, s.id), s.id in _shift_dipakai(db))


@router.post("/jenis/{shift_id}/aktif", response_model=ShiftKeluar)
def atur_aktif(shift_id: int, isi: AktifShift, db: Session = Depends(ambil_db), admin: User = Depends(pengawas)):
    """Shift nonaktif tidak muncul di pilihan, tapi jadwal lama yang memakainya tetap tampil."""
    s = _ambil_shift(db, shift_id)
    if s.sistem:
        raise HTTPException(409, f"Shift {s.nama} disediakan sistem dan selalu aktif.")
    if isi.aktif and not s.aktif:
        _periksa_kode(db, s.kode, s.jabatan, kecuali_id=s.id)
    s.aktif = isi.aktif
    catat(db, admin, "aktifkan_shift" if isi.aktif else "nonaktifkan_shift", f"Shift #{s.id}: {s.nama}")
    db.commit()
    return _keluar_shift(s, s.id in _shift_dipakai(db))


@router.delete("/jenis/{shift_id}", status_code=204)
def hapus_jenis(shift_id: int, db: Session = Depends(ambil_db), admin: User = Depends(pengawas)):
    s = _ambil_shift(db, shift_id)
    if s.sistem:
        raise HTTPException(409, f"Shift {s.nama} disediakan sistem dan tidak bisa dihapus.")
    if s.id in _shift_dipakai(db):
        raise HTTPException(409, f"Shift {s.nama} sudah dipakai di jadwal, jadi tidak bisa dihapus. Nonaktifkan saja.")
    db.delete(s)
    catat(db, admin, "hapus_shift", f"Shift #{s.id}: {s.nama}")
    db.commit()


# ---------------------------------------------------------------- jadwal (admin)

@router.get("/jadwal", response_model=JadwalPeriode)
def jadwal(
    dari: date,
    sampai: date,
    jabatan: Jabatan | None = None,
    cari: str = Query("", max_length=120),
    db: Session = Depends(ambil_db),
    _: User = Depends(pengawas),
):
    """Petugas aktif/cuti beserta isi kotaknya dalam rentang tanggal. Petugas nonaktif tidak ikut."""
    _rentang(dari, sampai)
    q = select(User).where(User.peran == "user", User.status != "Nonaktif")
    if jabatan:
        q = q.where(User.jabatan == jabatan)
    if cari.strip():
        q = q.where(User.nama.ilike(f"%{cari.strip()}%"))
    petugas = sorted(db.scalars(q), key=_urut_petugas)
    ids = {p.id for p in petugas}
    diajukan = _sel_diajukan(_tukar_berjalan(db, ids, dari=dari, sampai=sampai))
    kotak = _kotak_ada(db, ids, dari, sampai)
    return JadwalPeriode(
        dari=dari.isoformat(),
        sampai=sampai.isoformat(),
        petugas=[
            PetugasJadwal(
                id=p.id, nama=p.nama, jabatan=p.jabatan, status=p.status, foto_profil=url_foto_profil(p.foto_profil)
            )
            for p in petugas
        ],
        kotak=[_keluar_kotak(j, diajukan) for j in sorted(kotak.values(), key=lambda j: (j.user_id, j.tanggal))],
    )


@router.put("/jadwal", response_model=HasilAturKotak)
def atur_kotak(
    isi: AturKotak, tugas: BackgroundTasks, db: Session = Depends(ambil_db), admin: User = Depends(pengawas)
):
    """Mengisi, mengganti, atau mengosongkan (shiftId null) satu kotak."""
    p = _petugas(db, isi.petugas_id)
    if p.status == "Nonaktif":
        raise HTTPException(422, f"Akun {p.nama} nonaktif, jadwalnya tidak bisa diubah.")
    j = _kotak_ada(db, {p.id}, isi.tanggal, isi.tanggal).get((p.id, isi.tanggal))
    lama = j.shift if j else None
    if (lama.id if lama else None) == isi.shift_id:
        diajukan = _sel_diajukan(_tukar_berjalan(db, {p.id}, tanggal={isi.tanggal}))
        return HasilAturKotak(kotak=_keluar_kotak(j, diajukan) if j else None)

    baru = None
    if isi.shift_id is not None:
        baru = _ambil_shift(db, isi.shift_id)
        if not baru.aktif:
            raise HTTPException(422, f"Shift {baru.nama} sudah nonaktif.")
        if not baru.cocok(p.jabatan):
            raise HTTPException(422, f"Shift {baru.nama} tidak berlaku untuk jabatan {p.jabatan}.")

    dibatalkan = _batalkan_terdampak(db, {(p.id, isi.tanggal)}, admin, tugas)
    j = _tulis_kotak(db, j, p.id, isi.tanggal, baru.id if baru else None, admin)
    catat(
        db, admin, "atur_jadwal",
        f"{p.nama}, {f.tanggal_teks(isi.tanggal)}: {lama.nama if lama else 'kosong'} → {baru.nama if baru else 'kosong'}",
    )
    db.commit()
    return HasilAturKotak(kotak=_keluar_kotak(j, set()) if j else None, tukar_dibatalkan=dibatalkan)


@router.post("/jadwal/massal", response_model=HasilMassal)
def isi_massal(
    isi: IsiMassal, tugas: BackgroundTasks, db: Session = Depends(ambil_db), admin: User = Depends(pengawas)
):
    """Satu shift untuk banyak petugas × rentang tanggal."""
    hari = _rentang(isi.dari, isi.sampai)
    s = _ambil_shift(db, isi.shift_id)
    if not s.aktif:
        raise HTTPException(422, f"Shift {s.nama} sudah nonaktif.")
    ids = set(isi.petugas_ids)
    petugas = [p for p in db.scalars(select(User).where(User.id.in_(ids))) if p.peran == "user"]
    if len(petugas) != len(ids):
        raise HTTPException(422, "Ada petugas yang tidak ditemukan.")
    nonaktif = [p.nama for p in petugas if p.status == "Nonaktif"]
    if nonaktif:
        raise HTTPException(422, f"Akun nonaktif tidak bisa dijadwalkan: {', '.join(nonaktif)}.")
    salah = [f"{p.nama} ({p.jabatan})" for p in petugas if not s.cocok(p.jabatan)]
    if salah:
        raise HTTPException(422, f"Shift {s.nama} tidak berlaku untuk {', '.join(salah)}.")

    ada = _kotak_ada(db, ids, isi.dari, isi.sampai)
    rencana = [
        (p, d) for p in petugas for d in hari
        if (p.id, d) not in ada or ada[(p.id, d)].shift_id != s.id
    ]
    timpa = sum(1 for p, d in rencana if (p.id, d) in ada)
    if timpa and not isi.timpa:
        raise HTTPException(409, f"{timpa} kotak sudah terisi shift lain. Timpa dengan shift {s.nama}?")

    dibatalkan = _batalkan_terdampak(db, {(p.id, d) for p, d in rencana}, admin, tugas)
    for p, d in rencana:
        _tulis_kotak(db, ada.get((p.id, d)), p.id, d, s.id, admin)
    catat(
        db, admin, "isi_massal_jadwal",
        f"{s.nama} untuk {len(petugas)} petugas, {f.tanggal_teks(isi.dari)} – {f.tanggal_teks(isi.sampai)} "
        f"({len(rencana)} kotak)",
    )
    db.commit()
    return HasilMassal(diisi=len(rencana), tukar_dibatalkan=dibatalkan)


@router.post("/jadwal/salin", response_model=HasilMassal)
def salin_periode(
    isi: SalinPeriode, tugas: BackgroundTasks, db: Session = Depends(ambil_db), admin: User = Depends(pengawas)
):
    """
    Minggu: isi dari 7 hari sebelumnya. Bulan: isi dari tanggal yang sama di
    bulan sebelumnya; tanggal yang tidak ada di bulan itu (mis. 31) dilewati.
    Kotak sumber yang kosong tidak mengosongkan kotak tujuan.
    """
    hari = _rentang(isi.dari, isi.sampai)
    if isi.mode == "minggu":
        if len(hari) != 7:
            raise HTTPException(422, "Periode minggu harus 7 hari.")
        sumber_dari, sumber_sampai = isi.dari - timedelta(days=7), isi.sampai - timedelta(days=7)

        def sumber(d: date) -> date | None:
            return d - timedelta(days=7)
    else:
        akhir = monthrange(isi.dari.year, isi.dari.month)[1]
        if isi.dari.day != 1 or isi.sampai != isi.dari.replace(day=akhir):
            raise HTTPException(422, "Periode bulan harus dari tanggal 1 sampai akhir bulan.")
        lalu = isi.dari - timedelta(days=1)
        sumber_dari, sumber_sampai = lalu.replace(day=1), lalu

        def sumber(d: date) -> date | None:
            return lalu.replace(day=d.day) if d.day <= lalu.day else None

    q = select(User).where(User.peran == "user", User.status != "Nonaktif")
    if isi.jabatan:
        q = q.where(User.jabatan == isi.jabatan)
    petugas = list(db.scalars(q))
    ids = {p.id for p in petugas}
    asal = _kotak_ada(db, ids, sumber_dari, sumber_sampai)
    if not asal:
        raise HTTPException(422, "Periode sebelumnya belum punya jadwal untuk disalin.")
    ada = _kotak_ada(db, ids, isi.dari, isi.sampai)

    rencana: list[tuple[User, date, int]] = []
    dilewati = 0
    for p in petugas:
        for d in hari:
            sd = sumber(d)
            src = asal.get((p.id, sd)) if sd else None
            if src is None:
                continue
            if not src.shift.aktif or not src.shift.cocok(p.jabatan):
                dilewati += 1
                continue
            cur = ada.get((p.id, d))
            if cur is None or cur.shift_id != src.shift_id:
                rencana.append((p, d, src.shift_id))
    timpa = sum(1 for p, d, _ in rencana if (p.id, d) in ada)
    if timpa and not isi.timpa:
        raise HTTPException(
            409, f"{timpa} kotak di periode ini sudah terisi shift lain. Timpa dengan jadwal periode sebelumnya?"
        )

    dibatalkan = _batalkan_terdampak(db, {(p.id, d) for p, d, _ in rencana}, admin, tugas)
    for p, d, shift_id in rencana:
        _tulis_kotak(db, ada.get((p.id, d)), p.id, d, shift_id, admin)
    catat(
        db, admin, "salin_jadwal",
        f"{f.tanggal_teks(sumber_dari)} – {f.tanggal_teks(sumber_sampai)} → "
        f"{f.tanggal_teks(isi.dari)} – {f.tanggal_teks(isi.sampai)}"
        f"{f' ({isi.jabatan})' if isi.jabatan else ''}: {len(rencana)} kotak",
    )
    db.commit()
    return HasilMassal(diisi=len(rencana), dilewati=dilewati, tukar_dibatalkan=dibatalkan)


# ---------------------------------------------------------------- jadwal (petugas)

def _hari_jadwal(db: Session, user_id: int, dari: date, sampai: date) -> list[JadwalSaya]:
    hari = _rentang(dari, sampai)
    kotak = {
        j.tanggal: j
        for j in db.scalars(
            select(JadwalShift)
            .options(_MUAT_KOTAK, selectinload(JadwalShift.pengatur))
            .where(JadwalShift.user_id == user_id, JadwalShift.tanggal.between(dari, sampai))
        )
    }
    diajukan = _sel_diajukan(_tukar_berjalan(db, {user_id}, dari=dari, sampai=sampai))
    hasil = []
    for d in hari:
        j = kotak.get(d)
        hasil.append(
            JadwalSaya(
                tanggal=d.isoformat(),
                tanggal_teks=f.tanggal_teks(d),
                hari=f.nama_hari(d),
                shift=_keluar_shift(j.shift) if j else None,
                tukar=bool(j and j.dari_tukar_id),
                diajukan_tukar=(user_id, d) in diajukan,
                diubah_pada=f.cap_waktu(j.diubah_pada) if j else None,
                diatur_oleh=j.pengatur.nama if j and j.pengatur else None,
            )
        )
    return hasil


@router.get("/saya", response_model=list[JadwalSaya])
def jadwal_saya(
    dari: date | None = None,
    sampai: date | None = None,
    db: Session = Depends(ambil_db),
    user: User = Depends(petugas_saja),
):
    """Satu baris per hari, termasuk hari yang belum dijadwalkan. Bawaan: hari ini + 6 hari."""
    dari = dari or f.hari_ini()
    sampai = sampai or dari + timedelta(days=6)
    return _hari_jadwal(db, user.id, dari, sampai)


def _rekan(db: Session, user: User, rekan_id: int) -> User:
    r = db.get(User, rekan_id)
    if not r or r.peran != "user" or r.id == user.id:
        raise HTTPException(422, "Rekan tidak ditemukan.")
    if r.jabatan != user.jabatan:
        raise HTTPException(422, f"Tukar shift hanya bisa dengan rekan satu jabatan ({user.jabatan}).")
    if r.status == "Nonaktif":
        raise HTTPException(422, f"Akun {r.nama} nonaktif.")
    return r


@router.get("/rekan", response_model=list[RekanShift])
def daftar_rekan(tanggal: date, db: Session = Depends(ambil_db), user: User = Depends(petugas_saja)):
    """Rekan satu jabatan beserta shift mereka pada tanggal itu."""
    rekan = list(
        db.scalars(
            select(User)
            .where(
                User.peran == "user", User.jabatan == user.jabatan, User.id != user.id, User.status != "Nonaktif"
            )
            .order_by(User.nama)
        )
    )
    ids = {r.id for r in rekan}
    kotak = _kotak_ada(db, ids, tanggal, tanggal)
    diajukan = _sel_diajukan(_tukar_berjalan(db, ids, tanggal={tanggal}))
    return [
        RekanShift(
            id=r.id,
            nama=r.nama,
            status=r.status,
            foto_profil=url_foto_profil(r.foto_profil),
            shift=_keluar_shift(kotak[(r.id, tanggal)].shift) if (r.id, tanggal) in kotak else None,
            diajukan_tukar=(r.id, tanggal) in diajukan,
        )
        for r in rekan
    ]


@router.get("/rekan/{rekan_id}/jadwal", response_model=list[HariRekan])
def jadwal_rekan(
    rekan_id: int,
    dari: date | None = None,
    sampai: date | None = None,
    db: Session = Depends(ambil_db),
    user: User = Depends(petugas_saja),
):
    """Jadwal seorang rekan satu jabatan, untuk memilih shift yang ditukar. Bawaan: hari ini + 13 hari."""
    r = _rekan(db, user, rekan_id)
    dari = max(dari or f.hari_ini(), f.hari_ini())
    sampai = sampai or dari + timedelta(days=13)
    return [
        HariRekan(
            tanggal=h.tanggal, tanggal_teks=h.tanggal_teks, hari=h.hari, shift=h.shift,
            diajukan_tukar=h.diajukan_tukar,
        )
        for h in _hari_jadwal(db, r.id, dari, sampai)
    ]


# ---------------------------------------------------------------- tukar shift

def _ambil_tukar(db: Session, tukar_id: int) -> TukarShift:
    t = db.get(TukarShift, tukar_id, options=(*_MUAT_TUKAR, selectinload(TukarShift.pemutus)))
    if not t:
        raise HTTPException(404, "Permintaan tukar shift tidak ditemukan.")
    return t


def _pihak(u: User, tanggal: date, s: Shift) -> PihakTukar:
    return PihakTukar(
        id=u.id,
        nama=u.nama,
        foto_profil=url_foto_profil(u.foto_profil),
        tanggal=tanggal.isoformat(),
        tanggal_teks=f.tanggal_teks(tanggal),
        hari=f.nama_hari(tanggal),
        shift=_keluar_shift(s),
    )


def _keluar_tukar(t: TukarShift, saya: User | None = None) -> TukarKeluar:
    ditolak_oleh = None
    if t.status == "Ditolak":
        ditolak_oleh = "admin" if t.diputus_pada else "rekan"
    peran_saya = None
    if saya is not None:
        peran_saya = "pemohon" if t.pemohon_id == saya.id else "rekan"
    return TukarKeluar(
        id=t.id,
        status=t.status,
        jabatan=t.pemohon.jabatan,
        pemohon=_pihak(t.pemohon, t.tanggal_pemohon, t.shift_pemohon),
        rekan=_pihak(t.rekan, t.tanggal_rekan, t.shift_rekan),
        alasan=t.alasan,
        alasan_tolak=t.alasan_tolak,
        ditolak_oleh=ditolak_oleh,
        catatan_batal=t.catatan_batal,
        dibuat_pada=f.cap_waktu(t.dibuat_pada),
        dijawab_rekan_pada=f.cap_waktu(t.dijawab_rekan_pada),
        diputus_pada=f.cap_waktu(t.diputus_pada),
        diputus_oleh=t.pemutus.nama if t.pemutus else None,
        diperbarui_pada=f.cap_waktu(t.diperbarui_pada),
        peran_saya=peran_saya,
    )


def _sudah_lewat(t: TukarShift) -> bool:
    return min(t.tanggal_pemohon, t.tanggal_rekan) < f.hari_ini()


@router.post("/tukar", response_model=TukarKeluar, status_code=201)
def ajukan_tukar(
    isi: AjukanTukar, tugas: BackgroundTasks, db: Session = Depends(ambil_db), user: User = Depends(petugas_saja)
):
    alasan = isi.alasan.strip()
    if not alasan:
        raise HTTPException(422, "Alasan wajib diisi.")
    if min(isi.tanggal_saya, isi.tanggal_rekan) < f.hari_ini():
        raise HTTPException(422, "Jadwal yang tanggalnya sudah lewat tidak bisa ditukar.")
    r = _rekan(db, user, isi.rekan_id)

    tanggal = {isi.tanggal_saya, isi.tanggal_rekan}
    ada = {
        (j.user_id, j.tanggal): j
        for j in db.scalars(
            select(JadwalShift).where(JadwalShift.user_id.in_({user.id, r.id}), JadwalShift.tanggal.in_(tanggal))
        )
    }
    milik_saya = ada.get((user.id, isi.tanggal_saya))
    if milik_saya is None:
        raise HTTPException(422, f"Anda belum punya jadwal pada {f.tanggal_teks(isi.tanggal_saya)}.")
    milik_rekan = ada.get((r.id, isi.tanggal_rekan))
    if milik_rekan is None:
        raise HTTPException(422, f"{r.nama} belum punya jadwal pada {f.tanggal_teks(isi.tanggal_rekan)}.")

    if milik_saya.shift_id == milik_rekan.shift_id:
        raise HTTPException(422, "Shift Anda dan rekan sama, tidak ada yang perlu ditukar.")

    t = TukarShift(
        pemohon_id=user.id,
        tanggal_pemohon=isi.tanggal_saya,
        shift_pemohon_id=milik_saya.shift_id,
        rekan_id=r.id,
        tanggal_rekan=isi.tanggal_rekan,
        shift_rekan_id=milik_rekan.shift_id,
        alasan=alasan,
        status="Menunggu Rekan",
    )
    if _sel_diajukan(_tukar_berjalan(db, {user.id, r.id}, tanggal=tanggal)) & t.sel:
        raise HTTPException(
            409, "Salah satu jadwal ini sedang diajukan tukar. Tunggu permintaan itu selesai atau batalkan dulu."
        )
    db.add(t)
    catat(
        db, user, "ajukan_tukar_shift",
        f"{user.nama} ({f.tanggal_teks(isi.tanggal_saya)}) ⇄ {r.nama} ({f.tanggal_teks(isi.tanggal_rekan)})",
    )
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            409, "Salah satu jadwal ini sedang diajukan tukar. Tunggu permintaan itu selesai atau batalkan dulu."
        ) from None
    tugas.add_task(push.tukar_masuk, r.id, user.nama, t.id)
    return _keluar_tukar(_ambil_tukar(db, t.id), user)


@router.post("/tukar/{tukar_id}/jawab", response_model=TukarKeluar)
def jawab_tukar(
    tukar_id: int,
    isi: JawabTukar,
    tugas: BackgroundTasks,
    db: Session = Depends(ambil_db),
    user: User = Depends(petugas_saja),
):
    """Rekan yang diajak menyetujui (lanjut ke admin) atau menolak."""
    t = _ambil_tukar(db, tukar_id)
    if t.rekan_id != user.id:
        raise HTTPException(403, "Permintaan ini bukan untuk Anda.")
    if t.status != "Menunggu Rekan":
        raise HTTPException(409, "Permintaan ini sudah dijawab atau dibatalkan.")
    kini = f.sekarang()
    if isi.setuju:
        if _sudah_lewat(t):
            raise HTTPException(409, "Tanggal tukarnya sudah lewat, jadi permintaan ini hanya bisa ditolak.")
        t.status = "Menunggu Admin"
        tugas.add_task(push.tukar_menunggu_admin, t.pemohon.nama, user.nama, t.id)
    else:
        t.status = "Ditolak"
        t.alasan_tolak = isi.alasan.strip() or None
        tugas.add_task(push.tukar_selesai, [t.pemohon_id], f"{user.nama} menolak ajakan tukar shift Anda", t.id)
    t.dijawab_rekan_pada = kini
    t.diperbarui_pada = kini
    catat(db, user, "jawab_tukar_shift", f"Tukar shift #{t.id}: {'setuju' if isi.setuju else 'tolak'}")
    db.commit()
    return _keluar_tukar(t, user)


@router.post("/tukar/{tukar_id}/putuskan", response_model=TukarKeluar)
def putuskan_tukar(
    tukar_id: int,
    isi: JawabTukar,
    tugas: BackgroundTasks,
    db: Session = Depends(ambil_db),
    admin: User = Depends(pengawas),
):
    """Admin menyetujui (jadwal langsung ditukar) atau menolak dengan alasan."""
    t = _ambil_tukar(db, tukar_id)
    if t.status != "Menunggu Admin":
        raise HTTPException(409, "Permintaan ini tidak sedang menunggu persetujuan admin.")
    kini = f.sekarang()
    pihak = [t.pemohon_id, t.rekan_id]

    if not isi.setuju:
        alasan = isi.alasan.strip()
        if not alasan:
            raise HTTPException(422, "Alasan penolakan wajib diisi.")
        t.status = "Ditolak"
        t.alasan_tolak = alasan
        t.pemutus = admin
        t.diputus_pada = kini
        t.diperbarui_pada = kini
        catat(db, admin, "tolak_tukar_shift", f"Tukar shift #{t.id}: {alasan[:80]}")
        db.commit()
        tugas.add_task(push.tukar_selesai, pihak, "Permintaan tukar shift Anda ditolak admin", t.id)
        return _keluar_tukar(t)

    if _sudah_lewat(t):
        raise HTTPException(409, "Tanggal tukarnya sudah lewat. Tolak permintaan ini.")
    if t.pemohon.jabatan != t.rekan.jabatan:
        raise HTTPException(409, "Jabatan kedua petugas sudah berbeda, jadi shift tidak bisa ditukar. Tolak permintaan ini.")

    tanggal = sorted({t.tanggal_pemohon, t.tanggal_rekan})
    ada = _kotak_ada(db, set(pihak), tanggal[0], tanggal[-1])
    ada = {k: v for k, v in ada.items() if k[1] in tanggal}
    sekarang_pemohon = ada.get((t.pemohon_id, t.tanggal_pemohon))
    sekarang_rekan = ada.get((t.rekan_id, t.tanggal_rekan))
    if (
        sekarang_pemohon is None or sekarang_pemohon.shift_id != t.shift_pemohon_id
        or sekarang_rekan is None or sekarang_rekan.shift_id != t.shift_rekan_id
    ):
        # Mestinya sudah dibatalkan saat admin mengubah jadwal; ini penjaga terakhir.
        t.status = "Dibatalkan"
        t.catatan_batal = "Jadwal sudah berubah sejak diajukan"
        t.diperbarui_pada = kini
        catat(db, admin, "batal_tukar_shift", f"Tukar shift #{t.id}: jadwal sudah berubah")
        db.commit()
        raise HTTPException(409, "Jadwal kedua petugas sudah berubah sejak diajukan, jadi permintaan ini dibatalkan.")

    # Hanya dua kotak yang ditukar: kotak pemohon di tanggalnya dan kotak rekan di tanggalnya.
    _tulis_kotak(db, sekarang_pemohon, t.pemohon_id, t.tanggal_pemohon, t.shift_rekan_id, admin, dari_tukar=t.id)
    _tulis_kotak(db, sekarang_rekan, t.rekan_id, t.tanggal_rekan, t.shift_pemohon_id, admin, dari_tukar=t.id)
    t.status = "Disetujui"
    t.pemutus = admin
    t.diputus_pada = kini
    t.diperbarui_pada = kini
    catat(
        db, admin, "setujui_tukar_shift",
        f"Tukar shift #{t.id}: {t.pemohon.nama} ⇄ {t.rekan.nama} ({', '.join(f.tanggal_teks(d) for d in tanggal)})",
    )
    db.commit()
    tugas.add_task(push.tukar_selesai, pihak, "Tukar shift Anda disetujui admin", t.id)
    return _keluar_tukar(t)


@router.post("/tukar/{tukar_id}/batal", response_model=TukarKeluar)
def batal_tukar(
    tukar_id: int, tugas: BackgroundTasks, db: Session = Depends(ambil_db), user: User = Depends(petugas_saja)
):
    """Pemohon menarik permintaannya selama belum diputuskan."""
    t = _ambil_tukar(db, tukar_id)
    if t.pemohon_id != user.id:
        raise HTTPException(403, "Hanya pengaju yang bisa membatalkan permintaan ini.")
    if t.status not in TUKAR_BERJALAN:
        raise HTTPException(409, "Permintaan ini sudah selesai.")
    t.status = "Dibatalkan"
    t.catatan_batal = "Dibatalkan pengaju"
    t.diperbarui_pada = f.sekarang()
    catat(db, user, "batal_tukar_shift", f"Tukar shift #{t.id} dibatalkan pengaju")
    db.commit()
    tugas.add_task(push.tukar_selesai, [t.rekan_id], f"{user.nama} membatalkan ajakan tukar shift", t.id)
    return _keluar_tukar(t, user)


@router.get("/tukar", response_model=list[TukarKeluar])
def daftar_tukar(
    status: StatusTukar | None = None,
    batas: int = Query(200, ge=1, le=500),
    db: Session = Depends(ambil_db),
    _: User = Depends(pengawas),
):
    q = select(TukarShift).options(*_MUAT_TUKAR, selectinload(TukarShift.pemutus))
    if status:
        q = q.where(TukarShift.status == status)
    q = q.order_by(TukarShift.diperbarui_pada.desc()).limit(batas)
    return [_keluar_tukar(t) for t in db.scalars(q)]


@router.get("/tukar/saya", response_model=list[TukarKeluar])
def tukar_saya(
    batas: int = Query(100, ge=1, le=300),
    db: Session = Depends(ambil_db),
    user: User = Depends(petugas_saja),
):
    """Permintaan yang saya ajukan dan yang ditujukan ke saya."""
    q = (
        select(TukarShift)
        .options(*_MUAT_TUKAR, selectinload(TukarShift.pemutus))
        .where(or_(TukarShift.pemohon_id == user.id, TukarShift.rekan_id == user.id))
        .order_by(TukarShift.diperbarui_pada.desc())
        .limit(batas)
    )
    return [_keluar_tukar(t, user) for t in db.scalars(q)]
