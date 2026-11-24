import { describe, expect, it } from 'vitest'
import type { Analysed, Task } from '../types'
import { computeProgress, progressText } from './progress'

const NOW = new Date('2026-11-24T21:00:00+09:00').getTime()
const at = (iso: string) => new Date(iso).getTime()
const task = (doneAt?: number): Task => ({
  id: String(doneAt),
  title: '関連図（A氏）',
  type: 'proc',
  due: NOW,
  estHours: 1,
  progress: 100,
  importance: 2,
  doneAt,
})
const analysed = (triage: Analysed['triage']) => ({ triage }) as Analysed

describe('computeProgress', () => {
  it('今日（端末の日付）に完了にした数と、いまの赤の数', () => {
    const done = [
      task(at('2026-11-24T00:10:00+09:00')),
      task(at('2026-11-24T20:59:00+09:00')),
      task(at('2026-11-23T23:59:00+09:00')), // 昨日
      task(undefined),
    ]
    const list = [analysed('red'), analysed('black'), analysed('red'), analysed('green')]
    expect(computeProgress(done, list, NOW)).toEqual({
      day: '2026-11-24',
      doneCount: 2,
      redCount: 2,
    })
  })

  it('課題名などは含まない（数と日付だけ）', () => {
    expect(Object.keys(computeProgress([task(NOW)], [], NOW)).sort()).toEqual([
      'day',
      'doneCount',
      'redCount',
    ])
  })
})

describe('progressText', () => {
  it('今日の分なら数、前の日の分なら「今日はまだ」、なければ出さない', () => {
    const p = { day: '2026-11-24', doneCount: 3, redCount: 1, updatedAt: 0 }
    expect(progressText(p, '2026-11-24')).toBe('今日 3件完了 ・ 赤 1')
    expect(progressText(p, '2026-11-25')).toBe('今日はまだ')
    expect(progressText(null, '2026-11-24')).toBeNull()
  })
})
