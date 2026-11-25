import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '../constants'
import { emptyTimetable } from '../logic/timetable'
import { load, save, STORAGE_KEY, type Persisted } from './storage'

function memoryStorage(initial: Record<string, string> = {}) {
  const m = new Map(Object.entries(initial))
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    map: m,
  }
}

const data: Persisted = {
  tasks: [
    { id: 'a', title: '記録', type: 'rec', due: 1, estHours: 2, progress: 20, importance: 3 },
  ],
  done: [
    {
      id: 'b',
      title: '済',
      type: 'etc',
      due: 1,
      estHours: 1,
      progress: 100,
      importance: 1,
      doneAt: 5,
    },
  ],
  settings: {
    practiceMode: true,
    hoursPractice: 3,
    hoursNormal: 5,
    practiceOverride: { date: '2026-11-23', on: false },
  },
  schedule: { '2026-11-24': 'practice', '2026-11-25': 'off' },
  today: { day: '2026-11-24', hours: 1.5 },
  timetable: {
    periods: emptyTimetable().periods,
    saturday: true,
    classes: { '1-1': { name: '解剖学', room: '302' } },
  },
}

describe('storage', () => {
  it('保存した内容をそのまま読み戻せる（キーは nurse-triage-v1）', () => {
    const s = memoryStorage()
    expect(save(data, s)).toBe(true)
    expect(s.map.has(STORAGE_KEY)).toBe(true)
    expect(load(s)).toEqual(data)
  })

  it('undo などの余計なフィールドは保存しない', () => {
    const s = memoryStorage()
    save({ ...data, undo: { x: 1 } } as Persisted, s)
    expect(Object.keys(JSON.parse(s.map.get(STORAGE_KEY)!))).toEqual([
      'tasks',
      'done',
      'settings',
      'schedule',
      'today',
      'timetable',
    ])
  })

  it('データがなければ null', () => {
    expect(load(memoryStorage())).toBeNull()
  })

  it('壊れた JSON でも例外を投げず null', () => {
    expect(load(memoryStorage({ [STORAGE_KEY]: '{oops' }))).toBeNull()
  })

  it('不正な課題は捨て、設定は既定値で補う', () => {
    const raw = JSON.stringify({
      tasks: [data.tasks[0], { id: 'x', title: 'bad', type: 'nope' }, null],
      settings: { hoursNormal: -1 },
    })
    const r = load(memoryStorage({ [STORAGE_KEY]: raw }))!
    expect(r.tasks).toEqual(data.tasks)
    expect(r.done).toEqual([])
    expect(r.settings).toEqual(DEFAULT_SETTINGS)
    expect(r.schedule).toEqual({})
  })

  it('schedule のない旧データも読める', () => {
    const { tasks, done, settings } = data
    const r = load(memoryStorage({ [STORAGE_KEY]: JSON.stringify({ tasks, done, settings }) }))!
    expect(r.tasks).toEqual(tasks)
    expect(r.schedule).toEqual({})
    expect(r.timetable).toEqual(emptyTimetable())
  })

  it('schedule の不正なキー・値と、不正な practiceOverride は捨てる', () => {
    const raw = JSON.stringify({
      ...data,
      settings: { ...data.settings, practiceOverride: { date: '11/23', on: true } },
      schedule: {
        '2026-11-24': 'practice',
        '2026-11-26': 'test',
        '2026-02-30': 'off',
        '2026-11-25': 'holiday',
        foo: 'off',
      },
    })
    const r = load(memoryStorage({ [STORAGE_KEY]: raw }))!
    expect(r.schedule).toEqual({ '2026-11-24': 'practice', '2026-11-26': 'test' })
    expect(r.settings.practiceOverride).toBeUndefined()
  })

  it('今日のぶんの記録がおかしければ捨てる', () => {
    const raw = { ...data, today: { day: 'きのう', hours: -1 } }
    const st = memoryStorage({ [STORAGE_KEY]: JSON.stringify(raw) })
    expect(load(st)?.today).toBeUndefined()
  })

  it('getItem / setItem が例外を投げてもアプリは止まらない', () => {
    const broken = {
      getItem: () => {
        throw new Error('SecurityError')
      },
      setItem: () => {
        throw new Error('QuotaExceededError')
      },
    }
    expect(load(broken)).toBeNull()
    expect(save(data, broken)).toBe(false)
  })
})
