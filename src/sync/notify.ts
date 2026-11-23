/**
 * 通知のオン・オフ・テスト送信と、開いたときの点検。
 * どれも失敗してもアプリの表示や操作は止めない（結果を返すだけ）。
 */
import { subscribeRemote, testRemote, unsubscribeRemote } from './api'
import { getPushState, newCredentials, setPushState } from './pushState'
import { vapidKeyToBytes } from './support'

/** ビルド時に入れた公開鍵。入っていなければ、サーバーに聞く（/api/vapid-key） */
const BUILT_VAPID_KEY: string | undefined = import.meta.env.VITE_VAPID_PUBLIC_KEY || undefined

async function vapidPublicKey(): Promise<string> {
  if (BUILT_VAPID_KEY) return BUILT_VAPID_KEY
  const res = await fetch('/api/vapid-key')
  const data = (await res.json()) as { publicKey?: unknown }
  if (!res.ok || typeof data.publicKey !== 'string') throw new Error('公開鍵を取れない')
  return data.publicKey
}

const READY_TIMEOUT_MS = 10_000

/** 通知用の service worker が動き出すまで待つ */
async function readyRegistration(): Promise<ServiceWorkerRegistration> {
  const sw = navigator.serviceWorker
  if (!(await sw.getRegistration())) await sw.register('/sw.js')
  return Promise.race([
    sw.ready,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('service worker が動かない')), READY_TIMEOUT_MS),
    ),
  ])
}

/** 鍵が同じ宛先か（鍵を作り直したあとの古い宛先には届かない） */
function sameKey(sub: PushSubscription, key: Uint8Array): boolean {
  const k = sub.options?.applicationServerKey
  if (!k) return true
  const a = new Uint8Array(k)
  return a.length === key.length && a.every((v, i) => v === key[i])
}

export type EnableResult = 'ok' | 'not-granted' | 'failed'

/**
 * 通知を受け取る。ボタンのタップから直接呼ぶこと（iOS は、タップの中でしか許可のダイアログを出せない）。
 */
export async function enableNotifications(): Promise<EnableResult> {
  // ここより前に await を置かない
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return 'not-granted'

  try {
    const [reg, publicKey] = await Promise.all([readyRegistration(), vapidPublicKey()])
    const key = vapidKeyToBytes(publicKey)
    let sub = await reg.pushManager.getSubscription()
    if (sub && !sameKey(sub, key)) {
      await sub.unsubscribe()
      sub = null
    }
    sub ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key })

    const state = getPushState()
    let creds =
      state.deviceId && state.secret
        ? { deviceId: state.deviceId, secret: state.secret }
        : newCredentials()
    let r = await subscribeRemote(creds, sub.toJSON(), state.prefs)
    if (r.status === 401) {
      // サーバーの端末と名札が合わない（ほぼ起きない）。名札を作り直して1回だけやり直す
      creds = newCredentials()
      r = await subscribeRemote(creds, sub.toJSON(), state.prefs)
    }
    if (!r.ok) return 'failed'

    // synced を空にして、すぐ課題を送らせる
    setPushState({ ...creds, enabled: true, endpoint: sub.endpoint, synced: null, lost: false })
    return 'ok'
  } catch (e) {
    console.error('通知の登録に失敗', e)
    return 'failed'
  }
}

/** 通知をやめる。端末の登録を外し、サーバーの端末データも丸ごと消す */
export async function disableNotifications(): Promise<void> {
  const { deviceId, secret, endpoint: saved } = getPushState()
  let endpoint = saved
  try {
    const sub = await (
      await navigator.serviceWorker.getRegistration()
    )?.pushManager.getSubscription()
    if (sub) {
      endpoint = sub.endpoint
      await sub.unsubscribe()
    }
  } catch {
    // 端末側で外せなくても、サーバー側は消す
  }

  // 名札も捨てる（次にオンにしたときは新しい端末として登録する）
  setPushState({ enabled: false, endpoint: null, synced: null, deviceId: null, secret: null })
  if (deviceId && secret && endpoint) {
    const pending = { deviceId, secret, endpoint }
    const r = await unsubscribeRemote(pending, endpoint)
    // 401 はもう消えているということ。それ以外の失敗は、次に開いたときにやり直す
    if (!r.ok && r.status !== 401) setPushState({ pendingDelete: pending })
  }
}

export type TestResult = 'sent' | 'none' | 'failed'

export async function sendTestNotification(): Promise<TestResult> {
  const { deviceId, secret } = getPushState()
  if (!deviceId || !secret) return 'failed'
  const r = await testRemote({ deviceId, secret })
  if (!r.ok) return 'failed'
  return Number(r.data?.sent) > 0 ? 'sent' : 'none'
}

/**
 * アプリを開いたときの点検：消しきれなかったサーバーのデータを消す・端末の登録が残っているか確かめる。
 */
export async function checkOnOpen(): Promise<void> {
  const { pendingDelete } = getPushState()
  if (pendingDelete) {
    const r = await unsubscribeRemote(pendingDelete, pendingDelete.endpoint)
    if (r.ok || r.status === 401) setPushState({ pendingDelete: null })
  }

  const { enabled, deviceId, secret, endpoint, prefs } = getPushState()
  if (!enabled || !deviceId || !secret || !('serviceWorker' in navigator)) return
  try {
    const sub = await (
      await navigator.serviceWorker.getRegistration()
    )?.pushManager.getSubscription()
    if (!sub) {
      // 端末側の登録が消えていた（iOS が消すことがある）。サーバーの分も消して、もう一度オンにしてもらう
      setPushState({ enabled: false, endpoint: null, synced: null, lost: true })
      if (endpoint) {
        const r = await unsubscribeRemote({ deviceId, secret }, endpoint)
        if (!r.ok && r.status !== 401) {
          setPushState({ pendingDelete: { deviceId, secret, endpoint } })
        }
      }
      return
    }
    if (sub.endpoint !== endpoint) {
      // 宛先が変わっていたら登録し直す
      const r = await subscribeRemote({ deviceId, secret }, sub.toJSON(), prefs)
      if (r.ok) setPushState({ endpoint: sub.endpoint })
    }
  } catch {
    // 点検できなくても、アプリはそのまま使える
  }
}
