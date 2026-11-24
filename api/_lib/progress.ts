/**
 * 今日の進み具合（SPEC-social.md の 5）：/api/progress の中身。
 * 受け取るのは数だけ（今日完了にした数・赤の数）。課題名・種類・締切は受け取らない。
 */
import { z } from 'zod'
import { UNAUTHORIZED, type SocialDeps } from './account.js'
import type { Result } from './handlers.js'
import { RATE_LIMITED, allowed } from './rateLimit.js'

const count = z.number().int().min(0).max(999)

export const progressSchema = z.strictObject({
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  doneCount: count,
  redCount: count,
})

export const shareSchema = z.strictObject({ share: z.boolean() })

const fail = (status: number, error: string): Result => ({ status, body: { error } })

/** PUT /api/progress：今日の進み具合を置く。見せない設定なら置かない */
export async function putProgress(
  token: string | null,
  input: unknown,
  { db, identity, limiter }: SocialDeps,
): Promise<Result> {
  const me = token ? await identity.verify(token) : null
  if (!me) return UNAUTHORIZED
  if (!(await allowed(limiter, 'progress', me))) return RATE_LIMITED
  const parsed = progressSchema.safeParse(input)
  if (!parsed.success) return fail(400, 'invalid input')
  const profile = await db.getProfile(me)
  if (!profile) return fail(409, 'no_profile')
  if (!profile.shareProgress) return { status: 200, body: { ok: true, stored: false } }
  await db.saveProgress(me, parsed.data)
  return { status: 200, body: { ok: true, stored: true } }
}

/** PATCH /api/progress：見せるかどうかを切り替える。やめたら置いてある進み具合も消す */
export async function patchShare(
  token: string | null,
  input: unknown,
  { db, identity, limiter }: SocialDeps,
): Promise<Result> {
  const me = token ? await identity.verify(token) : null
  if (!me) return UNAUTHORIZED
  if (!(await allowed(limiter, 'progress', me))) return RATE_LIMITED
  const parsed = shareSchema.safeParse(input)
  if (!parsed.success) return fail(400, 'invalid input')
  if (!(await db.getProfile(me))) return fail(409, 'no_profile')
  await db.setShareProgress(me, parsed.data.share)
  return { status: 200, body: { profile: await db.getProfile(me) } }
}
