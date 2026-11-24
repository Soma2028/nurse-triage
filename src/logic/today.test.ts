import { describe, expect, it } from 'vitest'
import type { Plan } from '../types'
import { addWork, todayProgress, workOf, workedToday } from './today'

const NOW = new Date('2026-11-24T21:00:00+09:00').getTime()
const NEXT_DAY = new Date('2026-11-25T08:00:00+09:00').getTime()

const plan = (hours: number, used: number): Plan => ({ hours, items: [], used, free: hours - used })

describe('today', () => {
  it('進めた時間は見込み時間 × 進めた割合', () => {
    expect(workOf({ estHours: 4 }, 25, 50)).toBe(1)
    expect(workOf({ estHours: 2 }, 50, 25)).toBe(-0.5)
  })

  it('同じ日なら足し、日付が変わったら0から数える。マイナスにはしない', () => {
    let log = addWork(undefined, NOW, 1.5)
    log = addWork(log, NOW, 0.5)
    expect(log).toEqual({ day: '2026-11-24', hours: 2 })
    expect(workedToday(log, NOW)).toBe(2)
    expect(workedToday(log, NEXT_DAY)).toBe(0)
    expect(addWork(log, NEXT_DAY, 1)).toEqual({ day: '2026-11-25', hours: 1 })
    expect(addWork(log, NOW, -5).hours).toBe(0)
  })

  it('目安は使える時間。課題が少なければ、進めた分＋残りの割り振り', () => {
    expect(todayProgress(1.5, plan(4, 4))).toEqual({ worked: 1.5, target: 4, ratio: 0.375 })
    expect(todayProgress(1, plan(4, 1))).toEqual({ worked: 1, target: 2, ratio: 0.5 })
    expect(todayProgress(5, plan(4, 4)).ratio).toBe(1)
    expect(todayProgress(0, plan(0, 0))).toEqual({ worked: 0, target: 0, ratio: 0 })
  })
})
