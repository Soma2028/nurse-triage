import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '../constants'
import type { Timetable } from '../types'
import {
  cleanSlot,
  emptyTimetable,
  fromTimeInput,
  toTimeInput,
  toTimetable,
  todayClasses,
} from './timetable'

// 2026-11-25 は水曜日
const at = (hm: string, date = '2026-11-25') => new Date(`${date}T${hm}:00+09:00`).getTime()

const tt = (): Timetable => ({
  ...emptyTimetable(),
  classes: {
    '3-1': { name: '成人看護学', room: '302' },
    '3-3': { name: '薬理学' },
    '4-1': { name: '木曜の授業' },
    '6-1': { name: '土曜の授業' },
  },
})

describe('todayClasses', () => {
  it('今日の曜日の授業を時限の順に、終わった・いま・これからで返す', () => {
    const list = todayClasses(tt(), DEFAULT_SETTINGS, {}, at('09:30'))
    expect(list.map((c) => [c.period, c.slot.name, c.state])).toEqual([
      [1, '成人看護学', 'now'],
      [3, '薬理学', 'later'],
    ])
    const later = todayClasses(tt(), DEFAULT_SETTINGS, {}, at('13:00'))
    expect(later.map((c) => c.state)).toEqual(['past', 'now'])
  })

  it('実習の日・休みの日は出さない。テストの日は出す', () => {
    expect(todayClasses(tt(), DEFAULT_SETTINGS, { '2026-11-25': 'practice' }, at('08:00'))).toEqual(
      [],
    )
    expect(todayClasses(tt(), DEFAULT_SETTINGS, { '2026-11-25': 'off' }, at('08:00'))).toEqual([])
    expect(
      todayClasses(tt(), DEFAULT_SETTINGS, { '2026-11-25': 'test' }, at('08:00')),
    ).toHaveLength(2)
    const practice = { ...DEFAULT_SETTINGS, practiceMode: true }
    expect(todayClasses(tt(), practice, {}, at('08:00'))).toEqual([])
  })

  it('土曜日は、土曜日を使うときだけ', () => {
    const sat = at('08:00', '2026-11-28')
    expect(todayClasses(tt(), DEFAULT_SETTINGS, {}, sat)).toEqual([])
    expect(todayClasses({ ...tt(), saturday: true }, DEFAULT_SETTINGS, {}, sat)).toHaveLength(1)
  })
})

describe('toTimetable', () => {
  it('壊れたところは初期値で補い、おかしなコマは捨てる', () => {
    const t = toTimetable({
      periods: [
        { start: '8:50', end: '10:20' },
        { start: '25:00', end: 'x' },
      ],
      saturday: 'yes',
      classes: {
        '1-1': { name: ' 解剖学 ', room: '' },
        '7-1': { name: '日曜' },
        '1-9': { name: '9限' },
        '2-2': { name: '  ' },
        '2-3': 'x',
      },
    })
    expect(t.periods[0]).toEqual({ start: '8:50', end: '10:20' })
    expect(t.periods[1]).toEqual(emptyTimetable().periods[1])
    expect(t.periods).toHaveLength(6)
    expect(t.saturday).toBe(false)
    expect(t.classes).toEqual({ '1-1': { name: '解剖学' } })
    expect(toTimetable(null)).toEqual(emptyTimetable())
  })
})

describe('小さな関数', () => {
  it('cleanSlot は名前がなければ null', () => {
    expect(cleanSlot('  ', '302')).toBeNull()
    expect(cleanSlot('薬理学', ' 302 ')).toEqual({ name: '薬理学', room: '302' })
  })

  it('時刻の入力欄の値と行き来できる', () => {
    expect(fromTimeInput('09:05')).toBe('9:05')
    expect(fromTimeInput('13:00')).toBe('13:00')
    expect(fromTimeInput('')).toBe('')
    expect(toTimeInput('9:05')).toBe('09:05')
  })
})
