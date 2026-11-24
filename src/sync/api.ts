/**
 * 通知の API（/api/*）を呼ぶ。失敗しても例外は投げず、status 0（つながらない）などで返す。
 */
import type { NotifyPrefs } from './pushState'
import type { SyncBody } from './payload'

export interface ApiResult {
  ok: boolean
  status: number // 0 はネットワークにつながらなかった
  data: Record<string, unknown> | null
}

interface Credentials {
  deviceId: string
  secret: string
}

async function call(method: 'POST' | 'DELETE', path: string, body: unknown): Promise<ApiResult> {
  try {
    const res = await fetch(path, {
      method,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    let data: Record<string, unknown> | null = null
    try {
      data = (await res.json()) as Record<string, unknown>
    } catch {
      // 本文がなくてもよい
    }
    return { ok: res.ok, status: res.status, data }
  } catch {
    return { ok: false, status: 0, data: null }
  }
}

export const subscribeRemote = (
  c: Credentials,
  subscription: PushSubscriptionJSON,
  settings: NotifyPrefs,
) => call('POST', '/api/subscribe', { ...c, subscription, settings })

export const unsubscribeRemote = (c: Credentials, endpoint: string) =>
  call('DELETE', '/api/subscribe', { ...c, endpoint })

export const syncRemote = (c: Credentials, body: SyncBody) =>
  call('POST', '/api/sync', { ...c, ...body })
