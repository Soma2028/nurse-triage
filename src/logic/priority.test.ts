import { describe, expect, it } from 'vitest'
import { DAY_MS, HOUR_MS } from '../constants'
import type { Settings, Task } from '../types'
import { analyse, countByTriage, firstShortage, remainHours } from './priority'

const NOW = new Date('2026-11-23T09:00:00+09:00').getTime()

const NORMAL: Settings = { practiceMode: false, hoursPractice: 2.5, hoursNormal: 2 }

let seq = 0
function task(p: Partial<Task> & { dueIn: number }): Task {
  const { dueIn, ...rest } = p
  return {
    id: `t${++seq}`,
    title: rest.title ?? `課題${seq}`,
    type: 'report',
    estHours: 1,
    progress: 0,
    importance: 2,
    due: NOW + dueIn,
    ...rest,
  }
}

const find = (r: ReturnType<typeof analyse>, id: string) => r.find((a) => a.task.id === id)!

describe('analyse: トリアージ判定', () => {
  it('締切が過ぎた課題は黒「締切過ぎ」', () => {
    const t = task({ dueIn: -1 * HOUR_MS })
    const [a] = analyse([t], NORMAL, NOW)
    expect(a.triage).toBe('black')
    expect(a.label).toBe('締切過ぎ')
    expect(a.avail).toBe(0)
  })

  it('締切ちょうどはまだ赤、1分過ぎ・1日過ぎは黒', () => {
    const just = task({ dueIn: 0 })
    const min1 = task({ dueIn: -60 * 1000 })
    const day1 = task({ dueIn: -DAY_MS })
    const r = analyse([just, min1, day1], NORMAL, NOW)
    expect(find(r, just.id)).toMatchObject({ triage: 'red', label: '今すぐ' })
    expect(find(r, min1.id)).toMatchObject({ triage: 'black', label: '締切過ぎ' })
    expect(find(r, day1.id)).toMatchObject({ triage: 'black', label: '締切過ぎ' })
  })

  it('完了した課題は、締切を過ぎていても出さない', () => {
    const done = task({ dueIn: -DAY_MS, doneAt: NOW - 2 * DAY_MS })
    expect(analyse([done], NORMAL, NOW)).toEqual([])
  })

  it('24時間以内の課題は（作業量が小さくても）赤「今すぐ」', () => {
    const t = task({ dueIn: 23 * HOUR_MS, estHours: 0.5, progress: 90 })
    const [a] = analyse([t], NORMAL, NOW)
    expect(a.ratio).toBeLessThan(0.3)
    expect(a.triage).toBe('red')
    expect(a.label).toBe('今すぐ')
  })

  it('ratio ≥ 0.7 なら24時間より先でも赤', () => {
    // 2日後・H=2 → avail 4h、remain 3h → ratio 0.75
    const [a] = analyse([task({ dueIn: 2 * DAY_MS, estHours: 3 })], NORMAL, NOW)
    expect(a.ratio).toBeCloseTo(0.75)
    expect(a.triage).toBe('red')
  })

  it('3日以内 or ratio ≥ 0.3 なら黄、それ以外は緑', () => {
    const near = task({ dueIn: 3 * DAY_MS, estHours: 0.5 }) // ratio 0.083・3日以内
    const busy = task({ dueIn: 10 * DAY_MS, estHours: 7 }) // avail 20h → ratio 0.35
    const calm = task({ dueIn: 10 * DAY_MS, estHours: 5 }) // ratio 0.25
    const r = analyse([near, busy, calm], NORMAL, NOW)
    expect(find(r, near.id).triage).toBe('yellow')
    expect(find(r, busy.id).triage).toBe('yellow')
    expect(find(r, calm.id).triage).toBe('green')
    expect(find(r, calm.id).label).toBe('計画的に')
  })
})

describe('analyse: 締切順の積み上げ（shortage）', () => {
  // H = 2h/日
  // A: 5日後・残り9.5h（avail 10h）
  // B: 6日後・残り3.5h（avail 12h → ratio 0.29 で単体なら緑）
  // A+B = 13h > 12h → B は 1h 不足
  const A = task({ title: 'A', dueIn: 5 * DAY_MS, estHours: 9.5 })
  const B = task({ title: 'B', dueIn: 6 * DAY_MS, estHours: 3.5 })

  it('単体では間に合う課題は緑', () => {
    const [b] = analyse([B], NORMAL, NOW)
    expect(b.shortage).toBe(0)
    expect(b.triage).toBe('green')
  })

  it('締切の早い課題と合わせると足りない課題に shortage > 0 が付き、赤になる', () => {
    const r = analyse([B, A], NORMAL, NOW)
    const b = find(r, B.id)
    expect(b.ratio).toBeLessThan(0.3)
    expect(b.shortage).toBeCloseTo(1)
    expect(b.triage).toBe('red')
    expect(b.label).toBe('今すぐ')
    expect(find(r, A.id).shortage).toBe(0)
    expect(firstShortage(r)?.task.id).toBe(B.id)
  })

  it('締切の遅い課題は、早い課題の shortage に影響しない', () => {
    const later = task({ dueIn: 7 * DAY_MS, estHours: 50 })
    const r = analyse([A, later], NORMAL, NOW)
    expect(find(r, A.id).shortage).toBe(0)
  })

  it('完了済み（doneAt あり）の課題は評価にも積み上げにも含めない', () => {
    const doneA = { ...A, doneAt: NOW }
    const r = analyse([B, doneA], NORMAL, NOW)
    expect(r).toHaveLength(1)
    expect(r[0].shortage).toBe(0)
  })
})

describe('analyse: 実習モード', () => {
  it('実習モードに切り替えると rec / proc の score が上がり、他の種類は変わらない', () => {
    // H の違いの影響を除くため、両モードの時間を同じにする
    const off: Settings = { practiceMode: false, hoursPractice: 3, hoursNormal: 3 }
    const on: Settings = { ...off, practiceMode: true }
    const tasks = [
      task({ type: 'rec', dueIn: 2 * DAY_MS }),
      task({ type: 'proc', dueIn: 2 * DAY_MS }),
      task({ type: 'report', dueIn: 2 * DAY_MS }),
    ]
    const before = analyse(tasks, off, NOW)
    const after = analyse(tasks, on, NOW)
    for (const t of tasks) {
      const b = find(before, t.id).score
      const a = find(after, t.id).score
      if (t.type === 'report') expect(a).toBeCloseTo(b)
      else expect(a).toBeGreaterThan(b)
    }
  })

  it('実習モードでは hoursPractice を1日の時間として使う', () => {
    const t = task({ dueIn: 2 * DAY_MS })
    const [a] = analyse([t], { practiceMode: true, hoursPractice: 2.5, hoursNormal: 4 }, NOW)
    expect(a.avail).toBeCloseTo(5)
  })
})

describe('analyse: 残り時間と並び順', () => {
  it('進捗100%の課題は remain = 0', () => {
    const t = task({ dueIn: 5 * DAY_MS, estHours: 4, progress: 100 })
    expect(remainHours(t)).toBe(0)
    expect(analyse([t], NORMAL, NOW)[0].remain).toBe(0)
  })

  it('remain = estHours × (1 − progress/100)', () => {
    expect(remainHours(task({ dueIn: DAY_MS, estHours: 2, progress: 20 }))).toBeCloseTo(1.6)
  })

  it('赤 → 黄 → 緑、同じ色の中は score の高い順', () => {
    const green = task({ dueIn: 20 * DAY_MS, estHours: 1 })
    const yellow = task({ dueIn: 3 * DAY_MS, estHours: 1 })
    const redLow = task({ dueIn: 12 * HOUR_MS, estHours: 0.5, importance: 1 })
    const redHigh = task({ dueIn: 12 * HOUR_MS, estHours: 0.5, importance: 3 })
    const r = analyse([green, yellow, redLow, redHigh], NORMAL, NOW)
    expect(r.map((a) => a.task.id)).toEqual([redHigh.id, redLow.id, yellow.id, green.id])
    expect(r[0].score).toBeGreaterThan(r[1].score)
  })

  it('score は式どおり', () => {
    // 2日後・H=2 → avail 4、remain 1 → ratio 0.25
    // (0.6 × 0.25/2 + 0.4 × 1/3) × 1.0 × 1.0 × 100
    const [a] = analyse([task({ dueIn: 2 * DAY_MS })], NORMAL, NOW)
    expect(a.score).toBeCloseTo((0.6 * 0.125 + 0.4 / 3) * 100)
  })
})

describe('analyse: 実習スケジュール', () => {
  // NOW = 2026-11-23(月) 9:00 JST
  const off3: Record<string, 'off'> = {
    '2026-11-24': 'off',
    '2026-11-25': 'off',
    '2026-11-26': 'off',
  }

  it('休みの日を入れると使える時間が減り、shortage が増えて赤になる', () => {
    // 5日後締切・残り12h、H=4 → 印なしなら avail 20h・ratio 0.6（黄）
    const t = task({ dueIn: 5 * DAY_MS, estHours: 12 })
    const S4: Settings = { practiceMode: false, hoursPractice: 2.5, hoursNormal: 4 }
    const [before] = analyse([t], S4, NOW)
    expect(before.avail).toBeCloseTo(20)
    expect(before.triage).toBe('yellow')
    const [after] = analyse([t], S4, NOW, off3)
    expect(after.avail).toBeCloseTo(8)
    expect(after.shortage).toBeCloseTo(4)
    expect(after.triage).toBe('red')
  })

  it('今日が実習日なら（トグルが OFF でも）rec / proc の score が上がる', () => {
    const rec = task({ type: 'rec', dueIn: 2 * DAY_MS })
    const S3: Settings = { practiceMode: false, hoursPractice: 3, hoursNormal: 3 }
    const plain = analyse([rec], S3, NOW, { '2026-11-24': 'practice' })[0].score
    const practice = analyse([rec], S3, NOW, {
      '2026-11-23': 'practice',
      '2026-11-24': 'practice',
    })[0].score
    expect(practice).toBeGreaterThan(plain)
  })
})

describe('analyse: 黒（締切過ぎ）の並び順と集計', () => {
  const black = () => task({ dueIn: -2 * HOUR_MS, estHours: 0.5, importance: 1 })
  const red = () => task({ dueIn: 5 * HOUR_MS, estHours: 1, importance: 3 }) // 24時間以内 → 赤
  const yellow = () => task({ dueIn: 3 * DAY_MS, estHours: 0.5 })
  const green = () => task({ dueIn: 20 * DAY_MS, estHours: 1 })

  it('黒 → 赤 → 黄 → 緑（黒は score が低くても一番上）', () => {
    const tasks = [green(), yellow(), red(), black()]
    const r = analyse(tasks, NORMAL, NOW)
    expect(r.map((a) => a.triage)).toEqual(['black', 'red', 'yellow', 'green'])
    expect(r[0].score).toBeLessThan(r[1].score)
  })

  it('黒が2件なら、同じ黒の中は score の高い順', () => {
    const small = task({ dueIn: -HOUR_MS, estHours: 0.5, importance: 1 })
    const big = task({ dueIn: -HOUR_MS, estHours: 4, importance: 3 })
    const r = analyse([small, big, red()], NORMAL, NOW)
    expect(r.map((a) => a.task.id)).toEqual([big.id, small.id, expect.any(String)])
  })

  it('集計：赤の件数に黒を含めない', () => {
    const r = analyse([black(), black(), red(), yellow(), green()], NORMAL, NOW)
    expect(countByTriage(r)).toEqual({ black: 2, red: 1, yellow: 1, green: 1 })
    expect(countByTriage([])).toEqual({ black: 0, red: 0, yellow: 0, green: 0 })
  })

  it('時間不足の警告は黒を除く', () => {
    const r = analyse([task({ dueIn: -HOUR_MS, estHours: 10 })], NORMAL, NOW)
    expect(r[0].shortage).toBeGreaterThan(0)
    expect(firstShortage(r)).toBeUndefined()
  })
})
