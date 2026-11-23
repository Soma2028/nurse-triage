import { beforeEach, describe, expect, it, vi } from 'vitest'
import { hashSecret, secretMatches } from './auth.js'
import type { Db, Device, PushTarget } from './db.js'
import { MissingEnvError, readEnv } from './env.js'
import { sendTest, subscribe, sync, unsubscribe, type Deps } from './handlers.js'
import type { PushResult, SendPush } from './push.js'
import { DEFAULT_PREFS, type NotifyPrefs, type Reminder } from './schedule.js'
import { MAX_TASKS } from './validate.js'

/** メモリ上の DB（本物の SQL は動かさない） */
function fakeDb() {
  const devices = new Map<string, Device>()
  const subs = new Map<string, PushTarget & { deviceId: string }>()
  const reminders = new Map<string, Reminder[]>()
  const db: Db = {
    getDevice: async (id) => devices.get(id) ?? null,
    createDevice: async (id, secretHash, settings) => {
      if (!devices.has(id)) devices.set(id, { id, secretHash, settings })
    },
    deleteDevice: async (id) => {
      devices.delete(id)
      reminders.delete(id)
      for (const [k, s] of subs) if (s.deviceId === id) subs.delete(k)
    },
    upsertSubscription: async (deviceId, t) => {
      subs.set(t.endpoint, { ...t, deviceId })
    },
    deleteSubscription: async (deviceId, endpoint) => {
      if (subs.get(endpoint)?.deviceId === deviceId) subs.delete(endpoint)
      return [...subs.values()].filter((s) => s.deviceId === deviceId).length
    },
    deleteSubscriptionByEndpoint: async (endpoint) => {
      subs.delete(endpoint)
    },
    listSubscriptions: async (deviceId) =>
      [...subs.values()]
        .filter((s) => s.deviceId === deviceId)
        .map(({ endpoint, p256dh, auth }) => ({ endpoint, p256dh, auth })),
    replaceReminders: async (deviceId, settings, rs) => {
      devices.get(deviceId)!.settings = settings
      reminders.set(deviceId, rs)
    },
  }
  return { db, devices, subs, reminders }
}

const DEVICE = '0b9e4f2a-6c1d-4e8b-9a3f-5d7c2e1b0a99'
const SECRET = 'a'.repeat(43)
const ENDPOINT = 'https://web.push.apple.com/QGx1c2VyMTIz'
const subscription = {
  endpoint: ENDPOINT,
  expirationTime: null,
  keys: { p256dh: 'BOr_p256dh_key', auth: 'auth_secret' },
}

let store: ReturnType<typeof fakeDb>
let sendPush: ReturnType<typeof vi.fn<SendPush>>
let deps: Deps

beforeEach(() => {
  store = fakeDb()
  sendPush = vi.fn<SendPush>(async () => 'ok')
  deps = { db: store.db, sendPush }
})

const register = () =>
  subscribe({ deviceId: DEVICE, secret: SECRET, subscription, settings: DEFAULT_PREFS }, deps)

describe('auth', () => {
  it('secret は SHA-256 で保存し、同じ secret だけが合う', () => {
    const h = hashSecret(SECRET)
    expect(h).toMatch(/^[0-9a-f]{64}$/)
    expect(h).not.toContain(SECRET)
    expect(secretMatches(SECRET, h)).toBe(true)
    expect(secretMatches('b'.repeat(43), h)).toBe(false)
    expect(secretMatches(SECRET, 'not-a-hash')).toBe(false)
  })
})

describe('readEnv', () => {
  it('足りない環境変数の名前だけを伝える（値は出さない）', () => {
    expect(() => readEnv({ DATABASE_URL: 'postgres://secret' })).toThrow(MissingEnvError)
    expect(() => readEnv({ DATABASE_URL: 'postgres://secret' })).toThrow(/VAPID_PUBLIC_KEY/)
    expect(() => readEnv({ DATABASE_URL: 'postgres://secret' })).not.toThrow(/postgres/)
  })
})

describe('POST /api/subscribe', () => {
  it('初回は端末を作り（secret はハッシュで保存）、宛先を登録する', async () => {
    expect(await register()).toEqual({ status: 200, body: { ok: true } })
    const d = store.devices.get(DEVICE)!
    expect(d.secretHash).toBe(hashSecret(SECRET))
    expect(d.secretHash).not.toBe(SECRET)
    expect(store.subs.get(ENDPOINT)).toMatchObject({ deviceId: DEVICE, p256dh: 'BOr_p256dh_key' })
  })

  it('2回目以降は同じ secret なら宛先を上書きする', async () => {
    await register()
    const again = await subscribe(
      {
        deviceId: DEVICE,
        secret: SECRET,
        subscription: { ...subscription, keys: { p256dh: 'new', auth: 'new' } },
        settings: DEFAULT_PREFS,
      },
      deps,
    )
    expect(again.status).toBe(200)
    expect(store.subs.get(ENDPOINT)?.p256dh).toBe('new')
  })

  it('同じ deviceId で別の secret なら 401（他人の端末を乗っ取れない）', async () => {
    await register()
    const r = await subscribe(
      { deviceId: DEVICE, secret: 'b'.repeat(43), subscription, settings: DEFAULT_PREFS },
      deps,
    )
    expect(r.status).toBe(401)
  })

  it.each([
    ['deviceId が uuid でない', { deviceId: 'abc' }],
    ['secret が短い', { secret: 'short' }],
    [
      'endpoint が https でない',
      { subscription: { ...subscription, endpoint: 'http://x.test/a' } },
    ],
    ['keys がない', { subscription: { endpoint: ENDPOINT } }],
    ['settings が足りない', { settings: { eve: true } }],
    ['知らない項目がある', { extra: 1 }],
  ])('入力が違えば 400：%s', async (_, over) => {
    const r = await subscribe(
      { deviceId: DEVICE, secret: SECRET, subscription, settings: DEFAULT_PREFS, ...over },
      deps,
    )
    expect(r.status).toBe(400)
    expect(store.devices.size).toBe(0)
  })

  it('400 の返事に、送られてきた値（secret など）を含めない', async () => {
    const r = await subscribe({ deviceId: DEVICE, secret: 'short-secret-value' }, deps)
    expect(r.status).toBe(400)
    expect(JSON.stringify(r.body)).not.toContain('short-secret-value')
  })
})

describe('DELETE /api/subscribe', () => {
  it('最後の宛先を消したら、端末のデータも丸ごと消す', async () => {
    await register()
    const r = await unsubscribe({ deviceId: DEVICE, secret: SECRET, endpoint: ENDPOINT }, deps)
    expect(r).toEqual({ status: 200, body: { ok: true, deviceDeleted: true } })
    expect(store.devices.has(DEVICE)).toBe(false)
    expect(store.subs.size).toBe(0)
  })

  it('ほかの宛先が残っていれば端末は残す', async () => {
    await register()
    const other = { ...subscription, endpoint: 'https://fcm.googleapis.com/fcm/send/xyz' }
    await subscribe(
      { deviceId: DEVICE, secret: SECRET, subscription: other, settings: DEFAULT_PREFS },
      deps,
    )
    const r = await unsubscribe({ deviceId: DEVICE, secret: SECRET, endpoint: ENDPOINT }, deps)
    expect(r.body.deviceDeleted).toBe(false)
    expect(store.devices.has(DEVICE)).toBe(true)
  })

  it('secret が違えば 401 で、何も消さない', async () => {
    await register()
    const r = await unsubscribe(
      { deviceId: DEVICE, secret: 'b'.repeat(43), endpoint: ENDPOINT },
      deps,
    )
    expect(r.status).toBe(401)
    expect(store.devices.has(DEVICE)).toBe(true)
  })
})

describe('POST /api/sync', () => {
  const task = (over: Record<string, unknown> = {}) => ({
    id: 't1',
    type: 'rec',
    due: Date.UTC(2026, 10, 25, 0, 0),
    done: false,
    title: '実習記録（A氏・心不全）',
    ...over,
  })
  const prefs = (over: Partial<NotifyPrefs> = {}) => ({ ...DEFAULT_PREFS, ...over })

  it('課題名を出さない設定（初期）なら、送られてきても title を保存しない', async () => {
    await register()
    const r = await sync(
      { deviceId: DEVICE, secret: SECRET, tasks: [task()], settings: prefs() },
      deps,
    )
    expect(r).toEqual({ status: 200, body: { ok: true, count: 1 } })
    expect(store.reminders.get(DEVICE)).toEqual([
      { taskId: 't1', type: 'rec', title: null, due: task().due, done: false },
    ])
  })

  it('課題名を出す設定なら title を保存する（空白だけなら null）', async () => {
    await register()
    await sync(
      {
        deviceId: DEVICE,
        secret: SECRET,
        tasks: [task(), task({ id: 't2', title: '  ' })],
        settings: prefs({ showTitle: true }),
      },
      deps,
    )
    expect(store.reminders.get(DEVICE)?.map((r) => r.title)).toEqual([
      '実習記録（A氏・心不全）',
      null,
    ])
  })

  it('丸ごと置き換え、設定も保存する', async () => {
    await register()
    await sync({ deviceId: DEVICE, secret: SECRET, tasks: [task()], settings: prefs() }, deps)
    await sync(
      {
        deviceId: DEVICE,
        secret: SECRET,
        tasks: [task({ id: 't9' })],
        settings: prefs({ morning: false }),
      },
      deps,
    )
    expect(store.reminders.get(DEVICE)?.map((r) => r.taskId)).toEqual(['t9'])
    expect(store.devices.get(DEVICE)?.settings.morning).toBe(false)
  })

  it('空の配列も受け取る（課題がぜんぶ消えたとき）', async () => {
    await register()
    const r = await sync({ deviceId: DEVICE, secret: SECRET, tasks: [], settings: prefs() }, deps)
    expect(r.body.count).toBe(0)
  })

  it(`${MAX_TASKS}件までは受け取り、それを超えたら 400`, async () => {
    await register()
    const many = (n: number) => Array.from({ length: n }, (_, i) => task({ id: `t${i}` }))
    const okR = await sync(
      { deviceId: DEVICE, secret: SECRET, tasks: many(MAX_TASKS), settings: prefs() },
      deps,
    )
    expect(okR.status).toBe(200)
    const ng = await sync(
      { deviceId: DEVICE, secret: SECRET, tasks: many(MAX_TASKS + 1), settings: prefs() },
      deps,
    )
    expect(ng.status).toBe(400)
  })

  it.each([
    ['種類が違う', { type: 'unknown' }],
    ['締切が数値でない', { due: '2026-11-25' }],
    ['課題名が長すぎる', { title: 'あ'.repeat(201) }],
  ])('課題の形が違えば 400：%s', async (_, over) => {
    await register()
    const r = await sync(
      { deviceId: DEVICE, secret: SECRET, tasks: [task(over)], settings: prefs() },
      deps,
    )
    expect(r.status).toBe(400)
  })

  it('id が重複していたら 400', async () => {
    await register()
    const r = await sync(
      { deviceId: DEVICE, secret: SECRET, tasks: [task(), task()], settings: prefs() },
      deps,
    )
    expect(r.status).toBe(400)
  })

  it('登録していない端末・secret が違うときは 401 で、何も保存しない', async () => {
    const r1 = await sync(
      { deviceId: DEVICE, secret: SECRET, tasks: [task()], settings: prefs() },
      deps,
    )
    expect(r1.status).toBe(401)
    await register()
    const r2 = await sync(
      { deviceId: DEVICE, secret: 'b'.repeat(43), tasks: [task()], settings: prefs() },
      deps,
    )
    expect(r2.status).toBe(401)
    expect(store.reminders.has(DEVICE)).toBe(false)
  })
})

describe('POST /api/test', () => {
  it('その端末のすべての宛先に送り、件数を返す', async () => {
    await register()
    const r = await sendTest({ deviceId: DEVICE, secret: SECRET }, deps)
    expect(r).toEqual({ status: 200, body: { ok: true, sent: 1, failed: 0 } })
    expect(sendPush).toHaveBeenCalledWith(
      { endpoint: ENDPOINT, p256dh: 'BOr_p256dh_key', auth: 'auth_secret' },
      expect.objectContaining({ title: 'テスト通知' }),
      { ttlSeconds: 60 },
    )
  })

  it('push サービスに「もうない」と言われた宛先（404・410）は消す', async () => {
    await register()
    sendPush.mockResolvedValueOnce('gone' satisfies PushResult)
    const r = await sendTest({ deviceId: DEVICE, secret: SECRET }, deps)
    expect(r.body).toMatchObject({ sent: 0, failed: 1 })
    expect(store.subs.has(ENDPOINT)).toBe(false)
  })

  it('それ以外の失敗では宛先を残す', async () => {
    await register()
    sendPush.mockResolvedValueOnce('error' satisfies PushResult)
    await sendTest({ deviceId: DEVICE, secret: SECRET }, deps)
    expect(store.subs.has(ENDPOINT)).toBe(true)
  })

  it('secret が違えば 401 で、送らない', async () => {
    await register()
    const r = await sendTest({ deviceId: DEVICE, secret: 'b'.repeat(43) }, deps)
    expect(r.status).toBe(401)
    expect(sendPush).not.toHaveBeenCalled()
  })
})
