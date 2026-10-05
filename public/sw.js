/**
 * Service worker Sismon Bank Tanah — HANYA untuk notifikasi push.
 * Sengaja tidak menyimpan cache halaman supaya perubahan kode langsung terlihat.
 *
 * Isi push dari backend (app/push.py): { judul, tautan, tag }.
 */

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
      lang: 'id',
      data: { tautan },
    })

  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((tab) => {
      if (uji) return tampilkan()
      // Aplikasi sedang dilihat: cukup minta tab itu memuat ulang notifikasinya,
      // popup di dalam aplikasi yang tampil — tidak perlu notifikasi sistem ganda.
      const dilihat = tab.filter((t) => t.visibilityState === 'visible')
      if (dilihat.length) {
        dilihat.forEach((t) => t.postMessage({ jenis: 'muat-notifikasi' }))
        return
      }
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
      if (ada) return ada.focus().then((t) => t.navigate(tujuan))
      return self.clients.openWindow(tujuan)
    }),
  )
})
