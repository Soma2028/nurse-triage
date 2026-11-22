import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '../constants'
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
  settings: { practiceMode: true, hoursPractice: 3, hoursNormal: 5 },
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
    expect(Object.keys(JSON.parse(s.map.get(STORAGE_KEY)!))).toEqual(['tasks', 'done', 'settings'])
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
