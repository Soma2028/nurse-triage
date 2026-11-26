/*
 * service worker：通知を受け取るのと、電波がないときでもアプリを開けるようにする。
 *
 * 端末に覚えるのは次の3つだけ（API・ほかのサイトには手を出さない）。
 * - ページを開くとき（navigate）：まず電波で取り、取れたら覚える。取れない・遅いときは覚えたものを出す
 *   （電波があるときはいつも新しい index.html を使うので、古い画面が残らない）
 * - /assets/ のファイル：名前に版の番号が入っていて中身が変わらないので、一度取れば覚えたものを使う
 * - アイコン・manifest などの決まったファイル：覚えたものをすぐ出し、裏で新しくする
 *
 * 新しい版の確認（src/sync/updateCheck.ts の fetch('/')）はページを開くリクエストではないので、
 * ここでは扱わず、いつも電波で取る。
 */

const PAGES = 'pages-v1'
const ASSETS = 'assets-v1'
const STATIC = 'static-v1'
const KEEP = [PAGES, ASSETS, STATIC]
/** /assets/ のファイルを覚えておく数（古い版のファイルから消す） */
const MAX_ASSETS = 80
/** ページを開くとき、これより遅ければ覚えたものを出す（ms） */
const NAVIGATE_TIMEOUT = 4000
const STATIC_FILES = [
  '/manifest.webmanifest',
  '/favicon.svg',
  '/apple-touch-icon.png',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-512.png',
]

// 新しい sw.js が来たら、待たずに入れ替える
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      // はじめの画面とアイコンを先に覚えておく（失敗しても、開いたときに覚える）
      try {
        const pages = await caches.open(PAGES)
        const page = await fetch(new Request('/', { cache: 'reload' }))
        if (page.ok) {
          await pages.put('/', page.clone())
          await rememberAssetsOf(await page.text())
        }
        const files = await caches.open(STATIC)
        await files.addAll(STATIC_FILES)
      } catch {
        // 電波がないときなど
      }
      await self.skipWaiting()
    })(),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // 前の版の入れ物を消す
      const names = await caches.keys()
      await Promise.all(names.filter((n) => !KEEP.includes(n)).map((n) => caches.delete(n)))
      await self.clients.claim()
    })(),
  )
})

/** 古いものから消して、数を上限までにする */
async function trim(cache, max) {
  const keys = await cache.keys()
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i])
}

/** index.html が読み込む /assets/ のファイルも覚えておく（初めて開いたあと、すぐ電波がなくなっても開けるように） */
async function rememberAssetsOf(html) {
  const urls = [...new Set(html.match(/\/assets\/[\w.-]+\.(?:js|css)/g) ?? [])]
  const cache = await caches.open(ASSETS)
  for (const u of urls) {
    if (!(await cache.match(u))) {
      try {
        await cache.add(u)
      } catch {
        // 取れなければ、次に開いたときに覚える
      }
    }
  }
  await trim(cache, MAX_ASSETS)
}

/** ページ：電波を先に。だめなら覚えた index.html（どのアドレスでも中身は同じ） */
async function navigate(request) {
  const cache = await caches.open(PAGES)
  try {
    const response = await Promise.race([
      fetch(request),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), NAVIGATE_TIMEOUT)),
    ])
    if (response.ok) {
      await cache.put('/', response.clone())
      response
        .clone()
        .text()
        .then(rememberAssetsOf)
        .catch(() => {})
    }
    return response
  } catch {
    const cached = await cache.match('/')
    if (cached) return cached
    throw new Error('offline')
  }
}

/** /assets/：覚えたものを先に。なければ取って覚える */
async function asset(request) {
  const cache = await caches.open(ASSETS)
  const cached = await cache.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok) {
    await cache.put(request, response.clone())
    await trim(cache, MAX_ASSETS)
  }
  return response
}

/** 決まったファイル：覚えたものをすぐ出し、裏で新しくする */
async function staticFile(event) {
  const cache = await caches.open(STATIC)
  const cached = await cache.match(event.request)
  const refresh = fetch(event.request)
    .then((response) => {
      if (response.ok) return cache.put(event.request, response.clone()).then(() => response)
      return response
    })
    .catch(() => cached)
  if (cached) {
    event.waitUntil(refresh)
    return cached
  }
  return refresh
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/')) return

  if (request.mode === 'navigate') {
    event.respondWith(navigate(request))
  } else if (url.pathname.startsWith('/assets/')) {
    event.respondWith(asset(request))
  } else if (STATIC_FILES.includes(url.pathname)) {
    event.respondWith(staticFile(event))
  }
  // それ以外（新しい版の確認の fetch('/') など）は、いつもどおり電波で取る
})

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
