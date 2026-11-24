/**
 * /api/device の中身：通知の端末に、ログインした人のユーザー ID を付ける・外す（応援を通知で届けるため）。
 * 端末の secret とログインの両方が合ったときだけ。
 */
import { z } from 'zod'
import { UNAUTHORIZED, type SocialDeps } from './account.js'
import { secretMatches } from './auth.js'
import type { Result } from './handlers.js'
import { RATE_LIMITED, allowed } from './rateLimit.js'

export const deviceSchema = z.strictObject({
  deviceId: z.uuid(),
  secret: z.string().min(32).max(128),
})

type Checked = { ok: false; result: Result } | { ok: true; me: string; deviceId: string }

async function check(
  token: string | null,
  input: unknown,
  { db, identity, limiter }: SocialDeps,
): Promise<Checked> {
  const me = token ? await identity.verify(token) : null
  if (!me) return { ok: false, result: UNAUTHORIZED }
  if (!(await allowed(limiter, 'device', me))) return { ok: false, result: RATE_LIMITED }
  const parsed = deviceSchema.safeParse(input)
  if (!parsed.success)
    return { ok: false, result: { status: 400, body: { error: 'invalid input' } } }
  const hash = await db.deviceSecretHash(parsed.data.deviceId)
  if (!hash || !secretMatches(parsed.data.secret, hash)) {
    return { ok: false, result: { status: 404, body: { error: 'device not found' } } }
  }
  return { ok: true, me, deviceId: parsed.data.deviceId }
}

/** POST /api/device：この端末にログインした人を付ける */
export async function linkDevice(
  token: string | null,
  input: unknown,
  deps: SocialDeps,
): Promise<Result> {
  const c = await check(token, input, deps)
  if (!c.ok) return c.result
  await deps.db.linkDevice(c.deviceId, c.me)
  return { status: 200, body: { ok: true } }
}

/** DELETE /api/device：ログアウトするとき、この端末から外す */
export async function unlinkDevice(
  token: string | null,
  input: unknown,
  deps: SocialDeps,
): Promise<Result> {
  const c = await check(token, input, deps)
  if (!c.ok) return c.result
  await deps.db.unlinkDevice(c.deviceId, c.me)
  return { status: 200, body: { ok: true } }
}
