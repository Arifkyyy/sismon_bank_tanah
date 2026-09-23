/**
 * Satu-satunya pintu frontend ke backend.
 *
 * - Alamat backend dibaca dari VITE_API_URL di berkas .env.
 * - Token login disimpan di localStorage ("Ingat perangkat ini" dicentang)
 *   atau sessionStorage (hilang saat browser ditutup).
 * - Setiap panggilan otomatis membawa token di header Authorization.
 * - Kalau backend menjawab 401 (token habis/salah), sesi dihapus dan
 *   AuthContext diberi tahu lewat event 'sesi-habis' supaya kembali ke login.
 */

export const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:8000').replace(/\/$/, '')

const KUNCI_TOKEN = 'sismon_token'

export function ambilToken(): string | null {
  try {
    return localStorage.getItem(KUNCI_TOKEN) ?? sessionStorage.getItem(KUNCI_TOKEN)
  } catch {
    return null
  }
}

export function simpanToken(token: string, ingat: boolean) {
  hapusToken()
  try {
    ;(ingat ? localStorage : sessionStorage).setItem(KUNCI_TOKEN, token)
  } catch {
    /* browser menolak penyimpanan: sesi hanya bertahan sampai halaman dimuat ulang */
  }
}

export function hapusToken() {
  try {
    localStorage.removeItem(KUNCI_TOKEN)
    sessionStorage.removeItem(KUNCI_TOKEN)
  } catch {
    /* abaikan */
  }
}

/** Galat dari backend, pesannya sudah siap ditampilkan ke pengguna. */
export class GalatApi extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message)
  }
}

type Metode = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export async function api<T = unknown>(path: string, metode: Metode = 'GET', isi?: unknown): Promise<T> {
  const token = ambilToken()
  let jawab: Response
  try {
    jawab = await fetch(`${API_URL}${path}`, {
      method: metode,
      headers: {
        ...(isi !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: isi !== undefined ? JSON.stringify(isi) : undefined,
    })
  } catch {
    throw new GalatApi('Tidak bisa terhubung ke server. Pastikan backend sudah berjalan.', 0)
  }

  if (jawab.status === 401 && token) {
    hapusToken()
    window.dispatchEvent(new Event('sesi-habis'))
  }

  if (!jawab.ok) {
    let pesan = `Terjadi kesalahan (${jawab.status}).`
    try {
      const data = await jawab.json()
      if (typeof data?.detail === 'string') pesan = data.detail
    } catch {
      /* badan jawaban bukan JSON */
    }
    throw new GalatApi(pesan, jawab.status)
  }

  if (jawab.status === 204) return undefined as T
  return (await jawab.json()) as T
}

/** Menyusun query string, melewati nilai kosong. */
export function query(isi: Record<string, string | number | undefined | null>): string {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(isi)) {
    if (v !== undefined && v !== null && v !== '') q.set(k, String(v))
  }
  const s = q.toString()
  return s ? `?${s}` : ''
}

/** Pesan galat apa pun → teks untuk ditampilkan. */
export function pesanGalat(e: unknown): string {
  return e instanceof Error ? e.message : 'Terjadi kesalahan.'
}
