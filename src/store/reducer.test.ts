import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '../constants'
import type { Task } from '../types'
import { initState, reducer, type State } from './reducer'
import { daysFromToday, sampleTasks } from './sample'

const NOW = new Date('2026-11-23T21:00:00+09:00').getTime()

const t = (id: string, progress = 0): Task => ({
  id,
  title: `課題${id}`,
  type: 'report',
  due: NOW + 1e8,
  estHours: 2,
  progress,
  importance: 2,
})

const base = (): State => ({
  tasks: [t('a', 50), t('b', 80)],
  done: [],
  settings: { ...DEFAULT_SETTINGS },
  schedule: {},
  undo: null,
})

describe('reducer', () => {
  it('add / update', () => {
    let s = reducer(base(), { type: 'add', task: t('c') })
    expect(s.tasks.map((x) => x.id)).toEqual(['a', 'b', 'c'])
    s = reducer(s, { type: 'update', task: { ...t('c'), title: '変更' } })
    expect(s.tasks[2].title).toBe('変更')
  })

  it('完了すると done に移り、元に戻せる', () => {
    const before = base()
    const s = reducer(before, { type: 'complete', id: 'a', now: NOW })
    expect(s.tasks.map((x) => x.id)).toEqual(['b'])
    expect(s.done[0]).toMatchObject({ id: 'a', doneAt: NOW, progress: 50 })
    expect(s.undo?.kind).toBe('complete')
    const u = reducer(s, { type: 'undo' })
    expect(u).toEqual(before)
  })

  it('進捗+25%、100%になったら自動で完了', () => {
    let s = reducer(base(), { type: 'advance', id: 'a', now: NOW })
    expect(s.tasks[0].progress).toBe(75)
    expect(s.undo).toBeNull()
    s = reducer(s, { type: 'advance', id: 'b', now: NOW }) // 80 → 100
    expect(s.tasks.map((x) => x.id)).toEqual(['a'])
    expect(s.done[0]).toMatchObject({ id: 'b', progress: 100, doneAt: NOW })
    expect(s.undo?.kind).toBe('complete')
  })

  it('削除は元に戻せる', () => {
    const before = base()
    const s = reducer(before, { type: 'remove', id: 'b', now: NOW })
    expect(s.tasks.map((x) => x.id)).toEqual(['a'])
    expect(s.undo?.message).toContain('課題b')
    expect(reducer(s, { type: 'undo' })).toEqual(before)
  })

  it('すべて消すは元に戻せる。保持するのは直前の1つだけ', () => {
    let s = reducer(base(), { type: 'complete', id: 'a', now: NOW })
    const afterComplete = s
    s = reducer(s, { type: 'clearAll', now: NOW })
    expect(s.tasks).toEqual([])
    expect(s.done).toEqual([])
    s = reducer(s, { type: 'undo' })
    expect(s.tasks).toEqual(afterComplete.tasks)
    expect(s.done).toEqual(afterComplete.done)
    expect(s.undo).toBeNull()
    // 2回目の undo では何も起きない
    expect(reducer(s, { type: 'undo' })).toBe(s)
  })

  it('「戻す」で未完了に戻る（doneAt を外す。100%なら90%に）', () => {
    let s = reducer(base(), { type: 'advance', id: 'b', now: NOW })
    s = reducer(s, { type: 'restore', id: 'b' })
    const b = s.tasks.find((x) => x.id === 'b')!
    expect(b.doneAt).toBeUndefined()
    expect('doneAt' in b).toBe(false)
    expect(b.progress).toBe(90)
    expect(s.done).toEqual([])
  })

  it('設定の変更はモードごとの値を別々に持つ', () => {
    let s = reducer(base(), { type: 'setSettings', patch: { practiceMode: true } })
    s = reducer(s, { type: 'setSettings', patch: { hoursPractice: 3 } })
    expect(s.settings).toEqual({ practiceMode: true, hoursPractice: 3, hoursNormal: 4 })
  })

  it('dismissUndo でトースト用の履歴を消す', () => {
    const s = reducer(base(), { type: 'remove', id: 'a', now: NOW })
    expect(reducer(s, { type: 'dismissUndo' }).undo).toBeNull()
  })
})

describe('initState / sample', () => {
  it('保存データがなければサンプル課題・初期設定で始める', () => {
    const s = initState(NOW, null)
    expect(s.tasks).toHaveLength(7)
    expect(s.schedule).toEqual({})
    expect(s.settings).toEqual({ practiceMode: false, hoursPractice: 2.5, hoursNormal: 4 })
  })

  it('保存データがあればそれを使う', () => {
    const p = {
      tasks: [t('z')],
      done: [],
      settings: { ...DEFAULT_SETTINGS, practiceMode: true },
      schedule: {},
    }
    expect(initState(NOW, p)).toEqual({ ...p, undo: null })
  })

  it('サンプルの締切は「今日から○日後」の指定時刻', () => {
    let n = 0
    const tasks = sampleTasks(NOW, () => `s${n++}`)
    const rec = tasks[0]
    expect(rec.title).toBe('実習記録（3日目）')
    const due = new Date(rec.due)
    const tomorrow = new Date(NOW)
    tomorrow.setDate(tomorrow.getDate() + 1)
    expect(due.getDate()).toBe(tomorrow.getDate())
    expect([due.getHours(), due.getMinutes()]).toEqual([8, 30])
    expect(tasks[4].due).toBe(daysFromToday(NOW, 9, 23, 59))
    expect(new Set(tasks.map((x) => x.id)).size).toBe(7)
  })
})

describe('reducer: 実習スケジュール', () => {
  // NOW = 2026-11-23(月) 21:00
  it('setDays で印を付け外しする（期間でも1日でも）', () => {
    let s = reducer(base(), {
      type: 'setDays',
      dates: ['2026-11-24', '2026-11-25'],
      kind: 'practice',
    })
    expect(s.schedule).toEqual({ '2026-11-24': 'practice', '2026-11-25': 'practice' })
    s = reducer(s, { type: 'setDays', dates: ['2026-11-25'], kind: 'off' })
    s = reducer(s, { type: 'setDays', dates: ['2026-11-24'], kind: null })
    expect(s.schedule).toEqual({ '2026-11-25': 'off' })
  })

  it('印がなければトグルは practiceMode を切り替える（今までどおり）', () => {
    const s = reducer(base(), { type: 'togglePracticeToday', now: NOW })
    expect(s.settings.practiceMode).toBe(true)
    expect(s.settings.practiceOverride).toBeUndefined()
  })

  it('印があればトグルは「今日だけ」の上書き。自動と同じ値に戻すと上書きを消す', () => {
    let s: State = { ...base(), schedule: { '2026-11-23': 'practice' } }
    s = reducer(s, { type: 'togglePracticeToday', now: NOW })
    expect(s.settings.practiceOverride).toEqual({ date: '2026-11-23', on: false })
    expect(s.settings.practiceMode).toBe(false)
    s = reducer(s, { type: 'togglePracticeToday', now: NOW })
    expect(s.settings.practiceOverride).toBeUndefined()
  })

  it('完了を元に戻しても、その後に変えた設定・スケジュールは戻らない', () => {
    let s = reducer(base(), { type: 'complete', id: 'a', now: NOW })
    s = reducer(s, { type: 'setDays', dates: ['2026-11-24'], kind: 'off' })
    s = reducer(s, { type: 'setSettings', patch: { hoursNormal: 6 } })
    s = reducer(s, { type: 'undo' })
    expect(s.tasks.map((x) => x.id)).toEqual(['a', 'b'])
    expect(s.schedule).toEqual({ '2026-11-24': 'off' })
    expect(s.settings.hoursNormal).toBe(6)
  })

  it('すべて消す・サンプルに戻すはスケジュールを消さない', () => {
    let s: State = { ...base(), schedule: { '2026-11-24': 'off' } }
    s = reducer(s, { type: 'clearAll', now: NOW })
    s = reducer(s, { type: 'resetSample', now: NOW, tasks: [] })
    expect(s.schedule).toEqual({ '2026-11-24': 'off' })
  })

  it('起動時に60日より前の印を消す', () => {
    const p = {
      tasks: [],
      done: [],
      settings: { ...DEFAULT_SETTINGS },
      schedule: { '2026-09-01': 'practice' as const, '2026-11-24': 'off' as const },
    }
    expect(initState(NOW, p).schedule).toEqual({ '2026-11-24': 'off' })
  })
})
