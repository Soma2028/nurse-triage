import { describe, expect, it } from 'vitest'
import { DAY_MS, HOUR_MS } from '../constants'
import type { Schedule, Settings } from '../types'
import {
  addDays,
  availHours,
  dayKey,
  hasUpcoming,
  hoursOn,
  isDayKey,
  isPracticeToday,
  keyStart,
  pruneSchedule,
  rangeKeys,
  todayHours,
} from './schedule'

/** 日本時間の日時（テストは TZ=Asia/Tokyo で動く） */
const jst = (y: number, mo: number, d: number, h = 0, mi = 0) =>
  new Date(y, mo - 1, d, h, mi).getTime()

const S: Settings = { practiceMode: false, hoursPractice: 2.5, hoursNormal: 4 }
// 2026-11-23(月) 10:00
const NOW = jst(2026, 11, 23, 10)

describe('テスト環境', () => {
  it('タイムゾーンは Asia/Tokyo（UTC+9）', () => {
    expect(new Date(NOW).getTimezoneOffset()).toBe(-540)
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe('Asia/Tokyo')
  })
})

describe('dayKey: ローカル時刻の年月日', () => {
  it('JST 0:00〜8:59（UTC ではまだ前日）でもその日の日付になる', () => {
    expect(dayKey(jst(2026, 11, 24, 0, 0))).toBe('2026-11-24')
    expect(dayKey(jst(2026, 11, 24, 8, 59))).toBe('2026-11-24')
    // 参考：toISOString だと前日になる
    expect(new Date(jst(2026, 11, 24, 8, 59)).toISOString().slice(0, 10)).toBe('2026-11-23')
  })

  it('9:00・23:59 もその日、24:00 で翌日', () => {
    expect(dayKey(jst(2026, 11, 24, 9, 0))).toBe('2026-11-24')
    expect(dayKey(jst(2026, 11, 24, 23, 59))).toBe('2026-11-24')
    expect(dayKey(jst(2026, 11, 24, 24, 0))).toBe('2026-11-25')
  })

  it('月末・年末をまたぐ', () => {
    expect(dayKey(jst(2026, 11, 30, 23, 59) + 60_000)).toBe('2026-12-01')
    expect(dayKey(jst(2026, 12, 31, 23, 59) + 60_000)).toBe('2027-01-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2027-03-01', -1)).toBe('2027-02-28')
    expect(addDays('2028-03-01', -1)).toBe('2028-02-29')
  })

  it('keyStart はその日の 0:00、isDayKey は存在しない日付を弾く', () => {
    expect(keyStart('2026-11-24')).toBe(jst(2026, 11, 24))
    expect(isDayKey('2026-02-29')).toBe(false)
    expect(isDayKey('2028-02-29')).toBe(true)
    expect(isDayKey('2026-1-5')).toBe(false)
  })
})

describe('rangeKeys: 期間で塗る', () => {
  it('両端を含む', () => {
    expect(rangeKeys('2026-11-23', '2026-11-25', false)).toEqual([
      '2026-11-23',
      '2026-11-24',
      '2026-11-25',
    ])
  })

  it('逆順なら入れ替える、1日だけも可', () => {
    expect(rangeKeys('2026-11-25', '2026-11-24', false)).toEqual(['2026-11-24', '2026-11-25'])
    expect(rangeKeys('2026-11-24', '2026-11-24', false)).toEqual(['2026-11-24'])
  })

  it('土日を除く（月をまたぐ）', () => {
    // 11/27(金) 〜 12/1(火)
    expect(rangeKeys('2026-11-27', '2026-12-01', true)).toEqual([
      '2026-11-27',
      '2026-11-30',
      '2026-12-01',
    ])
  })

  it('不正な日付なら空、長すぎる期間は366日で打ち切る', () => {
    expect(rangeKeys('', '2026-11-24', false)).toEqual([])
    expect(rangeKeys('2026-01-01', '2030-01-01', false)).toHaveLength(366)
  })
})

describe('hasUpcoming / pruneSchedule', () => {
  it('過去の日にだけ印があるなら「印なし」扱い', () => {
    expect(hasUpcoming({}, NOW)).toBe(false)
    expect(hasUpcoming({ '2026-11-22': 'practice' }, NOW)).toBe(false)
    expect(hasUpcoming({ '2026-11-23': 'off' }, NOW)).toBe(true)
  })

  it('60日より前の印だけ消える', () => {
    const s: Schedule = {
      '2026-09-23': 'practice', // 61日前
      '2026-09-24': 'practice', // 60日前（残す）
      '2026-11-30': 'off',
    }
    expect(pruneSchedule(s, NOW)).toEqual({ '2026-09-24': 'practice', '2026-11-30': 'off' })
  })
})

describe('isPracticeToday / hoursOn', () => {
  it('今日以降に印がなければ設定のトグルどおり', () => {
    expect(isPracticeToday({ ...S, practiceMode: true }, {}, NOW)).toBe(true)
    expect(todayHours({ ...S, practiceMode: true }, {}, NOW)).toBe(2.5)
    expect(todayHours(S, { '2026-11-01': 'practice' }, NOW)).toBe(4)
  })

  it('印があれば今日の印で自動判定（トグルの設定値は無視）', () => {
    const sch: Schedule = { '2026-11-23': 'practice' }
    expect(isPracticeToday(S, sch, NOW)).toBe(true)
    expect(isPracticeToday({ ...S, practiceMode: true }, { '2026-11-24': 'practice' }, NOW)).toBe(
      false,
    )
  })

  it('日ごとの時間：実習 2.5h／通常 4h／休み 0h／テスト 4h', () => {
    const sch: Schedule = { '2026-11-24': 'practice', '2026-11-25': 'off', '2026-11-27': 'test' }
    expect(hoursOn('2026-11-24', S, sch, NOW)).toBe(2.5)
    expect(hoursOn('2026-11-25', S, sch, NOW)).toBe(0)
    expect(hoursOn('2026-11-26', S, sch, NOW)).toBe(4)
    expect(hoursOn('2026-11-27', S, sch, NOW)).toBe(4)
  })

  it('テストの日は実習中にしない', () => {
    const sch: Schedule = { '2026-11-23': 'test' }
    expect(isPracticeToday(S, sch, NOW)).toBe(false)
    expect(todayHours(S, sch, NOW)).toBe(4)
  })

  it('今日だけの手動上書きが優先、昨日の上書きは無視', () => {
    const sch: Schedule = { '2026-11-23': 'off', '2026-11-30': 'practice' }
    const on = { ...S, practiceOverride: { date: '2026-11-23', on: true } }
    expect(isPracticeToday(on, sch, NOW)).toBe(true)
    expect(todayHours(on, sch, NOW)).toBe(2.5)
    const stale = { ...S, practiceOverride: { date: '2026-11-22', on: true } }
    expect(isPracticeToday(stale, sch, NOW)).toBe(false)
    expect(todayHours(stale, sch, NOW)).toBe(0)
  })
})

describe('availHours', () => {
  it('印がなければ従来の式 (to − from)/1日 × H と一致', () => {
    const due = NOW + 2.5 * DAY_MS
    expect(availHours(NOW, due, S, {}, NOW)).toBeCloseTo(2.5 * 4)
    expect(availHours(NOW, NOW - HOUR_MS, S, {}, NOW)).toBe(0)
  })

  it('実習日・休み・通常日が混ざった期間を日ごとに合計する', () => {
    const sch: Schedule = { '2026-11-24': 'practice', '2026-11-25': 'off' }
    // 11/24 0:00 〜 11/27 0:00 = 実習 2.5 + 休み 0 + 通常 4
    expect(availHours(jst(2026, 11, 24), jst(2026, 11, 27), S, sch, NOW)).toBeCloseTo(6.5)
  })

  it('今日の残り・締切日の途中は割合で数える', () => {
    const sch: Schedule = { '2026-11-24': 'practice' }
    // 今日 10:00〜24:00 は 14/24 × 4h、明日 0:00〜12:00 は 12/24 × 2.5h
    const v = availHours(NOW, jst(2026, 11, 24, 12), S, sch, NOW)
    expect(v).toBeCloseTo((14 / 24) * 4 + (12 / 24) * 2.5)
  })

  it('日をまたがない短い区間（0〜9時の境界を含む）', () => {
    const sch: Schedule = { '2026-11-24': 'off', '2026-11-25': 'practice' }
    // 11/24 23:00 〜 11/25 9:00：休み 1h 分 + 実習 9h 分
    const v = availHours(jst(2026, 11, 24, 23), jst(2026, 11, 25, 9), S, sch, NOW)
    expect(v).toBeCloseTo(0 + (9 / 24) * 2.5)
  })
})
