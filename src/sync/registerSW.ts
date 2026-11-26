/**
 * service worker（public/sw.js：通知と、電波がないときに開けるようにする）を登録する。
 * 対応していない端末や登録に失敗したときは、何もせずアプリはそのまま動かす。
 *
 * main.tsx はログインのキーを待ってから（最大3秒）ここを呼ぶので、そのころにはページの load が
 * 終わっていることがある。終わっていれば、すぐに登録する（load を待つと、いつまでも登録されない）
 */
export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return
  const register = () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // 通知・電波がないときに開く機能が使えなくなるだけなので、画面には出さない
    })
  }
  if (document.readyState === 'complete') register()
  else window.addEventListener('load', register, { once: true })
}
