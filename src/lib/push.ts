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

/** Berhenti menerima push di perangkat ini (dimatikan sendiri oleh pengguna). */
export async function matikan(): Promise<StatusPush> {
  lupakanPemulihan()
  await lepas(true)
  return didukung() ? 'mati' : 'tidak-didukung'
}

async function lepas(lewatServer: boolean): Promise<boolean> {
  const l = didukung() ? await langgananSekarang() : null
  if (!l) return false
  if (lewatServer) await api('/api/push/langganan', 'DELETE', { endpoint: l.endpoint }).catch(() => {})
  // Tanpa lewat server pun aman: endpoint yang sudah dilepas dijawab 410 oleh
  // layanan push, lalu barisnya dihapus backend saat pengiriman berikutnya.
  await l.unsubscribe()
  return true
}

/*
 * Notifikasi dilepas setiap kali sesi berakhir, supaya pengguna berikutnya di
 * perangkat yang sama tidak menerima notifikasi akun sebelumnya. Id akun yang
 * melepasnya diingat, sehingga saat akun yang SAMA masuk lagi notifikasinya
 * dinyalakan kembali otomatis; akun lain tetap harus menyalakannya sendiri.
 */
const KUNCI_PULIHKAN = 'sismon_push_pulihkan'

function ingatPemulihan(akunId: number) {
  try {
    localStorage.setItem(KUNCI_PULIHKAN, String(akunId))
  } catch {
    /* tanpa penyimpanan, pengguna menyalakan ulang dari Profil */
  }
}

function lupakanPemulihan() {
  try {
    localStorage.removeItem(KUNCI_PULIHKAN)
  } catch {
    /* abaikan */
  }
}

function perluDipulihkan(akunId: number): boolean {
  try {
    return localStorage.getItem(KUNCI_PULIHKAN) === String(akunId)
  } catch {
    return false
  }
}

/** Batas tunggu pelepasan saat keluar, supaya tombol Keluar tidak tertahan server yang lambat. */
const BATAS_KELUAR_MS = 3_000

/**
 * Dipanggil saat menekan Keluar (token masih ada). Tidak pernah melempar
 * galat dan selesai paling lama 3 detik supaya proses keluar tetap jalan.
 */
export async function lepasSaatKeluar(akunId: number | null) {
  try {
    const dilepas = await denganBatas(lepas(true), BATAS_KELUAR_MS, 'lewat batas')
    if (dilepas && akunId !== null) ingatPemulihan(akunId)
  } catch {
    /* abaikan */
  }
}

/** Dipanggil saat token ditolak server: tokennya sudah terhapus, jadi cukup lepas di browser. */
export async function lepasSaatSesiHabis(akunId: number | null) {
  try {
    const dilepas = await lepas(false)
    if (dilepas && akunId !== null) ingatPemulihan(akunId)
  } catch {
    /* abaikan */
  }
}

/**
 * Dipanggil setelah berhasil masuk. Sisa langganan sesi lain (bila pelepasan
 * dulu gagal) dibuang; bila akun ini dulu menyalakan notifikasi di perangkat
 * ini, langganannya dibuat lagi tanpa bertanya, karena izinnya masih ada.
 */
export async function pulihkanSetelahMasuk(akunId: number) {
  try {
    if (!didukung()) return
    await lepas(false)
    if (!perluDipulihkan(akunId) || Notification.permission !== 'granted') return
    if ((await denganBatas(berlangganan(), BATAS_AKTIFKAN_MS, 'lewat batas')) === 'aktif') lupakanPemulihan()
  } catch {
    /* pengguna masih bisa menyalakannya dari Profil */
  }
}

/** Untuk ajakan di lonceng: browser mendukung, izin belum ditolak, tapi perangkat ini belum berlangganan. */
export async function bolehDiajakAktifkan(): Promise<boolean> {
  if (!didukung() || Notification.permission === 'denied') return false
  return (await langgananSekarang()) === null
}
