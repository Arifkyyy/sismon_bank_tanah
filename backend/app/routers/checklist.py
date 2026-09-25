"""
Checklist harian petugas.

Alur:
  super admin menyusun item per jabatan  →  petugas mengisi lembar harian
  (boleh disimpan dulu sebagai Draf)     →  dikirim, lalu terkunci
  →  admin melihat rekapnya per tanggal.

Daftar item disimpan di database, bukan di kode, supaya bisa diubah saat SOP
direvisi. Jabatan yang itemnya belum disusun mengembalikan daftar kosong,
bukan galat.
"""
from datetime import date, time, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app import format as f
from app.audit import catat
from app.config import pengaturan
from app.database import ambil_db
from app.deps import PENGAWAS, butuh_peran, user_saat_ini
from app.foto_util import url_foto_profil
from app.models import ChecklistHarian, ChecklistItem, ChecklistJawaban, User
from app.schemas import (
    ItemKeluar, ItemMasuk, Jabatan, JawabanKeluar, LembarKeluar, LembarMasuk, RingkasKeluar, UrutanMasuk,
)

router = APIRouter(prefix="/api/checklist", tags=["Checklist"])
hanya_super = butuh_peran("superadmin")

SESI_PENUH = ("Pagi", "Siang", "Sore")
# Sesi Siang dan Sore baru boleh diisi mulai jam ini (WIB). Samakan dengan JAM_BUKA di
# src/pages/user/KerjaWajib.tsx. Tanggal yang sudah lewat semua sesinya terbuka.
JAM_BUKA = {"Harian": time(0), "Pagi": time(0), "Siang": time(11), "Sore": time(15)}


def _sesi_item(item: ChecklistItem) -> tuple[str, ...]:
    """Item 'harian' punya satu kotak, item 'sesi' punya tiga kotak."""
    return SESI_PENUH if item.mode == "sesi" else ("Harian",)


def _item_aktif(db: Session, jabatan: str) -> list[ChecklistItem]:
    return list(
        db.scalars(
            select(ChecklistItem)
            .where(ChecklistItem.jabatan == jabatan, ChecklistItem.aktif.is_(True))
            .order_by(ChecklistItem.urutan, ChecklistItem.id)
        )
    )


def _keluar_item(i: ChecklistItem) -> ItemKeluar:
    return ItemKeluar(id=i.id, jabatan=i.jabatan, urutan=i.urutan, teks=i.teks, mode=i.mode, aktif=i.aktif)


def _hitung(item: list[ChecklistItem], jawaban: list[ChecklistJawaban]) -> tuple[int, int, int, int]:
    """(total kotak, terisi, jumlah 'Tidak', persen terisi)."""
    total = sum(len(_sesi_item(i)) for i in item)
    id_aktif = {i.id for i in item}
    dipakai = [j for j in jawaban if j.item_id in id_aktif]
    terisi = len(dipakai)
    tidak = sum(1 for j in dipakai if j.status == "Tidak")
    persen = round(terisi / total * 100) if total else 0
    return total, terisi, tidak, persen


def _batas_pengisian() -> date:
    """Tanggal paling lama yang masih boleh diisi petugas."""
    return f.hari_ini() - timedelta(days=pengaturan.checklist_mundur_hari)


def _bisa_diisi(tanggal: date) -> bool:
    return _batas_pengisian() <= tanggal <= f.hari_ini()


def _petugas(db: Session, petugas_id: int) -> User:
    p = db.get(User, petugas_id)
    if not p or p.peran != "user":
        raise HTTPException(422, "Petugas tidak ditemukan.")
    return p


def _lembar(db: Session, petugas_id: int, tanggal: date) -> ChecklistHarian | None:
    return db.scalar(
        select(ChecklistHarian)
        .options(selectinload(ChecklistHarian.jawaban), selectinload(ChecklistHarian.petugas))
        .where(ChecklistHarian.petugas_id == petugas_id, ChecklistHarian.tanggal == tanggal)
    )


# ------------------------------------------------------- Item (data master)

@router.get("/item", response_model=list[ItemKeluar])
def daftar_item(
    jabatan: Jabatan | None = None,
    semua: bool = Query(False, description="true = ikut menampilkan item yang sudah dinonaktifkan"),
    db: Session = Depends(ambil_db),
    _: User = Depends(user_saat_ini),
):
    q = select(ChecklistItem).order_by(ChecklistItem.jabatan, ChecklistItem.urutan, ChecklistItem.id)
    if jabatan:
        q = q.where(ChecklistItem.jabatan == jabatan)
    if not semua:
        q = q.where(ChecklistItem.aktif.is_(True))
    return [_keluar_item(i) for i in db.scalars(q)]


@router.post("/item", response_model=ItemKeluar, status_code=201)
def tambah_item(isi: ItemMasuk, db: Session = Depends(ambil_db), admin: User = Depends(hanya_super)):
    urutan = isi.urutan
    if urutan is None:
        terakhir = db.scalar(select(func.max(ChecklistItem.urutan)).where(ChecklistItem.jabatan == isi.jabatan))
        urutan = (terakhir or 0) + 1
    item = ChecklistItem(
        jabatan=isi.jabatan, urutan=urutan, teks=isi.teks.strip(), mode=isi.mode, aktif=isi.aktif
    )
    db.add(item)
    catat(db, admin, "tambah_item_checklist", f"{isi.jabatan}: {isi.teks[:80]}")
    db.commit()
    return _keluar_item(item)


@router.put("/item/{item_id}", response_model=ItemKeluar)
def ubah_item(item_id: int, isi: ItemMasuk, db: Session = Depends(ambil_db), _: User = Depends(hanya_super)):
    item = db.get(ChecklistItem, item_id)
    if not item:
        raise HTTPException(404, "Item tidak ditemukan.")
    item.jabatan = isi.jabatan
    item.teks = isi.teks.strip()
    item.mode = isi.mode
    item.aktif = isi.aktif
    if isi.urutan is not None:
        item.urutan = isi.urutan
    db.commit()
    return _keluar_item(item)


@router.put("/item/urutan/{jabatan}", response_model=list[ItemKeluar])
def ubah_urutan(
    jabatan: Jabatan, isi: UrutanMasuk, db: Session = Depends(ambil_db), _: User = Depends(hanya_super)
):
    """Menyimpan urutan baru: kirim semua id item jabatan ini, dari atas ke bawah."""
    item = {i.id: i for i in db.scalars(select(ChecklistItem).where(ChecklistItem.jabatan == jabatan))}
    for nomor, item_id in enumerate(isi.ids, start=1):
        if item_id not in item:
            raise HTTPException(422, "Ada id item yang bukan milik jabatan ini.")
        item[item_id].urutan = nomor
    db.commit()
    return [_keluar_item(i) for i in sorted(item.values(), key=lambda x: (x.urutan, x.id))]


@router.delete("/item/{item_id}", status_code=204)
def hapus_item(item_id: int, db: Session = Depends(ambil_db), admin: User = Depends(hanya_super)):
    """
    Item yang belum pernah dijawab dihapus betulan. Item yang sudah dipakai
    hanya dinonaktifkan, supaya checklist lama tidak berubah isinya.
    """
    item = db.get(ChecklistItem, item_id)
    if not item:
        raise HTTPException(404, "Item tidak ditemukan.")
    dipakai = db.scalar(select(func.count()).where(ChecklistJawaban.item_id == item_id))
    if dipakai:
        item.aktif = False
        catat(db, admin, "nonaktifkan_item_checklist", f"Item #{item_id} ({dipakai} jawaban tersimpan)")
    else:
        db.delete(item)
        catat(db, admin, "hapus_item_checklist", f"Item #{item_id}")
    db.commit()


# ------------------------------------------------------- Lembar petugas

@router.get("/lembar", response_model=LembarKeluar)
def lembar(
    petugas_id: int | None = None,
    tanggal: date | None = None,
    db: Session = Depends(ambil_db),
    user: User = Depends(user_saat_ini),
):
    """
    Lembar checklist satu petugas pada satu tanggal, lengkap dengan daftar item
    dan jawaban yang sudah tersimpan. Petugas hanya boleh membuka miliknya.
    """
    petugas_id = petugas_id or user.id
    tanggal = tanggal or f.hari_ini()
    if user.peran == "user" and petugas_id != user.id:
        raise HTTPException(403, "Anda hanya bisa membuka checklist milik sendiri.")
    p = _petugas(db, petugas_id)

    item = _item_aktif(db, p.jabatan)
    lembar = _lembar(db, petugas_id, tanggal)
    jawaban = lembar.jawaban if lembar else []
    total, terisi, tidak, persen = _hitung(item, jawaban)

    return LembarKeluar(
        id=lembar.id if lembar else None,
        petugas_id=p.id,
        nama=p.nama,
        jabatan=p.jabatan,
        foto_profil=url_foto_profil(p.foto_profil),
        tanggal=f.tanggal_teks(tanggal),
        tanggal_iso=tanggal.isoformat(),
        hari=f.nama_hari(tanggal),
        status=lembar.status if lembar else "Draf",
        dikirim_pada=f.cap_waktu(lembar.dikirim_pada) if lembar else None,
        bisa_diisi=_bisa_diisi(tanggal) and (lembar is None or lembar.status == "Draf"),
        item=[_keluar_item(i) for i in item],
        jawaban=[
            JawabanKeluar(item_id=j.item_id, sesi=j.sesi, status=j.status, catatan=j.catatan) for j in jawaban
        ],
        total_kotak=total,
        terisi=terisi,
        tidak=tidak,
        persen=persen,
    )


@router.put("/lembar", response_model=LembarKeluar)
def simpan(isi: LembarMasuk, db: Session = Depends(ambil_db), user: User = Depends(user_saat_ini)):
    """
    Menyimpan seluruh jawaban satu lembar sekaligus (jawaban lama ditimpa).
    `kirim: true` mengunci lembar; setelah itu hanya admin yang bisa membukanya.
    """
    if user.peran == "user" and isi.petugas_id != user.id:
        raise HTTPException(403, "Anda hanya bisa mengisi checklist milik sendiri.")
    p = _petugas(db, isi.petugas_id)
    if not _bisa_diisi(isi.tanggal):
        raise HTTPException(
            422,
            f"Checklist hanya bisa diisi untuk tanggal {f.tanggal_teks(_batas_pengisian())} "
            f"sampai {f.tanggal_teks(f.hari_ini())}.",
        )

    item = {i.id: i for i in _item_aktif(db, p.jabatan)}
    if not item:
        raise HTTPException(422, f"Checklist untuk jabatan {p.jabatan} belum disusun.")

    for j in isi.jawaban:
        if j.item_id not in item:
            raise HTTPException(422, "Ada item yang tidak berlaku untuk jabatan petugas ini.")
        if j.sesi not in _sesi_item(item[j.item_id]):
            raise HTTPException(422, f"Item #{j.item_id} tidak memakai sesi {j.sesi}.")
        if isi.tanggal == f.hari_ini() and f.sekarang().time() < JAM_BUKA[j.sesi]:
            raise HTTPException(422, f"Sesi {j.sesi} baru dibuka pukul {f.jam_teks(JAM_BUKA[j.sesi])}.")

    lembar = _lembar(db, isi.petugas_id, isi.tanggal)
    if lembar is None:
        lembar = ChecklistHarian(petugas_id=isi.petugas_id, tanggal=isi.tanggal, diisi_oleh=user.id)
        db.add(lembar)
        db.flush()
    elif lembar.status == "Dikirim":
        raise HTTPException(409, "Checklist ini sudah dikirim dan tidak bisa diubah lagi.")

    # Jawaban lama dihapus lalu ditulis ulang: frontend selalu mengirim lembar utuh.
    lembar.jawaban.clear()
    db.flush()
    for j in isi.jawaban:
        lembar.jawaban.append(
            ChecklistJawaban(item_id=j.item_id, sesi=j.sesi, status=j.status, catatan=j.catatan.strip())
        )
    lembar.diisi_oleh = user.id

    if isi.kirim:
        total, terisi, _, _ = _hitung(list(item.values()), lembar.jawaban)
        if terisi < total:
            raise HTTPException(422, f"Masih ada {total - terisi} kotak yang belum diisi.")
        tanpa_catatan = sum(1 for j in lembar.jawaban if j.status == "Tidak" and not j.catatan)
        if tanpa_catatan:
            raise HTTPException(422, f"{tanpa_catatan} jawaban ✗ belum diberi keterangan.")
        lembar.status = "Dikirim"
        lembar.dikirim_pada = f.sekarang()

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Ada jawaban ganda untuk item yang sama.") from None

    return lembar_ulang(db, isi.petugas_id, isi.tanggal, user)


def lembar_ulang(db: Session, petugas_id: int, tanggal: date, user: User) -> LembarKeluar:
    return lembar(petugas_id=petugas_id, tanggal=tanggal, db=db, user=user)


# ------------------------------------------------------- Rekap admin

@router.get("", response_model=list[RingkasKeluar])
def rekap(
    tanggal: date | None = None,
    jabatan: Jabatan | None = None,
    db: Session = Depends(ambil_db),
    _: User = Depends(butuh_peran(*PENGAWAS)),
):
    """
    Satu baris per petugas aktif: sudah mengisi atau belum, berapa persen, dan
    berapa item yang dijawab 'Tidak'. Petugas nonaktif tidak ikut.
    """
    tanggal = tanggal or f.hari_ini()
    q = select(User).where(User.peran == "user", User.status != "Nonaktif").order_by(User.jabatan, User.nama)
    if jabatan:
        q = q.where(User.jabatan == jabatan)
    petugas = list(db.scalars(q))
    if not petugas:
        return []

    item_per_jabatan = {j: _item_aktif(db, j) for j in {p.jabatan for p in petugas}}
    lembar_per_petugas = {
        l.petugas_id: l
        for l in db.scalars(
            select(ChecklistHarian)
            .options(selectinload(ChecklistHarian.jawaban))
            .where(
                ChecklistHarian.tanggal == tanggal,
                ChecklistHarian.petugas_id.in_([p.id for p in petugas]),
            )
        )
    }

    hasil = []
    for p in petugas:
        l = lembar_per_petugas.get(p.id)
        total, terisi, tidak, persen = _hitung(item_per_jabatan[p.jabatan], l.jawaban if l else [])
        hasil.append(
            RingkasKeluar(
                id=l.id if l else None,
                petugas_id=p.id,
                nama=p.nama,
                jabatan=p.jabatan,
                foto_profil=url_foto_profil(p.foto_profil),
                tanggal=f.tanggal_teks(tanggal),
                tanggal_iso=tanggal.isoformat(),
                status=l.status if l else "Belum diisi",
                total_kotak=total,
                terisi=terisi,
                tidak=tidak,
                persen=persen,
                dikirim_pada=f.cap_waktu(l.dikirim_pada) if l else None,
            )
        )
    return hasil


@router.post("/{lembar_id}/buka-kunci", response_model=RingkasKeluar)
def buka_kunci(lembar_id: int, db: Session = Depends(ambil_db), admin: User = Depends(butuh_peran(*PENGAWAS))):
    """Mengembalikan lembar yang sudah dikirim menjadi Draf agar bisa diperbaiki petugas."""
    l = db.get(ChecklistHarian, lembar_id, options=(selectinload(ChecklistHarian.jawaban),))
    if not l:
        raise HTTPException(404, "Checklist tidak ditemukan.")
    if l.status != "Dikirim":
        raise HTTPException(409, "Checklist ini masih berstatus Draf.")
    l.status = "Draf"
    l.dikirim_pada = None
    catat(db, admin, "buka_kunci_checklist", f"Checklist #{l.id}")
    db.commit()
    p = db.get(User, l.petugas_id)
    total, terisi, tidak, persen = _hitung(_item_aktif(db, p.jabatan), l.jawaban)
    return RingkasKeluar(
        id=l.id,
        petugas_id=p.id,
        nama=p.nama,
        jabatan=p.jabatan,
        foto_profil=url_foto_profil(p.foto_profil),
        tanggal=f.tanggal_teks(l.tanggal),
        tanggal_iso=l.tanggal.isoformat(),
        status=l.status,
        total_kotak=total,
        terisi=terisi,
        tidak=tidak,
        persen=persen,
        dikirim_pada=None,
    )
