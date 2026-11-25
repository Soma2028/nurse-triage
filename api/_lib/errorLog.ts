/**
 * サーバーのエラーの記録と、持ち主への知らせ。
 * API が 500 を返したら api_errors に1行残し（中身は残さない。どの API か・番号・DB のエラーの種類だけ）、
 * 15分ごとの cron が、まだ知らせていないエラーがあれば持ち主（ERROR_ALERT_USER_ID）の端末に通知を送る。
 * テーブル（migrations/006_api_errors.sql）がなくても、記録しないだけで API は止まらない
 */
import type { PushTarget } from './db.js'
import type { SendPush } from './push.js'
import type { SqlTag } from './socialDb.js'

/** 記録を残す日数 */
const KEEP_DAYS = 30

export interface ErrorLog {
  record(route: string, status: number, code?: string): Promise<void>
  /** まだ知らせていないエラーの数を数え、知らせたことにする（その数を返す） */
  takeUnalerted(): Promise<number>
  /** 古い記録を消す */
  prune(now: number): Promise<void>
}

export function sqlErrorLog(sql: SqlTag): ErrorLog {
  return {
    async record(route, status, code) {
      try {
        await sql`insert into api_errors (route, status, code) values (${route}, ${status}, ${code ?? null})`
      } catch (e) {
        // テーブルがない・DB につながらないときは、ログに出すだけ
        console.error('[api-error] 記録できなかった', (e as { code?: string }).code ?? e)
      }
    },
    async takeUnalerted() {
      try {
        const rows = await sql`
          update api_errors set alerted = true where not alerted returning id`
        return rows.length
      } catch {
        return 0
      }
    },
    async prune(now) {
      try {
        const before = new Date(now - KEEP_DAYS * 24 * 60 * 60 * 1000).toISOString()
        await sql`delete from api_errors where at < ${before}::timestamptz`
      } catch {
        // なければ何もしない
      }
    },
  }
}

/** 知らせるときの文面 */
export function alertMessage(count: number) {
  return {
    title: 'サーバーでエラーがあったよ',
    body: `${count}件。Vercel のログで「[api-error]」を探してね。`,
    tag: 'api-error',
    url: '/',
  }
}

/**
 * まだ知らせていないエラーがあれば、持ち主の端末すべてに通知する。送った数を返す。
 * 持ち主の端末が見つからなくても、知らせたことにする（同じエラーで何度も試さない）
 */
export async function alertOwner(
  log: ErrorLog,
  targets: () => Promise<PushTarget[]>,
  sendPush: SendPush,
): Promise<number> {
  const count = await log.takeUnalerted()
  if (count === 0) return 0
  const list = await targets()
  await Promise.all(list.map((t) => sendPush(t, alertMessage(count), { ttlSeconds: 24 * 60 * 60 })))
  return count
}
