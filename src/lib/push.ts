/**
 * Notifikasi Web Push di perangkat ini.
 *
 * Alur: daftarkan /sw.js → minta izin → pushManager.subscribe() memakai kunci
 * publik VAPID dari backend → kirim langganannya ke POST /api/push/langganan.
 * Notifikasi tetap muncul walau tab aplikasi ditutup (selama browsernya hidup).
 */
import { api } from '@/lib/api'

export type StatusPush =
  /** browser tidak mendukung (mis. Safari iPhone di luar layar utama) */
  | 'tidak-didukung'
  /** pengguna menolak izin; hanya bisa dibuka lagi dari pengaturan browser */
  | 'ditolak'
  /** server belum punya kunci VAPID */
  | 'server-mati'
  | 'mati'
  | 'aktif'

export function didukung(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

/** Dipanggil sekali saat aplikasi dimuat. */
export function daftarkanServiceWorker() {
  if (!didukung()) return
  navigator.serviceWorker.register('/sw.js').catch(() => {
    /* tanpa service worker, push saja yang tidak jalan */
  })
}

async function langgananSekarang(): Promise<PushSubscription | null> {
  const reg = await navigator.serviceWorker.getRegistration()
  return (await reg?.pushManager.getSubscription()) ?? null
}

export async function bacaStatus(): Promise<StatusPush> {
  if (!didukung()) return 'tidak-didukung'
  if (Notification.permission === 'denied') return 'ditolak'
  const { kunci } = await api<{ kunci: string }>('/api/push/kunci')
  if (!kunci) return 'server-mati'
  const l = await langgananSekarang()
  if (!l || Notification.permission !== 'granted') return 'mati'
  // Pastikan backend tetap mengenal perangkat ini atas nama pengguna yang sedang masuk.
  await simpanKeServer(l)
  return 'aktif'
}

/** 'BAbc-_…' (base64url) → byte, bentuk yang diminta pushManager.subscribe(). */
function keByte(b64url: string): Uint8Array<ArrayBuffer> {
  const b64 = (b64url + '='.repeat((4 - (b64url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  const teks = atob(b64)
  const hasil = new Uint8Array(new ArrayBuffer(teks.length))
  for (let i = 0; i < teks.length; i++) hasil[i] = teks.charCodeAt(i)
  return hasil
}

function namaPerangkat(): string {
  const ua = navigator.userAgent
  const browser = /Edg\//.test(ua) ? 'Edge' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Browser'
  const sistem = /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Mac OS X/.test(ua) ? 'macOS' : /Windows/.test(ua) ? 'Windows' : /Linux/.test(ua) ? 'Linux' : ''
  return [browser, sistem].filter(Boolean).join(' di ')
}

async function simpanKeServer(l: PushSubscription) {
  const json = l.toJSON()
  await api('/api/push/langganan', 'POST', { endpoint: json.endpoint, keys: json.keys, perangkat: namaPerangkat() })
}

/** Batas tunggu langkah berlangganan, supaya tombol tidak tertahan selamanya. */
const BATAS_AKTIFKAN_MS = 10_000

function denganBatas<T>(janji: Promise<T>, ms: number, pesan: string): Promise<T> {
  let t: number | undefined
  const habis = new Promise<never>((_, gagal) => {
    t = window.setTimeout(() => gagal(new Error(pesan)), ms)
  })
  return Promise.race([janji, habis]).finally(() => window.clearTimeout(t))
}

/** Minta izin lalu berlangganan. Melempar galat berisi pesan bila gagal. */
export async function aktifkan(): Promise<StatusPush> {
  if (!didukung()) return 'tidak-didukung'
  // Dialog izin menunggu pengguna, jadi tidak ikut dibatasi waktunya.
  const izin = await Notification.requestPermission()
  if (izin === 'denied') return 'ditolak'
  if (izin !== 'granted') return 'mati'

  return denganBatas(
    berlangganan(),
    BATAS_AKTIFKAN_MS,
    'Notifikasi gagal diaktifkan: browser tidak merespons dalam 10 detik. ' +
      'Periksa koneksi internet, muat ulang halaman, lalu coba lagi.',
  )
}

async function berlangganan(): Promise<StatusPush> {
  const { kunci } = await api<{ kunci: string }>('/api/push/kunci')
  if (!kunci) return 'server-mati'
  const reg = await navigator.serviceWorker.ready
  let l = await reg.pushManager.getSubscription()
  // Langganan lama dengan kunci server berbeda tidak akan bisa menerima push.
  if (l && l.options.applicationServerKey) {
    const lama = new Uint8Array(l.options.applicationServerKey)
    const baru = keByte(kunci)
    if (lama.length !== baru.length || lama.some((b, i) => b !== baru[i])) {
      await l.unsubscribe()
      l = null
    }
  }
  l ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keByte(kunci) })
  await simpanKeServer(l)
  return 'aktif'
}

/** Berhenti menerima push di perangkat ini. */
export async function matikan(): Promise<StatusPush> {
  const l = didukung() ? await langgananSekarang() : null
  if (l) {
    await api('/api/push/langganan', 'DELETE', { endpoint: l.endpoint }).catch(() => {})
    await l.unsubscribe()
  }
  return didukung() ? 'mati' : 'tidak-didukung'
}

/**
 * Dipanggil saat keluar: perangkat ini berhenti menerima notifikasi untuk
 * akun tersebut (penting di komputer yang dipakai bergantian). Tidak pernah
 * melempar galat supaya proses keluar tetap jalan.
 */
export async function lepasSaatKeluar() {
  try {
    await matikan()
  } catch {
    /* abaikan */
  }
}
