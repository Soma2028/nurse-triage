import { afterEach, describe, expect, it } from 'vitest'
import {
  DEFAULT_PREFS,
  MORNING_TASK_ID,
  eveAt,
  formatJstTime,
  h3At,
  isInWindow,
  isMorningRed,
  morningAt,
  pendingNotices,
  sentKey,
  type NotifyPrefs,
  type Reminder,
} from './schedule.js'

const MIN = 60 * 1000
const HOUR = 60 * MIN

/** 日本時間の日時。サーバーのタイムゾーンに左右されないよう、UTC から9時間引いて作る */
const jst = (y: number, mo: number, d: number, h = 0, mi = 0) => Date.UTC(y, mo - 1, d, h - 9, mi)

const rem = (over: Partial<Reminder> = {}): Reminder => ({
  taskId: 't1',
  type: 'rec',
  title: null,
  due: jst(2026, 11, 25, 8, 30),
  done: false,
  ...over,
})

const NONE = new Set<string>()

describe('eveAt: 締切の前日 20:00', () => {
  it.each([
    ['0:30', jst(2026, 11, 25, 0, 30), jst(2026, 11, 24, 20)],
    ['8:30', jst(2026, 11, 25, 8, 30), jst(2026, 11, 24, 20)],
    ['23:59', jst(2026, 11, 25, 23, 59), jst(2026, 11, 24, 20)],
  ])('締切 %s → 前日 20:00', (_, due, want) => {
    expect(eveAt(due)).toBe(want)
  })

  it('月末をまたぐ（12/1 → 11/30）', () => {
    expect(eveAt(jst(2026, 12, 1, 8, 30))).toBe(jst(2026, 11, 30, 20))
  })

  it('年末をまたぐ（1/1 0:30 → 12/31）', () => {
    expect(eveAt(jst(2027, 1, 1, 0, 30))).toBe(jst(2026, 12, 31, 20))
  })

  it('2月末（うるう年とそうでない年）', () => {
    expect(eveAt(jst(2027, 3, 1, 9))).toBe(jst(2027, 2, 28, 20))
    expect(eveAt(jst(2028, 3, 1, 9))).toBe(jst(2028, 2, 29, 20))
  })

  it('UTC ではまだ前日の時間帯（日本時間 0:00〜8:59）の締切でも、日本の日付で前日になる', () => {
    // 11/25 8:59 JST は UTC で 11/24 23:59。UTC の日付で計算すると 11/23 になってしまう
    expect(eveAt(jst(2026, 11, 25, 8, 59))).toBe(jst(2026, 11, 24, 20))
  })
})

describe('h3At: 締切の3時間前', () => {
  it('日付をまたぐ', () => {
    expect(h3At(jst(2026, 11, 25, 0, 30))).toBe(jst(2026, 11, 24, 21, 30))
    expect(h3At(jst(2027, 1, 1, 1, 0))).toBe(jst(2026, 12, 31, 22, 0))
  })
})

describe('morningAt: その日の朝 7:00', () => {
  it('日本時間の「今日」の 7:00', () => {
    expect(morningAt(jst(2026, 11, 24, 7, 10))).toBe(jst(2026, 11, 24, 7))
    expect(morningAt(jst(2026, 11, 24, 23, 59))).toBe(jst(2026, 11, 24, 7))
  })
  it('日本時間 0:30（UTC ではまだ前日）でも、その日の 7:00', () => {
    expect(morningAt(jst(2026, 11, 24, 0, 30))).toBe(jst(2026, 11, 24, 7))
  })
})

describe('isInWindow: 予定時刻 ≤ 現在 < 予定時刻 + 60分', () => {
  const at = jst(2026, 11, 24, 20)
  it('ちょうど・59分後は送る', () => {
    expect(isInWindow(at, at)).toBe(true)
    expect(isInWindow(at, at + 59 * MIN)).toBe(true)
  })
  it('60分後・予定より前は送らない', () => {
    expect(isInWindow(at, at + 60 * MIN)).toBe(false)
    expect(isInWindow(at, at - 1)).toBe(false)
  })
})

describe('formatJstTime', () => {
  it('時はゼロ埋めせず、分は2桁', () => {
    expect(formatJstTime(jst(2026, 11, 25, 8, 30))).toBe('8:30')
    expect(formatJstTime(jst(2026, 11, 25, 0, 5))).toBe('0:05')
    expect(formatJstTime(jst(2026, 11, 25, 23, 59))).toBe('23:59')
  })
})

describe('pendingNotices: 前日 20:00', () => {
  const r = rem()
  const eve = jst(2026, 11, 24, 20)

  it('予定時刻ちょうど・59分後は送る', () => {
    for (const now of [eve, eve + 59 * MIN]) {
      const got = pendingNotices([r], DEFAULT_PREFS, now, NONE)
      expect(got).toHaveLength(1)
      expect(got[0]).toMatchObject({ kind: 'eve', taskId: 't1', due: r.due })
    }
  })

  it('60分後は送らない', () => {
    expect(pendingNotices([r], DEFAULT_PREFS, eve + 60 * MIN, NONE)).toEqual([])
  })

  it('送信済みは送らない', () => {
    const sent = new Set([sentKey('t1', 'eve', r.due)])
    expect(pendingNotices([r], DEFAULT_PREFS, eve + 15 * MIN, sent)).toEqual([])
  })

  it('完了済みは送らない', () => {
    expect(pendingNotices([rem({ done: true })], DEFAULT_PREFS, eve, NONE)).toEqual([])
  })

  it('締切を変えたら、同じ課題でも送り直す', () => {
    const sent = new Set([sentKey('t1', 'eve', r.due)])
    const moved = rem({ due: jst(2026, 11, 25, 13, 0) }) // 同じ日の 13:00 に変更
    const got = pendingNotices([moved], DEFAULT_PREFS, eve + 30 * MIN, sent)
    expect(got).toHaveLength(1)
    expect(got[0].due).toBe(moved.due)
  })

  it('設定で前日の通知を切っていれば送らない', () => {
    expect(pendingNotices([r], { ...DEFAULT_PREFS, eve: false }, eve, NONE)).toEqual([])
  })

  it('文面：課題名を出さない設定では種類名', () => {
    const titled = rem({ title: '実習記録（3日目）' })
    const [n] = pendingNotices([titled], DEFAULT_PREFS, eve, NONE)
    expect(n.title).toBe('明日 8:30 締切：実習記録')
    expect(n.title).not.toContain('3日目')
  })

  it('文面：課題名を出す設定では課題名（なければ種類名）', () => {
    const prefs: NotifyPrefs = { ...DEFAULT_PREFS, showTitle: true }
    const [a] = pendingNotices([rem({ title: '実習記録（3日目）' })], prefs, eve, NONE)
    expect(a.title).toBe('明日 8:30 締切：実習記録（3日目）')
    const [b] = pendingNotices([rem({ type: 'proc', title: '  ' })], prefs, eve, NONE)
    expect(b.title).toBe('明日 8:30 締切：看護過程')
  })

  it('締切 0:30 は「明日 0:30」', () => {
    const due = jst(2026, 11, 25, 0, 30)
    const [n] = pendingNotices([rem({ due })], DEFAULT_PREFS, jst(2026, 11, 24, 20), NONE)
    expect(n.title).toBe('明日 0:30 締切：実習記録')
  })
})

describe('pendingNotices: 3時間前', () => {
  const r = rem({ type: 'proc', due: jst(2026, 11, 25, 13, 0) })
  const at = jst(2026, 11, 25, 10, 0)

  it('予定時刻ちょうど・59分後は送る、60分後は送らない', () => {
    expect(pendingNotices([r], DEFAULT_PREFS, at, NONE)).toMatchObject([{ kind: 'h3' }])
    expect(pendingNotices([r], DEFAULT_PREFS, at + 59 * MIN, NONE)).toMatchObject([{ kind: 'h3' }])
    expect(pendingNotices([r], DEFAULT_PREFS, at + 60 * MIN, NONE)).toEqual([])
  })

  it('文面', () => {
    const [n] = pendingNotices([r], DEFAULT_PREFS, at, NONE)
    expect(n.title).toBe('あと3時間：看護過程')
    expect(n.body).toBe('13:00 締切だよ')
  })

  it('前日の通知と同じ tag（前日の通知を3時間前の通知で置き換える）', () => {
    const [h3] = pendingNotices([r], DEFAULT_PREFS, at, NONE)
    const [eve] = pendingNotices([r], DEFAULT_PREFS, jst(2026, 11, 24, 20), NONE)
    expect(h3.tag).toBe(eve.tag)
  })

  it('締切 0:00 は、前日 20:00 に前日の通知、21:00 に3時間前の通知（別々に1回ずつ）', () => {
    const midnight = rem({ due: jst(2026, 11, 25, 0, 0) })
    const kinds = (now: number) =>
      pendingNotices([midnight], DEFAULT_PREFS, now, NONE).map((n) => n.kind)
    expect(kinds(jst(2026, 11, 24, 20, 45))).toEqual(['eve'])
    expect(kinds(jst(2026, 11, 24, 21, 0))).toEqual(['h3'])
  })
})

describe('pendingNotices: 朝 7:00 のまとめ', () => {
  const now = jst(2026, 11, 24, 7, 0)
  const tasks = [
    rem({ taskId: 'a', type: 'report', due: jst(2026, 11, 24, 23, 59) }), // 24時間以内 → 赤
    rem({ taskId: 'b', type: 'proc', due: jst(2026, 11, 28, 8, 30) }), // 看護過程 → 赤
    rem({ taskId: 'c', type: 'kokushi', due: jst(2026, 12, 20, 23, 0) }), // 遠い → 赤ではない
    rem({ taskId: 'd', type: 'rec', due: jst(2026, 11, 23, 8, 30) }), // 期限切れ → 数えない
    rem({ taskId: 'e', type: 'rec', due: jst(2026, 11, 25, 8, 30), done: true }), // 完了 → 数えない
  ]

  it('赤の件数と、締切のいちばん早い課題', () => {
    const got = pendingNotices(tasks, DEFAULT_PREFS, now, NONE)
    expect(got).toEqual([
      {
        kind: 'morning',
        taskId: MORNING_TASK_ID,
        due: now,
        title: '今日の赤タッグ 2件',
        body: 'まずレポートから',
        tag: 'morning',
      },
    ])
  })

  it('59分後までは送る、8:00 以降は送らない', () => {
    expect(pendingNotices(tasks, DEFAULT_PREFS, now + 59 * MIN, NONE)).toHaveLength(1)
    expect(pendingNotices(tasks, DEFAULT_PREFS, now + 60 * MIN, NONE)).toEqual([])
  })

  it('1日1回（その朝の分を送ったら、もう送らない）', () => {
    const sent = new Set([sentKey(MORNING_TASK_ID, 'morning', now)])
    expect(pendingNotices(tasks, DEFAULT_PREFS, now + 15 * MIN, sent)).toEqual([])
    // 次の日の朝は送る
    const next = jst(2026, 11, 25, 7, 0)
    expect(pendingNotices(tasks, DEFAULT_PREFS, next, sent)).toMatchObject([{ kind: 'morning' }])
  })

  it('赤がなければ送らない', () => {
    expect(pendingNotices([tasks[2], tasks[3], tasks[4]], DEFAULT_PREFS, now, NONE)).toEqual([])
  })

  it('設定で切っていれば送らない', () => {
    expect(pendingNotices(tasks, { ...DEFAULT_PREFS, morning: false }, now, NONE)).toEqual([])
  })

  it('isMorningRed：24時間ちょうどは赤、過ぎたら種類しだい', () => {
    expect(isMorningRed(rem({ type: 'report', due: now + 24 * HOUR }), now)).toBe(true)
    expect(isMorningRed(rem({ type: 'report', due: now + 24 * HOUR + 1 }), now)).toBe(false)
    expect(isMorningRed(rem({ type: 'rec', due: now + 10 * 24 * HOUR }), now)).toBe(true)
  })
})

describe('サーバーのタイムゾーンに左右されない', () => {
  const original = process.env.TZ
  afterEach(() => {
    process.env.TZ = original
  })

  /** いろいろな締切・現在時刻での計算結果をまとめて文字列にする */
  const snapshot = () => {
    const dues = [
      jst(2026, 11, 25, 0, 30),
      jst(2026, 11, 25, 8, 30),
      jst(2026, 11, 25, 23, 59),
      jst(2026, 12, 1, 8, 30),
      jst(2027, 1, 1, 0, 30),
    ]
    const nows = [
      jst(2026, 11, 24, 0, 30),
      jst(2026, 11, 24, 7, 15),
      jst(2026, 11, 24, 20, 10),
      jst(2026, 12, 31, 20, 0),
    ]
    const reminders = dues.map((due, i) => rem({ taskId: `t${i}`, due }))
    return JSON.stringify({
      eve: dues.map(eveAt),
      h3: dues.map(h3At),
      time: dues.map(formatJstTime),
      morning: nows.map(morningAt),
      pending: nows.map((now) => pendingNotices(reminders, DEFAULT_PREFS, now, NONE)),
    })
  }

  it('TZ=UTC・Asia/Tokyo・America/New_York で同じ結果になる', () => {
    const results: Record<string, string> = {}
    for (const tz of ['UTC', 'Asia/Tokyo', 'America/New_York']) {
      process.env.TZ = tz
      results[tz] = snapshot()
    }
    // タイムゾーンが本当に切り替わっていることを確かめる（切り替わらないと、このテストは意味がない）
    process.env.TZ = 'UTC'
    expect(new Date(0).getTimezoneOffset()).toBe(0)
    process.env.TZ = 'Asia/Tokyo'
    expect(new Date(0).getTimezoneOffset()).toBe(-540)

    expect(results.UTC).toBe(results['Asia/Tokyo'])
    expect(results['America/New_York']).toBe(results['Asia/Tokyo'])
  })
})
