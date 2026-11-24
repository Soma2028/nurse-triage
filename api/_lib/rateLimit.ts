/**
 * API の回数制限。時間の区切り（windowSec）ごとに、key ごとの回数を数える。
 * 数えられないとき（テーブルがない・DB の不調）は、アプリを止めないよう通す（ログには残す）。
 */
import { neon } from '@neondatabase/serverless'

export interface RateLimiter {
  /** 1回数えて、まだ max 回以内なら true。超えたら false */
  allow(key: string, max: number, windowSec: number): Promise<boolean>
  /** 古い記録を消す */
  prune(before: number): Promise<void>
}

/** 制限の決まり（1時間あたり） */
export const LIMITS = {
  /** フレンドコードを使う操作（申請・招待を調べる）。総当たりで探されないように */
  code: { max: 20, windowSec: 3600 },
  /** そのほかのフレンドの操作（承認・断る・ブロック・応援など） */
  friends: { max: 120, windowSec: 3600 },
  profile: { max: 30, windowSec: 3600 },
  progress: { max: 300, windowSec: 3600 },
  device: { max: 30, windowSec: 3600 },
  /** 通知の登録（ログインがないので、接続元ごと） */
  subscribe: { max: 20, windowSec: 3600 },
  /** 課題の同期（接続元ごと） */
  sync: { max: 600, windowSec: 3600 },
} as const

export type LimitName = keyof typeof LIMITS

export const RATE_LIMITED = { status: 429, body: { error: 'rate_limited' } }

export function neonRateLimiter(databaseUrl: string): RateLimiter {
  const sql = neon(databaseUrl)
  return {
    async allow(key, max, windowSec) {
      const windowMs = windowSec * 1000
      const start = new Date(Math.floor(Date.now() / windowMs) * windowMs).toISOString()
      try {
        const rows = await sql`
          insert into rate_limits (key, window_start, count) values (${key}, ${start}::timestamptz, 1)
          on conflict (key, window_start) do update set count = rate_limits.count + 1
          returning count`
        return (rows[0].count as number) <= max
      } catch (e) {
        console.error('回数制限を数えられなかった（通す）', (e as { code?: string }).code ?? e)
        return true
      }
    },
    async prune(before) {
      try {
        await sql`delete from rate_limits where window_start < ${new Date(before).toISOString()}::timestamptz`
      } catch (e) {
        console.error('回数制限の古い記録を消せなかった', (e as { code?: string }).code ?? e)
      }
    },
  }
}

/** 決まりの名前と相手（ユーザー ID や接続元）で数える */
export function allowed(limiter: RateLimiter | undefined, name: LimitName, who: string) {
  if (!limiter) return Promise.resolve(true)
  const { max, windowSec } = LIMITS[name]
  return limiter.allow(`${name}:${who}`, max, windowSec)
}

/** メモリで数える（テスト用） */
export function memoryRateLimiter(): RateLimiter & { counts: Map<string, number> } {
  const counts = new Map<string, number>()
  return {
    counts,
    async allow(key, max) {
      const n = (counts.get(key) ?? 0) + 1
      counts.set(key, n)
      return n <= max
    },
    async prune() {
      counts.clear()
    },
  }
}

/** 接続元の IP（Vercel が x-forwarded-for に入れる）。わからなければ 'unknown' */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return forwarded || headers.get('x-real-ip') || 'unknown'
}
