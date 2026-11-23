import { describe, expect, it } from 'vitest'
import type { Schedule, Settings, Task } from '../types'
import { markRun, monthCells, tasksByDay } from './calendar'
import { analyse } from './priority'

describe('monthCells', () => {
  it('月曜始まりで、前後を null で埋めて7の倍数にする', () => {
    // 2026年11月1日は日曜 → 前に6つ空き、30日まで、後ろに6つ空き（計42）
    const cells = monthCells('2026-11')
    expect(cells.length % 7).toBe(0)
    expect(cells.slice(0, 7)).toEqual([null, null, null, null, null, null, '2026-11-01'])
    expect(cells.filter(Boolean)).toHaveLength(30)
    expect(cells.at(-1)).toBeNull()
  })

  it('2026年2月（月曜始まりではない28日の月）', () => {
    const cells = monthCells('2026-02')
    expect(cells.length % 7).toBe(0)
    expect(cells.filter(Boolean)).toHaveLength(28)
  })
})

describe('tasksByDay', () => {
  const S: Settings = { practiceMode: false, hoursPractice: 2.5, hoursNormal: 4 }
  const NOW = new Date('2026-11-24T09:00:00+09:00').getTime()
  const t = (id: string, iso: string): Task => ({
    id,
    title: id,
    type: 'report',
    due: new Date(iso).getTime(),
    estHours: 1,
    progress: 0,
    importance: 2,
  })

  it('締切の日（日本時間）ごとにまとめ、同じ日の中は締切の早い順', () => {
    const map = tasksByDay(
      analyse(
        [
          t('夜', '2026-11-26T23:59:00+09:00'),
          t('朝', '2026-11-26T08:30:00+09:00'),
          // UTC ではまだ 11/26 だが、日本時間では 11/27 の 0:30
          t('深夜', '2026-11-27T00:30:00+09:00'),
        ],
        S,
        NOW,
      ),
    )
    expect(map.get('2026-11-26')?.map((a) => a.task.id)).toEqual(['朝', '夜'])
    expect(map.get('2026-11-27')?.map((a) => a.task.id)).toEqual(['深夜'])
  })
})

describe('markRun：続いている期間', () => {
  // 2026-11-23(月) 〜 12-04(金) の平日が実習（土日は印なし）、12-05(土) は休み
  const schedule: Schedule = {}
  for (const d of ['23', '24', '25', '26', '27', '30']) schedule[`2026-11-${d}`] = 'practice'
  for (const d of ['01', '02', '03', '04']) schedule[`2026-12-${d}`] = 'practice'
  schedule['2026-12-05'] = 'off'

  it('印のない土日をまたいで、同じ印の日をまとめる', () => {
    expect(markRun(schedule, '2026-11-25')).toEqual([
      '2026-11-23',
      '2026-11-24',
      '2026-11-25',
      '2026-11-26',
      '2026-11-27',
      '2026-11-30',
      '2026-12-01',
      '2026-12-02',
      '2026-12-03',
      '2026-12-04',
    ])
  })

  it('土日に休みの印があっても、またいで1つの期間にする', () => {
    const withOffSat: Schedule = { ...schedule, '2026-11-28': 'off' }
    expect(markRun(withOffSat, '2026-11-25')).toHaveLength(10)
  })

  it('別の印の平日や、印のない平日で切れる', () => {
    expect(markRun(schedule, '2026-12-05')).toEqual(['2026-12-05'])
    const offWeekday: Schedule = { ...schedule, '2026-11-26': 'off' }
    expect(markRun(offWeekday, '2026-11-25')).toEqual(['2026-11-23', '2026-11-24', '2026-11-25'])
    const gap: Schedule = { '2026-11-23': 'practice', '2026-11-25': 'practice' }
    expect(markRun(gap, '2026-11-25')).toEqual(['2026-11-25'])
  })

  it('印のない日は空', () => {
    expect(markRun(schedule, '2026-11-28')).toEqual([])
  })
})
