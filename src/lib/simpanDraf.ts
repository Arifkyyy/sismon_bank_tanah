/**
 * Penyimpanan draf catatan di perangkat (IndexedDB), supaya foto dan keterangan
 * yang belum terkirim tidak hilang saat halaman dimuat ulang atau tab ditutup
 * HP di latar belakang. localStorage tidak dipakai karena batasnya ±5 MB,
 * sedangkan satu draf bisa berisi beberapa foto.
 *
 * Kuncinya per akun, jadi petugas lain yang masuk di HP yang sama tidak melihat
 * draf orang lain. Semua galat ditelan: kalau penyimpanan tidak tersedia (mis.
 * mode privat), aplikasi tetap jalan seperti sebelumnya, hanya drafnya tidak awet.
 */
const NAMA_DB = 'sismon'
const TOKO = 'draf'

function bukaDb(): Promise<IDBDatabase> {
  return new Promise((selesai, gagal) => {
    const minta = indexedDB.open(NAMA_DB, 1)
    minta.onupgradeneeded = () => minta.result.createObjectStore(TOKO)
    minta.onsuccess = () => selesai(minta.result)
    minta.onerror = () => gagal(minta.error)
  })
}

async function jalankan<T>(mode: IDBTransactionMode, aksi: (toko: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await bukaDb()
  try {
    return await new Promise<T>((selesai, gagal) => {
      const minta = aksi(db.transaction(TOKO, mode).objectStore(TOKO))
      minta.onsuccess = () => selesai(minta.result)
      minta.onerror = () => gagal(minta.error)
    })
  } finally {
    db.close()
  }
}

export async function bacaDraf<T>(kunci: string): Promise<T | undefined> {
  try {
    return await jalankan<T | undefined>('readonly', (t) => t.get(kunci))
  } catch {
    return undefined
  }
}

export async function simpanDraf(kunci: string, isi: unknown): Promise<void> {
  try {
    await jalankan('readwrite', (t) => t.put(isi, kunci))
  } catch {
    // Penyimpanan tidak tersedia atau penuh — draf tetap ada di layar selama halaman terbuka.
  }
}

export async function hapusDraf(kunci: string): Promise<void> {
  try {
    await jalankan('readwrite', (t) => t.delete(kunci))
  } catch {
    // diabaikan
  }
}
