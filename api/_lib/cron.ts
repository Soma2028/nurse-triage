/**
 * 15分ごとに cron-job.org から呼ばれ、送るべき通知を送る。
 * 送る前に sent へ記録して（取れなければほかの cron が担当）、二重に送らないようにする。
 */
import { createHash, timingSafeEqual } from 'node:crypto'
import type { Db, PushTarget, SentRef } from './db.js'
import type { PushResult, SendPush } from './push.js'
import { pendingNotices, type Notice } from './schedule.js'

const HOUR_S = 60 * 60
/** 送信記録を残す期間（締切を変えたときの送り直し判定に使うのは直近だけ） */
export const SENT_RETENTION_MS = 30 * 24 * 60 * 60 * 1000

export interface CronSummary {
  devices: number // 宛先のある端末
  notices: number // 送ろうとした通知
  sent: number // 1つ以上の宛先に届けた通知
  failed: number // どこにも届けられなかった通知
  removed: number // 「もうない」と言われて消した宛先
}

/** Authorization: Bearer <CRON_SECRET> か。長さの違いで中身を推測されないよう、ハッシュどうしを比べる */
export function cronAuthorized(header: string | null, secret: string): boolean {
  if (!header?.startsWith('Bearer ') || !secret) return false
  const a = createHash('sha256').update(header.slice('Bearer '.length)).digest()
  const b = createHash('sha256').update(secret).digest()
  return timingSafeEqual(a, b)
}

/** push サービスに預けておく時間。締切を過ぎた通知は届いても意味がないので、締切まで */
export function ttlFor(n: Notice, now: number): number {
  if (n.kind === 'morning') return 3 * HOUR_S
  const untilDue = Math.floor((n.due - now) / 1000)
  return Math.max(60, Math.min(untilDue, 12 * HOUR_S))
}

export async function runCron(
  now: number,
  { db, sendPush }: { db: Db; sendPush: SendPush },
): Promise<CronSummary> {
  const summary: CronSummary = { devices: 0, notices: 0, sent: 0, failed: 0, removed: 0 }
  const targets = await db.listCronTargets(now)
  summary.devices = targets.length

  for (const t of targets) {
    try {
      let live: PushTarget[] = [...t.subscriptions]
      for (const n of pendingNotices(t.reminders, t.prefs, now, t.sent)) {
        if (live.length === 0) break
        const ref: SentRef = { deviceId: t.deviceId, taskId: n.taskId, kind: n.kind, due: n.due }
        if (!(await db.claimSent(ref))) continue
        summary.notices++

        const results: PushResult[] = await Promise.all(
          live.map((s) =>
            sendPush(
              s,
              { title: n.title, body: n.body, tag: n.tag, url: '/' },
              {
                ttlSeconds: ttlFor(n, now),
              },
            ),
          ),
        )
        const gone = live.filter((_, i) => results[i] === 'gone')
        for (const s of gone) await db.deleteSubscriptionByEndpoint(s.endpoint)
        summary.removed += gone.length
        live = live.filter((_, i) => results[i] !== 'gone')

        if (results.includes('ok')) {
          summary.sent++
        } else {
          summary.failed++
          // 一時的な失敗なら記録を取り消し、60分の枠の中で次の cron がもう一度送る
          if (results.includes('error')) await db.releaseSent(ref)
        }
      }
    } catch (e) {
      // 1台の失敗で、ほかの端末の通知を止めない
      console.error('cron: 端末の処理に失敗', e)
      summary.failed++
    }
  }

  await db.pruneSent(now - SENT_RETENTION_MS)
  return summary
}
