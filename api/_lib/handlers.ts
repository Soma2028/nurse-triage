/**
 * /api/subscribe・/api/sync の中身。
 * 入力の検証 → secret の照合 → DB という順で、Request/Response には触らない（テストしやすくするため）。
 */
import type { z } from 'zod'
import { hashSecret, secretMatches } from './auth.js'
import type { Db, Device } from './db.js'
import type { SendPush } from './push.js'
import type { RateLimiter } from './rateLimit.js'
import type { Reminder } from './schedule.js'
import { subscribeSchema, syncSchema, unsubscribeSchema } from './validate.js'

export interface Deps {
  db: Db
  sendPush: SendPush
  /** API の回数制限（なければ数えない） */
  limiter?: RateLimiter
}

export interface Result {
  status: number
  body: Record<string, unknown>
}

const ok = (body: Record<string, unknown> = {}): Result => ({
  status: 200,
  body: { ok: true, ...body },
})

const UNAUTHORIZED: Result = { status: 401, body: { error: 'unauthorized' } }

/** 入力のどこが違うかだけを返す（値そのものは返さない） */
function invalid(error: z.ZodError): Result {
  return {
    status: 400,
    body: {
      error: 'invalid input',
      issues: error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    },
  }
}

/** 端末があり、secret が合っていればその端末を返す。端末がないときも 401 にする */
async function authorize(db: Db, deviceId: string, secret: string): Promise<Device | null> {
  const device = await db.getDevice(deviceId)
  if (!device || !secretMatches(secret, device.secretHash)) return null
  return device
}

/** POST /api/subscribe：初回は端末を作り、通知の宛先を登録する */
export async function subscribe(input: unknown, { db }: Deps): Promise<Result> {
  const parsed = subscribeSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const { deviceId, secret, subscription, settings } = parsed.data

  if (!(await db.getDevice(deviceId))) {
    await db.createDevice(deviceId, hashSecret(secret), settings)
  }
  // 作った直後も含めて、必ず照合する（同じ deviceId で別の secret が来たら 401）
  if (!(await authorize(db, deviceId, secret))) return UNAUTHORIZED

  await db.upsertSubscription(deviceId, {
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
  })
  return ok()
}

/** DELETE /api/subscribe：宛先を消す。宛先が残っていなければ、端末のデータも丸ごと消す */
export async function unsubscribe(input: unknown, { db }: Deps): Promise<Result> {
  const parsed = unsubscribeSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const { deviceId, secret, endpoint } = parsed.data

  if (!(await authorize(db, deviceId, secret))) return UNAUTHORIZED
  const remaining = await db.deleteSubscription(deviceId, endpoint)
  if (remaining === 0) await db.deleteDevice(deviceId)
  return ok({ deviceDeleted: remaining === 0 })
}

/** POST /api/sync：その端末の課題（通知に必要な分だけ）と設定を丸ごと置き換える */
export async function sync(input: unknown, { db }: Deps): Promise<Result> {
  const parsed = syncSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const { deviceId, secret, tasks, settings } = parsed.data

  if (!(await authorize(db, deviceId, secret))) return UNAUTHORIZED

  const reminders: Reminder[] = tasks.map((t) => ({
    taskId: t.id,
    type: t.type,
    // 課題名を出さない設定なら、送られてきても保存しない
    title: settings.showTitle ? t.title?.trim() || null : null,
    due: t.due,
    done: t.done,
  }))
  await db.replaceReminders(deviceId, settings, reminders)
  return ok({ count: reminders.length })
}
