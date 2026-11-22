import { describe, expect, it } from 'vitest'
import { DAY_MS, HOUR_MS } from '../constants'
import {
  formatDue,
  formatHours,
  formatRemaining,
  fromDatetimeLocal,
  toDatetimeLocal,
} from './format'

describe('format', () => {
  it('formatDue: 11/24(火) 8:30', () => {
    expect(formatDue(new Date(2026, 10, 24, 8, 30).getTime())).toBe('11/24(火) 8:30')
    expect(formatDue(new Date(2026, 10, 29, 23, 5).getTime())).toBe('11/29(日) 23:05')
  })

  it('formatRemaining', () => {
    expect(formatRemaining(14.5 * HOUR_MS)).toBe('あと14時間')
    expect(formatRemaining(3.9 * DAY_MS)).toBe('あと3日')
    expect(formatRemaining(45 * 60000)).toBe('あと45分')
    expect(formatRemaining(-2 * HOUR_MS)).toBe('2時間超過')
  })

  it('formatHours', () => {
    expect(formatHours(1.6)).toBe('1.6h')
    expect(formatHours(2)).toBe('2h')
    expect(formatHours(0.84)).toBe('0.8h')
    expect(formatHours(1.96)).toBe('2h')
  })

  it('datetime-local の往復', () => {
    const ms = new Date(2026, 0, 5, 7, 9).getTime()
    expect(toDatetimeLocal(ms)).toBe('2026-01-05T07:09')
    expect(fromDatetimeLocal('2026-01-05T07:09')).toBe(ms)
    expect(fromDatetimeLocal('')).toBeNaN()
  })
})
