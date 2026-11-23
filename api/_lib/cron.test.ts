import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SENT_RETENTION_MS, cronAuthorized, runCron, ttlFor } from './cron.js'
import type { Db, PushTarget, SentRef } from './db.js'
import { toPrefs } from './db.js'
import type { PushResult, SendPush } from './push.js'
import { DEFAULT_PREFS, sentKey, type NotifyPrefs, type Reminder } from './schedule.js'

const MIN = 60 * 1000
/** 日本時間の日時（サーバーの TZ に左右されない作り方） */
const jst = (y: number, mo: number, d: number, h = 0, mi = 0) => Date.UTC(y, mo - 1, d, h - 9, mi)

const DUE = jst(2026, 11, 25, 8, 30) // 締切 11/25 8:30
const EVE = jst(2026, 11, 24, 20, 0) // 前日 20:00

interface FakeDevice {
  prefs: NotifyPrefs
  subs: PushTarget[]
  reminders: Reminder[]
}

/** SQL と同じ絞り込みをするメモリ上の DB。sent は claimSent で記録したものから作る */
function fakeDb(devices: Record<string, FakeDevice>) {
  const claims = new Set<string>()
  const key = (r: SentRef) => `${r.deviceId}|${sentKey(r.taskId, r.kind, r.due)}`
  const db: Db = {
    getDevice: async () => null,
    createDevice: async () => {},
    deleteDevice: async () => {},
    upsertSubscription: async () => {},
    deleteSubscription: async () => 0,
    deleteSubscriptionByEndpoint: async (endpoint) => {
      for (const d of Object.values(devices)) d.subs = d.subs.filter((s) => s.endpoint !== endpoint)
    },
    listSubscriptions: async () => [],
    replaceReminders: async () => {},
    listCronTargets: async (now) =>
      Object.entries(devices)
        .filter(([, d]) => d.subs.length > 0)
        .map(([id, d]) => ({
          deviceId: id,
          prefs: d.prefs,
          subscriptions: [...d.subs],
          reminders: d.reminders.filter((r) => !r.done && r.due > now),
          sent: new Set(
            [...claims].filter((k) => k.startsWith(`${id}|`)).map((k) => k.slice(id.length + 1)),
          ),
        })),
    claimSent: async (ref) => {
      if (claims.has(key(ref))) return false
      claims.add(key(ref))
      return true
    },
    releaseSent: async (ref) => {
      claims.delete(key(ref))
    },
    pruneSent: vi.fn(async () => {}),
  }
  return { db, claims }
}

const sub = (name: string): PushTarget => ({
  endpoint: `https://push.example.test/${name}`,
  p256dh: 'p',
  auth: 'a',
})
const rem = (over: Partial<Reminder> = {}): Reminder => ({
  taskId: 't1',
  type: 'rec',
  title: null,
  due: DUE,
  done: false,
  ...over,
})

let sendPush: ReturnType<typeof vi.fn<SendPush>>
beforeEach(() => {
  sendPush = vi.fn<SendPush>(async () => 'ok')
})

describe('runCron', () => {
  it('前日 20:00 に1回だけ送り、15分後の cron では送らない', async () => {
    const { db } = fakeDb({ d1: { prefs: DEFAULT_PREFS, subs: [sub('a')], reminders: [rem()] } })

    const first = await runCron(EVE + 2 * MIN, { db, sendPush })
    expect(first).toEqual({ devices: 1, notices: 1, sent: 1, failed: 0, removed: 0 })
    expect(sendPush).toHaveBeenCalledWith(
      sub('a'),
      {
        title: '明日 8:30 締切：実習記録',
        body: '今夜のうちに少し進めておこう',
        tag: 'task:t1',
        url: '/',
      },
      { ttlSeconds: 12 * 60 * 60 },
    )

    const second = await runCron(EVE + 17 * MIN, { db, sendPush })
    expect(second.notices).toBe(0)
    expect(sendPush).toHaveBeenCalledTimes(1)
  })

  it('完了にした課題には送らない', async () => {
    const { db } = fakeDb({
      d1: { prefs: DEFAULT_PREFS, subs: [sub('a')], reminders: [rem({ done: true })] },
    })
    expect((await runCron(EVE, { db, sendPush })).notices).toBe(0)
    expect(sendPush).not.toHaveBeenCalled()
  })

  it('締切を変えたら送り直す', async () => {
    const d = { prefs: DEFAULT_PREFS, subs: [sub('a')], reminders: [rem()] }
    const { db } = fakeDb({ d1: d })
    await runCron(EVE, { db, sendPush })
    d.reminders = [rem({ due: jst(2026, 11, 25, 13, 0) })] // 同じ日の 13:00 に変更
    await runCron(EVE + 15 * MIN, { db, sendPush })
    expect(sendPush).toHaveBeenCalledTimes(2)
  })

  it('一時的な失敗なら記録を取り消して、次の cron で送り直す（届いたら1回で終わり）', async () => {
    const { db } = fakeDb({ d1: { prefs: DEFAULT_PREFS, subs: [sub('a')], reminders: [rem()] } })
    sendPush.mockResolvedValueOnce('error' satisfies PushResult)

    const first = await runCron(EVE, { db, sendPush })
    expect(first).toMatchObject({ notices: 1, sent: 0, failed: 1 })
    const second = await runCron(EVE + 15 * MIN, { db, sendPush })
    expect(second).toMatchObject({ notices: 1, sent: 1 })
    const third = await runCron(EVE + 30 * MIN, { db, sendPush })
    expect(third.notices).toBe(0)
    expect(sendPush).toHaveBeenCalledTimes(2)
  })

  it('「もうない」（404・410）の宛先は消し、ほかの宛先には届ける', async () => {
    const d = { prefs: DEFAULT_PREFS, subs: [sub('old'), sub('new')], reminders: [rem()] }
    const { db } = fakeDb({ d1: d })
    sendPush.mockImplementation(async (t) => (t.endpoint.endsWith('old') ? 'gone' : 'ok'))

    const r = await runCron(EVE, { db, sendPush })
    expect(r).toMatchObject({ sent: 1, failed: 0, removed: 1 })
    expect(d.subs.map((s) => s.endpoint)).toEqual([sub('new').endpoint])
  })

  it('宛先がぜんぶ「もうない」なら、同じ回のほかの通知はもう送らない', async () => {
    const d = {
      prefs: DEFAULT_PREFS,
      subs: [sub('old')],
      reminders: [rem({ taskId: 't1' }), rem({ taskId: 't2' })],
    }
    const { db } = fakeDb({ d1: d })
    sendPush.mockResolvedValue('gone')
    const r = await runCron(EVE, { db, sendPush })
    expect(sendPush).toHaveBeenCalledTimes(1)
    expect(r).toMatchObject({ notices: 1, failed: 1, removed: 1 })
  })

  it('ほかの cron がすでに記録していたら送らない（同時に動いても二重にならない）', async () => {
    const { db } = fakeDb({ d1: { prefs: DEFAULT_PREFS, subs: [sub('a')], reminders: [rem()] } })
    await db.claimSent({ deviceId: 'd1', taskId: 't1', kind: 'eve', due: DUE })
    const r = await runCron(EVE, { db, sendPush })
    expect(r.notices).toBe(0)
    expect(sendPush).not.toHaveBeenCalled()
  })

  it('1台で例外が起きても、ほかの端末には送る', async () => {
    const { db } = fakeDb({
      d1: { prefs: DEFAULT_PREFS, subs: [sub('broken')], reminders: [rem()] },
      d2: { prefs: DEFAULT_PREFS, subs: [sub('fine')], reminders: [rem()] },
    })
    vi.spyOn(console, 'error').mockImplementation(() => {})
    sendPush.mockImplementation(async (t) => {
      if (t.endpoint.endsWith('broken')) throw new Error('boom')
      return 'ok'
    })
    const r = await runCron(EVE, { db, sendPush })
    expect(r).toMatchObject({ devices: 2, sent: 1, failed: 1 })
  })

  it('課題名を出す設定なら課題名、出さない設定なら種類名', async () => {
    const { db } = fakeDb({
      on: {
        prefs: { ...DEFAULT_PREFS, showTitle: true },
        subs: [sub('on')],
        reminders: [rem({ title: '実習記録（3日目）' })],
      },
      off: { prefs: DEFAULT_PREFS, subs: [sub('off')], reminders: [rem()] },
    })
    await runCron(EVE, { db, sendPush })
    const titles = Object.fromEntries(sendPush.mock.calls.map(([t, p]) => [t.endpoint, p.title]))
    expect(titles[sub('on').endpoint]).toBe('明日 8:30 締切：実習記録（3日目）')
    expect(titles[sub('off').endpoint]).toBe('明日 8:30 締切：実習記録')
  })

  it('朝 7:00 のまとめは端末ごとに1日1回', async () => {
    const morning = jst(2026, 11, 24, 7, 0)
    const { db } = fakeDb({
      d1: { prefs: DEFAULT_PREFS, subs: [sub('a')], reminders: [rem({ due: jst(2026, 11, 28) })] },
    })
    await runCron(morning + 5 * MIN, { db, sendPush })
    await runCron(morning + 20 * MIN, { db, sendPush })
    expect(sendPush).toHaveBeenCalledTimes(1)
    expect(sendPush.mock.calls[0][1]).toMatchObject({ title: '今日の赤タッグ 1件', tag: 'morning' })
  })

  it('古い送信記録を消す', async () => {
    const { db } = fakeDb({})
    await runCron(EVE, { db, sendPush })
    expect(db.pruneSent).toHaveBeenCalledWith(EVE - SENT_RETENTION_MS)
  })
})

describe('cronAuthorized', () => {
  const secret = 'x'.repeat(64)
  it('Bearer と CRON_SECRET が合うときだけ通す', () => {
    expect(cronAuthorized(`Bearer ${secret}`, secret)).toBe(true)
    expect(cronAuthorized(`Bearer ${secret}y`, secret)).toBe(false)
    expect(cronAuthorized(secret, secret)).toBe(false)
    expect(cronAuthorized(null, secret)).toBe(false)
    expect(cronAuthorized('Bearer ', '')).toBe(false)
  })
})

describe('ttlFor', () => {
  it('締切までの時間（最大12時間・最小1分）、朝のまとめは3時間', () => {
    const n = { kind: 'h3', taskId: 't', title: '', body: '', tag: '' } as const
    expect(ttlFor({ ...n, due: EVE + 3 * 60 * MIN }, EVE)).toBe(3 * 60 * 60)
    expect(ttlFor({ ...n, due: EVE + 30 * 60 * 60 * 1000 }, EVE)).toBe(12 * 60 * 60)
    expect(ttlFor({ ...n, due: EVE + 10 * 1000 }, EVE)).toBe(60)
    expect(ttlFor({ ...n, kind: 'morning', due: EVE }, EVE)).toBe(3 * 60 * 60)
  })
})

describe('toPrefs', () => {
  it('DB の設定が壊れていたら初期値（課題名は出さない）', () => {
    expect(toPrefs({ eve: false, h3: true, morning: true, showTitle: true })).toMatchObject({
      eve: false,
      showTitle: true,
    })
    expect(toPrefs({})).toEqual(DEFAULT_PREFS)
    expect(toPrefs(null)).toEqual(DEFAULT_PREFS)
  })
})
