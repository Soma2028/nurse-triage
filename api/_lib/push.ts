/**
 * Web プッシュの送信（web-push・VAPID）。
 */
import { WebPushError, sendNotification } from 'web-push'
import type { PushTarget } from './db.js'

export interface VapidKeys {
  subject: string
  publicKey: string
  privateKey: string
}

/** sw.js の push イベントが受け取る中身 */
export interface PushPayload {
  title: string
  body: string
  tag?: string
  url?: string
}

/** ok：届けた／gone：宛先がもうない（404・410。消してよい）／error：それ以外の失敗 */
export type PushResult = 'ok' | 'gone' | 'error'

export type SendPush = (
  target: PushTarget,
  payload: PushPayload,
  options?: { ttlSeconds?: number },
) => Promise<PushResult>

export function webPushSender(vapid: VapidKeys): SendPush {
  return async (target, payload, options = {}) => {
    try {
      await sendNotification(
        { endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } },
        JSON.stringify(payload),
        {
          vapidDetails: vapid,
          // 端末がオフラインのとき、push サービスが預かっておく時間
          TTL: options.ttlSeconds ?? 60 * 60,
          urgency: 'high',
          timeout: 10_000,
        },
      )
      return 'ok'
    } catch (e) {
      if (e instanceof WebPushError && (e.statusCode === 404 || e.statusCode === 410)) {
        return 'gone'
      }
      console.error('push failed', e instanceof WebPushError ? e.statusCode : e)
      return 'error'
    }
  }
}
