/**
 * Service worker Sismon Bank Tanah — HANYA untuk notifikasi push.
 * Sengaja tidak menyimpan cache halaman supaya perubahan kode langsung terlihat.
 *
 * Isi push dari backend (app/push.py): { judul, tautan, tag }.
 */

// Safari di macOS dan semua browser di iPhone/iPad (semuanya WebKit).
const UA = self.navigator.userAgent
const WEBKIT = /AppleWebKit/.test(UA) && !/Chrome|Chromium|Edg\/|Firefox/.test(UA)

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

self.addEventListener('push', (e) => {
  let isi = {}
  try {
    isi = e.data ? e.data.json() : {}
  } catch {
    isi = {}
  }
  const judul = isi.judul || 'Notifikasi baru'
  const tautan = isi.tautan || '/'
  // Notifikasi uji tidak punya item di lonceng, jadi selalu tampil sebagai
  // notifikasi sistem — kalau tidak, pengguna yang menekan tombol uji tidak melihat apa-apa.
  const uji = typeof isi.tag === 'string' && isi.tag.startsWith('uji')

  const tampilkan = () =>
    self.registration.showNotification(judul, {
      body: 'Ketuk untuk membuka Sismon Bank Tanah.',
      icon: '/ikon-192.png',
      badge: '/ikon-192.png',
      tag: isi.tag,
      // Kabar baru dengan tag sama (mis. kendala Diproses lalu Selesai) tetap berbunyi.
      renotify: Boolean(isi.tag),
      lang: 'id',
      data: { tautan },
    })

  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((tab) => {
      if (uji) return tampilkan()
      // Aplikasi sedang dilihat: cukup minta tab itu memuat ulang notifikasinya,
      // popup di dalam aplikasi yang tampil — tidak perlu notifikasi sistem ganda.
      // Kecuali di Safari/iPhone: push tanpa notifikasi sistem dianggap push diam,
      // dan setelah beberapa kali langganannya dicabut. Di sana selalu tampilkan.
      const dilihat = tab.filter((t) => t.visibilityState === 'visible')
      dilihat.forEach((t) => t.postMessage({ jenis: 'muat-notifikasi' }))
      if (dilihat.length && !WEBKIT) return
      return tampilkan()
    }),
  )
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const tujuan = new URL(e.notification.data?.tautan || '/', self.location.origin).href
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((tab) => {
      // Pakai tab aplikasi yang sudah terbuka bila ada, supaya tidak menumpuk tab baru.
      const ada = tab.find((t) => new URL(t.url).origin === self.location.origin)
      if (!ada) return self.clients.openWindow(tujuan)
      // navigate() ditolak bila tab itu belum dikendalikan service worker ini
      // (mis. setelah Ctrl+Shift+R); saat itu buka tujuannya di jendela baru.
      return ada
        .focus()
        .then((t) => t.navigate(tujuan))
        .catch(() => self.clients.openWindow(tujuan))
    }),
  )
})
