/**
 * この端末で通知を受け取れるかの判定。
 * iPhone は Safari のままだと通知を受け取れず、ホーム画面に追加して開いたときだけ受け取れる（iOS 16.4 以降）。
 */

export type PushSupport =
  | 'ios-browser' // iPhone・iPad の Safari で開いている（ホーム画面に追加すれば使える）
  | 'unsupported' // この端末・ブラウザでは使えない
  | 'ok'

export interface SupportEnv {
  userAgent: string
  maxTouchPoints: number
  /** iOS のホーム画面から開いているか（navigator.standalone） */
  standalone: boolean
  /** display-mode: standalone（Android・PC でインストールして開いたとき） */
  displayStandalone: boolean
  hasServiceWorker: boolean
  hasPushManager: boolean
  hasNotification: boolean
  hasVapidKey: boolean
}

/** iPhone・iPad か。iPadOS の Safari は Mac のふりをするので、タッチ対応で見分ける */
export function isIOS(env: Pick<SupportEnv, 'userAgent' | 'maxTouchPoints'>): boolean {
  if (/iPhone|iPad|iPod/.test(env.userAgent)) return true
  return /Macintosh/.test(env.userAgent) && env.maxTouchPoints > 1
}

export function detectSupport(env: SupportEnv): PushSupport {
  if (isIOS(env) && !env.standalone && !env.displayStandalone) return 'ios-browser'
  if (!env.hasServiceWorker || !env.hasPushManager || !env.hasNotification || !env.hasVapidKey) {
    return 'unsupported'
  }
  return 'ok'
}

/** いまのブラウザから SupportEnv を集める */
export function currentEnv(vapidKey: string | undefined): SupportEnv {
  const nav = navigator as Navigator & { standalone?: boolean }
  return {
    userAgent: nav.userAgent,
    maxTouchPoints: nav.maxTouchPoints ?? 0,
    standalone: nav.standalone === true,
    displayStandalone: window.matchMedia?.('(display-mode: standalone)').matches ?? false,
    hasServiceWorker: 'serviceWorker' in nav,
    hasPushManager: 'PushManager' in window,
    hasNotification: 'Notification' in window,
    hasVapidKey: !!vapidKey,
  }
}

/** VAPID の公開鍵（URL セーフな base64）を pushManager.subscribe に渡す形にする */
export function vapidKeyToBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const pad = '='.repeat((4 - (base64url.length % 4)) % 4)
  const base64 = (base64url + pad).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const bytes = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
  return bytes
}
