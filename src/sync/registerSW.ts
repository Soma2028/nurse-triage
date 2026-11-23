/**
 * 通知用の service worker（public/sw.js）を登録する。
 * 対応していない端末や登録に失敗したときは、何もせずアプリはそのまま動かす。
 */
export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // 通知が使えなくなるだけなので、画面には出さない
    })
  })
}
