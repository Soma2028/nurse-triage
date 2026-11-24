/**
 * API の入力の形を zod で決める。ここを通らないものは 400 で返す。
 */
import { z } from 'zod'
import type { TaskType } from '../../src/types.js'
import { DEFAULT_PREFS, H3_LEADS, TIME_STEP } from './schedule.js'

const TASK_TYPES = [
  'rec',
  'proc',
  'pre',
  'osce',
  'exam',
  'report',
  'gw',
  'kokushi',
  'etc',
] as const satisfies readonly TaskType[]

/** 1端末から受け取る課題の上限 */
export const MAX_TASKS = 200

/** 端末の名札。deviceId と secret はアプリが初回に作って localStorage に保存する */
const auth = {
  deviceId: z.uuid(),
  secret: z.string().min(32).max(128),
}

/** 0:00〜23:45 を15分刻みで（0:00 からの分） */
const timeOfDay = z
  .number()
  .int()
  .min(0)
  .max(24 * 60 - TIME_STEP)
  .multipleOf(TIME_STEP)

/** 時刻の項目は、時刻を選べるようになる前のアプリ・DB の設定にはないので、なければ初期値 */
export const prefsSchema = z.strictObject({
  eve: z.boolean(),
  eveTime: timeOfDay.default(DEFAULT_PREFS.eveTime),
  h3: z.boolean(),
  h3Lead: z
    .number()
    .refine((v) => (H3_LEADS as readonly number[]).includes(v))
    .default(DEFAULT_PREFS.h3Lead),
  morning: z.boolean(),
  morningTime: timeOfDay.default(DEFAULT_PREFS.morningTime),
  showTitle: z.boolean(),
})

/** ブラウザの PushSubscription.toJSON() の形 */
const subscriptionSchema = z.object({
  endpoint: z.url({ protocol: /^https$/ }).max(2000),
  expirationTime: z.number().nullable().optional(),
  keys: z.object({
    p256dh: z.string().min(1).max(200),
    auth: z.string().min(1).max(100),
  }),
})

export const subscribeSchema = z.strictObject({
  ...auth,
  subscription: subscriptionSchema,
  settings: prefsSchema,
})

export const unsubscribeSchema = z.strictObject({
  ...auth,
  endpoint: z.url({ protocol: /^https$/ }).max(2000),
})

const syncTaskSchema = z.strictObject({
  id: z.string().min(1).max(100),
  type: z.enum(TASK_TYPES),
  due: z.number().int().positive(), // epoch ms
  done: z.boolean(),
  title: z.string().max(200).optional(),
})

export const syncSchema = z.strictObject({
  ...auth,
  tasks: z
    .array(syncTaskSchema)
    .max(MAX_TASKS)
    .refine((ts) => new Set(ts.map((t) => t.id)).size === ts.length, '課題の id が重複している'),
  settings: prefsSchema,
})

export const testSchema = z.strictObject(auth)

export type SubscribeInput = z.infer<typeof subscribeSchema>
export type UnsubscribeInput = z.infer<typeof unsubscribeSchema>
export type SyncInput = z.infer<typeof syncSchema>
export type TestInput = z.infer<typeof testSchema>
