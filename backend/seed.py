"""
Mengisi database dengan akun awal dan data contoh.

    python seed.py            → akun + data contoh (untuk mencoba)
    python seed.py --kosong   → hanya akun super admin (untuk server sungguhan)

Aman dijalankan ulang: akun yang emailnya sudah ada dilewati.
"""
import sys
from datetime import time, timedelta

from sqlalchemy import select

from app import format as f
from app.database import SesiLokal
from app.models import ChecklistHarian, ChecklistItem, ChecklistJawaban, Kendala, Lembur, Logbook, User
from app.security import acak_sandi

SANDI_AWAL = "BankTanah2026!"

SUPER = dict(nama="Dian Permatasari", email="dian.permatasari@banktanah.go.id", peran="superadmin",
             nip="19880412 201203 2 004", unit="Divisi Umum & SDM")

ADMIN = [
    dict(nama="Rahmat Hidayat", email="rahmat.hidayat@banktanah.go.id", nip="19910228 201504 1 007",
         unit="Bagian Pengelolaan Gedung"),
    dict(nama="Nurul Aisyah", email="nurul.aisyah@banktanah.go.id", unit="Bagian Pengelolaan Gedung"),
    dict(nama="Teguh Santoso", email="teguh.santoso@banktanah.go.id", unit="Bagian Umum", status="Nonaktif"),
]

PETUGAS = [
    ("Bagas Setiawan", "Security", "0812-1144-9021", "Aktif", "20210719 003", "Pos Utama — Gedung A"),
    ("Siti Nurhaliza", "CS", "0813-2210-7744", "Aktif", "", "Meja Depan — Gedung A"),
    ("Joko Priyono", "OB", "0857-9911-2038", "Aktif", "", "Gedung A"),
    ("Andri Kurniawan", "Security", "0811-7788-4512", "Cuti", "", "Pos Belakang — Gedung A"),
    ("Maya Anggraini", "CS", "0895-3344-1120", "Aktif", "", "Meja Depan — Gedung A"),
    ("Rudi Hartono", "OB", "0856-2277-9903", "Nonaktif", "", "Gedung B"),
    ("Fitri Handayani", "CS", "0821-6655-3310", "Aktif", "", "Meja Depan — Gedung B"),
    ("Slamet Riyadi", "Security", "0877-1122-8890", "Aktif", "", "Pos Utama — Gedung B"),
    ("Dimas Prakoso", "Messenger", "0813-4455-7781", "Aktif", "", "Bagian Umum — Gedung A"),
]

# Checklist OB/OG: satu status per hari (sesuai dokumen SOP bagian 9).
ITEM_OB = [
    "Seragam, ID card, sepatu, dan penampilan sesuai standar",
    "Pantry bersih, kering, rapi, dan tidak berbau",
    "Air galon pada seluruh titik cukup dan galon cadangan tersedia",
    "Dispenser berfungsi dan tidak bocor",
    "Gelas/cangkir/sendok/piring bersih dan cukup",
    "Teh/kopi/gula dan kebutuhan minuman tersedia",
    "Tissue dan kebutuhan higiene tersedia",
    "Sabun cuci/spons/lap tersedia",
    "Tempat sampah tidak penuh",
    "Area pelayanan pimpinan siap",
    "Agenda rapat/kegiatan sudah dicek",
    "Ruang rapat siap sebelum kegiatan",
    "Setelah kegiatan, perlengkapan sudah dibereskan",
    "Kerusakan/kekurangan sudah dilaporkan",
    "Pantry dan area tanggung jawab siap untuk hari berikutnya",
]

# Checklist Cleaning Service: dicek tiga kali (Pagi, Siang, Sore) — SOP bagian 15.
ITEM_CS = [
    "Lobby, receptionist counter, ruang tunggu",
    "Koridor dan tangga",
    "Ruang kerja",
    "Ruang rapat/lounge",
    "Toilet pria/wanita/VIP",
    "Pantry dan area utilitas",
    "Sampah seluruh area",
    "Kaca/permukaan/perabot yang memerlukan spot cleaning",
    "Pemeriksaan persediaan toilet/pantry",
    "Pemeriksaan akhir: area bersih, rapi, aman, tidak ada sampah tertinggal",
]


def email_dari(nama: str) -> str:
    return nama.lower().replace(" ", ".") + "@banktanah.go.id"


def buat_akun(db) -> dict[str, User]:
    semua: dict[str, User] = {}

    def tambah(**data) -> None:
        ada = db.scalar(select(User).where(User.email == data["email"]))
        if ada:
            semua[ada.nama] = ada
            return
        u = User(password_hash=acak_sandi(SANDI_AWAL), status=data.pop("status", "Aktif"), **data)
        db.add(u)
        semua[u.nama] = u

    tambah(**SUPER)
    if "--kosong" not in sys.argv:
        for a in ADMIN:
            tambah(peran="admin", **a)
        for nama, jabatan, telp, status, nip, unit in PETUGAS:
            tambah(nama=nama, email=email_dari(nama), peran="user", jabatan=jabatan, telepon=telp,
                   status=status, nip=nip, unit=unit)
    db.flush()
    return semua


def buat_checklist(db) -> None:
    """
    Item checklist per jabatan. Aman dijalankan ulang: yang teksnya sudah ada
    dilewati. Security dan Messenger sengaja dibiarkan kosong — daftarnya
    ditambahkan lewat halaman Kelola Checklist setelah SOP-nya selesai.
    """
    ada = {(i.jabatan, i.teks) for i in db.scalars(select(ChecklistItem))}
    for jabatan, daftar, mode in (("OB", ITEM_OB, "harian"), ("CS", ITEM_CS, "sesi")):
        for nomor, teks in enumerate(daftar, start=1):
            if (jabatan, teks) in ada:
                continue
            db.add(ChecklistItem(jabatan=jabatan, urutan=nomor, teks=teks, mode=mode, aktif=True))
    db.flush()


def buat_contoh(db, u: dict[str, User]) -> None:
    if db.scalar(select(Logbook).limit(1)):
        print("Data contoh sudah ada, dilewati.")
        return

    kini = f.hari_ini()
    kemarin = kini - timedelta(days=1)
    admin = u["Rahmat Hidayat"]

    def log(nama, hari, jam, ket):
        db.add(Logbook(petugas_id=u[nama].id, dibuat_oleh=u[nama].id,
                       waktu=f.gabung_waktu(hari, time.fromisoformat(jam)), keterangan=ket))

    # Logbook dua minggu terakhir, supaya bagan dan rekap ada isinya.
    rutin = {
        "Security": "Patroli keliling area parkir dan pintu belakang, kondisi aman terkendali.",
        "OB": "Pembersihan lobi lantai 1 dan pantry lantai 3 selesai sesuai jadwal.",
        "CS": "Pelayanan tamu di meja depan berjalan lancar, antrean tertangani.",
        "Messenger": "Pengantaran surat dan dokumen ke unit tujuan selesai, tanda terima terkumpul.",
    }
    for i in range(2, 14):
        hari = kini - timedelta(days=i)
        for nama, jabatan, _, status, _, _ in PETUGAS:
            if status == "Aktif" and (i + len(nama)) % 5:
                log(nama, hari, "08:15", rutin[jabatan])

    log("Bagas Setiawan", kini, "07:02", "Serah terima shift pagi di Pos Utama. Kondisi area aman, seluruh akses berfungsi.")
    log("Joko Priyono", kini, "07:20", "Pembersihan lobi lantai 1 dan pantry lantai 3 selesai.")
    log("Siti Nurhaliza", kini, "08:05", "Pembukaan layanan meja depan, 4 tamu terlayani sebelum pukul 09.00.")
    log("Maya Anggraini", kini, "08:31", "Rekap surat masuk diserahkan ke Bagian Umum untuk diproses.")
    log("Slamet Riyadi", kini, "09:14", "Patroli keliling area parkir dan pintu belakang, tidak ada temuan.")
    log("Dimas Prakoso", kini, "10:05", "Pengantaran dokumen ke Kementerian ATR/BPN selesai, tanda terima diterima.")
    log("Fitri Handayani", kemarin, "16:48", "Penutupan layanan, laporan harian diserahkan ke koordinator.")
    log("Andri Kurniawan", kemarin, "19:00", "Mulai shift malam, pengecekan seluruh titik CCTV di gedung.")

    def kendala(nama, hari, jam, ket, status):
        db.add(Kendala(petugas_id=u[nama].id, dibuat_oleh=u[nama].id, status=status,
                       waktu=f.gabung_waktu(hari, time.fromisoformat(jam)), keterangan=ket))

    kendala("Joko Priyono", kini, "07:40", "Keran wastafel toilet pria lantai 2 bocor, air menggenang di lantai.", "Baru")
    kendala("Bagas Setiawan", kini, "07:10", "Palang parkir sisi timur macet saat dibuka, perlu pengecekan teknisi.", "Diproses")
    kendala("Siti Nurhaliza", kemarin, "13:25", "Printer meja depan tidak terdeteksi jaringan sejak pagi.", "Diproses")
    kendala("Maya Anggraini", kini - timedelta(days=2), "11:05", "AC ruang tunggu tidak dingin, tamu mengeluh sejak siang.", "Selesai")
    kendala("Slamet Riyadi", kini - timedelta(days=3), "21:30", "Lampu sorot halaman belakang mati, area jadi gelap saat patroli.", "Selesai")

    def lembur(nama, jabatan, hari, mulai, selesai, ket, status, alasan=None):
        l = Lembur(petugas_id=u[nama].id if nama else None, jabatan=jabatan, dibuat_oleh=admin.id,
                   tanggal=hari, jam_mulai=time.fromisoformat(mulai), jam_selesai=time.fromisoformat(selesai),
                   keterangan=ket, status=status, alasan_tolak=alasan)
        if status != "Draf":
            l.dikirim_pada = f.sekarang() - timedelta(days=2)
        if status in ("Diterima", "Ditolak"):
            l.dijawab_pada = f.sekarang() - timedelta(days=1)
        db.add(l)

    besok = kini + timedelta(days=1)
    lembur("Bagas Setiawan", "Security", besok, "18:00", "22:00", "Pengamanan rapat koordinasi direksi di Ruang Serbaguna.", "Menunggu")
    lembur("Siti Nurhaliza", "CS", besok, "17:00", "20:00", "Pendampingan tamu kunjungan kerja daerah.", "Diterima")
    lembur("Joko Priyono", "OB", kini, "17:00", "21:00", "Persiapan dan pembersihan ruang rapat setelah acara.", "Diterima")
    lembur("Andri Kurniawan", "Security", kemarin, "19:00", "23:00", "Penggantian rekan yang berhalangan hadir shift malam.", "Ditolak", "Sedang sakit dan sudah izin ke koordinator pos.")
    lembur("Maya Anggraini", "CS", kini - timedelta(days=3), "16:00", "19:00", "Rekap dokumen layanan akhir pekan.", "Diterima")
    lembur("Slamet Riyadi", "Security", kini + timedelta(days=2), "18:00", "23:00", "Pengamanan bongkar muat dokumen arsip dari gudang ke Gedung B.", "Draf")
    lembur(None, "CS", kini + timedelta(days=3), "17:00", "20:00", "Pendampingan tamu kunjungan kerja Kementerian ATR/BPN.", "Draf")


def contoh_checklist(db, u: dict[str, User]) -> None:
    """Satu lembar checklist terkirim milik OB kemarin, sebagai contoh tampilan."""
    if db.scalar(select(ChecklistHarian).limit(1)):
        return
    joko = u.get("Joko Priyono")
    if not joko:
        return
    item = list(db.scalars(select(ChecklistItem).where(ChecklistItem.jabatan == "OB")))
    if not item:
        return
    lembar = ChecklistHarian(
        petugas_id=joko.id,
        tanggal=f.hari_ini() - timedelta(days=1),
        status="Dikirim",
        diisi_oleh=joko.id,
        dikirim_pada=f.sekarang() - timedelta(days=1),
    )
    for nomor, i in enumerate(item):
        tidak = nomor == 3  # contoh satu temuan: dispenser bocor
        lembar.jawaban.append(
            ChecklistJawaban(
                item_id=i.id,
                sesi="Harian",
                status="Tidak" if tidak else "Ya",
                catatan="Dispenser lantai 2 menetes, sudah dilaporkan ke admin." if tidak else "",
            )
        )
    db.add(lembar)


def main() -> None:
    with SesiLokal() as db:
        akun = buat_akun(db)
        buat_checklist(db)
        if "--kosong" not in sys.argv:
            buat_contoh(db, akun)
            contoh_checklist(db, akun)
        db.commit()
    print("Selesai.")
    print(f"Semua akun baru memakai kata sandi: {SANDI_AWAL}")
    print(f"Super admin: {SUPER['email']}")
    print("SEGERA ganti kata sandi ini kalau dipakai di server sungguhan.")


if __name__ == "__main__":
    main()
