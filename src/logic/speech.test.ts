import { describe, expect, it } from 'vitest'
import { DAY_MS, HOUR_MS } from '../constants'
import type { Schedule, Settings, Task } from '../types'
import { buildPlan } from './plan'
import { analyse } from './priority'
import { todayHours } from './schedule'
import { homeSpeech } from './speech'

const NOW = new Date(2026, 10, 23, 10, 0).getTime()
const S: Settings = { practiceMode: false, hoursPractice: 2.5, hoursNormal: 4 }

let seq = 0
const task = (p: Partial<Task> & { dueIn: number }): Task => {
  const { dueIn, ...rest } = p
  return {
    id: `s${++seq}`,
    title: `課題${seq}`,
    type: 'report',
    estHours: 1,
    progress: 0,
    importance: 2,
    due: NOW + dueIn,
    ...rest,
  }
}

function speak(tasks: Task[], schedule: Schedule = {}) {
  const analysed = analyse(tasks, S, NOW, schedule)
  return homeSpeech(analysed, buildPlan(analysed, todayHours(S, schedule, NOW)))
}

describe('homeSpeech', () => {
  it('課題がなければ、うれしい顔で「片づいた」', () => {
    const s = speak([])
    expect(s.mood).toBe('happy')
    expect(s.lines[0]).toContain('片づいた')
  })

  it('締切過ぎがいちばん優先（遅れて出すか、先生に連絡するか）', () => {
    const s = speak([
      task({ title: '過ぎた', dueIn: -HOUR_MS }),
      task({ title: '大きい', dueIn: 2 * DAY_MS, estHours: 30 }),
    ])
    expect(s.mood).toBe('worry')
    expect(s.lines[0]).toBe('『過ぎた』の締切が過ぎてるよ。')
    expect(s.lines[1]).toContain('先生に連絡')
  })

  it('時間不足なら、締切の早い不足課題と足りない時間を伝える', () => {
    // H=4：5日後締切・残り9.5h ＋ 6日後締切・残り16h → 2件目が不足
    const s = speak([
      task({ title: 'A', dueIn: 5 * DAY_MS, estHours: 9.5 }),
      task({ title: '小児の事前学習', dueIn: 6 * DAY_MS, estHours: 16 }),
    ])
    expect(s.mood).toBe('worry')
    expect(s.lines[0]).toBe('このままだと『小児の事前学習』の締切まで、約1.5h足りないかも。')
  })

  it('24時間以内なら「まずは〜から」と残り時間', () => {
    const s = speak([task({ title: '実習記録', dueIn: 22 * HOUR_MS, estHours: 1 })])
    expect(s.mood).toBe('worry')
    expect(s.lines).toEqual(['まずは『実習記録』から。', '締切まであと22時間だよ。'])
  })

  it('今日が休みの日なら「ゆっくりしよう」（急ぎがないとき）', () => {
    const s = speak([task({ dueIn: 10 * DAY_MS, estHours: 2 })], {
      '2026-11-23': 'off',
      '2026-11-24': 'practice',
    })
    expect(s.mood).toBe('happy')
    expect(s.lines).toEqual(['今日は休みの日。', 'ゆっくりしよう。'])
  })

  it('休みの日でも24時間以内の課題があればそちらを伝える', () => {
    const s = speak([task({ title: '明日の朝', dueIn: 20 * HOUR_MS })], { '2026-11-23': 'off' })
    expect(s.lines[0]).toBe('まずは『明日の朝』から。')
  })

  it('ふつうの日は、今日のプランの1件目と時間', () => {
    const s = speak([task({ title: 'レポート', dueIn: 9 * DAY_MS, estHours: 4 })])
    expect(s.mood).toBe('normal')
    expect(s.lines).toEqual(['今日は『レポート』を4h進めておけば大丈夫そう。'])
  })

  it('同じ状況なら何度呼んでも同じ文（ランダムにしない）', () => {
    const tasks = [task({ dueIn: 4 * DAY_MS, estHours: 3 })]
    expect(speak(tasks)).toEqual(speak(tasks))
  })
})
