/*
 * 通知を受け取るためだけの service worker。
 * キャッシュはしない（fetch を扱わない）ので、古い画面が残ることはない。
 */

// 新しい sw.js が来たら、待たずに入れ替える
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

// サーバーから届いた通知を出す。中身は { title, body, tag?, url? } の JSON
self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { body: event.data ? event.data.text() : '' }
  }
  const title = data.title || '看護課題トリアージ'
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      tag: data.tag, // 同じ tag の通知は上書きされ、重ならない
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      lang: 'ja',
      data: { url: data.url || '/' },
    }),
  )
})

// 通知をタップしたら、開いているアプリがあればそれを前に出し、なければ開く
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const open = windows.find((w) => new URL(w.url).origin === self.location.origin)
      if (open) return open.focus()
      return self.clients.openWindow(url)
    })(),
  )
})
