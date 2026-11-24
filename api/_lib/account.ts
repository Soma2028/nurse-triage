/**
 * /api/account の中身。ログインした人だけが、自分のアカウントを消せる。
 */
import type { Identity } from './identity.js'
import type { SendPush } from './push.js'
import type { RateLimiter } from './rateLimit.js'
import type { Result } from './handlers.js'
import type { SocialDb } from './socialDb.js'

export interface SocialDeps {
  db: SocialDb
  identity: Identity
  /** 応援を通知で届ける。VAPID の鍵がなければ無し（応援はアプリの中にだけ出る） */
  sendPush?: SendPush
  /** API の回数制限（なければ数えない） */
  limiter?: RateLimiter
}

export const UNAUTHORIZED: Result = { status: 401, body: { error: 'unauthorized' } }

/**
 * DELETE /api/account：退会。
 * 先にこちらの DB のデータを消し、そのあと Clerk のアカウントを消す（途中で失敗しても、
 * データだけが残って消せなくなることがないように。もう一度押せば続きから消える）
 */
export async function deleteAccount(
  token: string | null,
  { db, identity }: SocialDeps,
): Promise<Result> {
  const userId = token ? await identity.verify(token) : null
  if (!userId) return UNAUTHORIZED
  await db.deleteUserData(userId)
  await identity.deleteUser(userId)
  return { status: 200, body: { ok: true } }
}
