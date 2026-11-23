import { describe, expect, it } from 'vitest'
import { DAY_MS, HOUR_MS } from '../constants'
import type { Schedule, Settings, Task } from '../types'
import { dayNote, homeView } from './home'
import { buildPlan } from './plan'
import { analyse } from './priority'
import { addDays, dayKey } from './schedule'

const NOW = new Date('2026-11-24T09:00:00+09:00').getTime()
const S: Settings = { practiceMode: false, hoursPractice: 2.5, hoursNormal: 4 }

let seq = 0
const task = (dueIn: number, estHours: number, over: Partial<Task> = {}): Task => ({
  id: `h${++seq}`,
  title: `課題${seq}`,
  type: 'report',
  due: NOW + dueIn,
  estHours,
  progress: 0,
  importance: 2,
  ...over,
})

describe('homeView', () => {
  it('つぎにやるは黒・赤の先頭。ほかの急ぎは、今日のプランに入らなかった黒・赤だけ', () => {
    const late = task(-HOUR_MS, 1) // 黒
    const red1 = task(5 * HOUR_MS, 2) // 赤（24時間以内）
    const red2 = task(10 * HOUR_MS, 3) // 赤。H=4 なので、プランには入らない
    const green = task(20 * DAY_MS, 1)
    const analysed = analyse([green, red2, red1, late], S, NOW)
    const plan = buildPlan(analysed, 4)
    const v = homeView(analysed, plan)
    expect(v.next?.task.id).toBe(late.id)
    expect(plan.items.map((i) => i.task.id)).toEqual([late.id, red1.id, red2.id])
    expect(v.urgent).toEqual([])

    const tight = buildPlan(analysed, 1)
    expect(homeView(analysed, tight).urgent.map((a) => a.task.id)).toEqual([red1.id, red2.id])
  })

  it('黒・赤がなければ、つぎにやるも急ぎもない（プランだけ）', () => {
    const analysed = analyse([task(10 * DAY_MS, 1), task(20 * DAY_MS, 1)], S, NOW)
    expect(homeView(analysed, buildPlan(analysed, 4))).toEqual({ next: undefined, urgent: [] })
  })

  it('課題がなければ空', () => {
    expect(homeView([], buildPlan([], 4))).toEqual({ next: undefined, urgent: [] })
  })
})

describe('dayNote：今日使える時間の理由', () => {
  const today = dayKey(NOW)
  const later = addDays(today, 3)

  it('スケジュールがなければ、設定の「実習期間中」で決まる', () => {
    expect(dayNote(S, {}, NOW)).toBeNull()
    expect(dayNote({ ...S, practiceMode: true }, {}, NOW)).toBe('今日は実習日')
  })

  it('スケジュールの印で決まる（実習・休み・印なし）', () => {
    const practice: Schedule = { [today]: 'practice' }
    const off: Schedule = { [today]: 'off', [later]: 'practice' }
    const plain: Schedule = { [later]: 'practice' }
    expect(dayNote(S, practice, NOW)).toBe('今日は実習日')
    expect(dayNote(S, off, NOW)).toBe('今日は休み')
    expect(dayNote(S, plain, NOW)).toBeNull()
  })

  it('今日だけ手で切り替えたときは、それに合わせる', () => {
    const off: Schedule = { [today]: 'off' }
    const on = { ...S, practiceOverride: { date: today, on: true } }
    const offOverride = { ...S, practiceOverride: { date: today, on: false } }
    expect(dayNote(on, off, NOW)).toBe('今日は実習日')
    // 休みの日を手でふだんの日に戻したら、休みとは出さない
    expect(dayNote(offOverride, off, NOW)).toBeNull()
  })
})
