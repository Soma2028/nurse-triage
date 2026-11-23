import { describe, expect, it } from 'vitest'
import { DAY_MS } from '../constants'
import type { Settings, Task } from '../types'
import { buildPlan, roundHalf } from './plan'
import { analyse } from './priority'

const NOW = new Date('2026-11-23T09:00:00+09:00').getTime()
const S: Settings = { practiceMode: false, hoursPractice: 2.5, hoursNormal: 4 }

let seq = 0
const task = (estHours: number, dueDays: number, progress = 0): Task => ({
  id: `p${++seq}`,
  title: `課題${seq}`,
  type: 'report',
  due: NOW + dueDays * DAY_MS,
  estHours,
  progress,
  importance: 2,
})

const isHalfStep = (h: number) => Number.isInteger(h * 2)

describe('roundHalf', () => {
  it('0.5h単位に丸め、最小0.5h', () => {
    expect(roundHalf(1.6)).toBe(1.5)
    expect(roundHalf(1.8)).toBe(2)
    expect(roundHalf(0.1)).toBe(0.5)
  })
})

describe('buildPlan', () => {
  it('合計が H を超えず、0.5h単位で、余りが正しい', () => {
    const tasks = [task(1.6, 1), task(3, 2), task(5, 4)]
    const plan = buildPlan(analyse(tasks, S, NOW), 4)
    expect(plan.used).toBeLessThanOrEqual(4)
    expect(plan.items.every((i) => isHalfStep(i.hours) && i.hours >= 0.5)).toBe(true)
    expect(plan.free).toBeCloseTo(plan.hours - plan.used)
    expect(plan.items.map((i) => i.hours)).toEqual([1.5, 2.5])
    expect(plan.free).toBe(0)
  })

  it('並び順の上から割り振る', () => {
    const analysed = analyse([task(1, 20), task(1, 0.5)], S, NOW)
    const plan = buildPlan(analysed, 4)
    expect(plan.items.map((i) => i.task.id)).toEqual(analysed.map((a) => a.task.id))
  })

  it('作業が H より少なければ余りが「空き」になる', () => {
    const plan = buildPlan(analyse([task(1, 2), task(0.2, 3)], S, NOW), 4)
    expect(plan.items.map((i) => i.hours)).toEqual([1, 0.5])
    expect(plan.used).toBe(1.5)
    expect(plan.free).toBe(2.5)
  })

  it('remain = 0 の課題には割り振らない', () => {
    const plan = buildPlan(analyse([task(2, 2, 100), task(1, 3)], S, NOW), 4)
    expect(plan.items).toHaveLength(1)
    expect(plan.free).toBe(3)
  })

  it('H が0.5の倍数でなくても合計は H を超えない', () => {
    const plan = buildPlan(analyse([task(10, 2)], S, NOW), 2.3)
    expect(plan.used).toBe(2)
    expect(plan.free).toBeCloseTo(0.3)
  })

  it('課題がなければ全部空き', () => {
    const plan = buildPlan([], 2.5)
    expect(plan.items).toEqual([])
    expect(plan.free).toBe(2.5)
  })
})

describe('buildPlan: 黒（締切過ぎ）', () => {
  it('残り作業があれば黒も入り、一番先に割り振る', () => {
    const late = task(1.5, -1) // 1日前に締切
    const soon = task(3, 1)
    const plan = buildPlan(analyse([soon, late], S, NOW), 4)
    expect(plan.items.map((i) => [i.task.id, i.triage, i.hours])).toEqual([
      [late.id, 'black', 1.5],
      [soon.id, 'red', 2.5],
    ])
  })

  it('残り作業がない黒（進捗100%で未完了）は入れない', () => {
    const late = task(2, -1, 100)
    const plan = buildPlan(analyse([late], S, NOW), 4)
    expect(plan.items).toEqual([])
    expect(plan.free).toBe(4)
  })
})
