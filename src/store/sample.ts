import type { Importance, Task, TaskType } from '../types'

interface SampleRow {
  title: string
  type: TaskType
  days: number // 今日から何日後か
  time: [number, number] // 締切の時刻 [時, 分]
  estHours: number
  progress: number
  importance: Importance
}

const ROWS: SampleRow[] = [
  {
    title: '実習記録（3日目）',
    type: 'rec',
    days: 1,
    time: [8, 30],
    estHours: 2,
    progress: 20,
    importance: 3,
  },
  {
    title: '関連図の修正（A氏・心不全）',
    type: 'proc',
    days: 3,
    time: [8, 30],
    estHours: 5,
    progress: 30,
    importance: 3,
  },
  {
    title: '基礎看護技術 採血の技術試験練習',
    type: 'osce',
    days: 5,
    time: [13, 0],
    estHours: 3,
    progress: 0,
    importance: 2,
  },
  {
    title: '小児看護学実習の事前学習',
    type: 'pre',
    days: 6,
    time: [17, 0],
    estHours: 6,
    progress: 0,
    importance: 2,
  },
  {
    title: '看護倫理レポート（2000字）',
    type: 'report',
    days: 9,
    time: [23, 59],
    estHours: 4,
    progress: 0,
    importance: 2,
  },
  {
    title: '成人看護学 定期試験',
    type: 'exam',
    days: 12,
    time: [9, 0],
    estHours: 12,
    progress: 10,
    importance: 3,
  },
  {
    title: '国試 必修問題 過去問1年分',
    type: 'kokushi',
    days: 30,
    time: [23, 0],
    estHours: 8,
    progress: 25,
    importance: 1,
  },
]

/** 「今日から○日後の○時○分」（ローカル時刻）の epoch ms */
export function daysFromToday(now: number, days: number, hour: number, minute: number): number {
  const d = new Date(now)
  d.setDate(d.getDate() + days)
  d.setHours(hour, minute, 0, 0)
  return d.getTime()
}

/** サンプル課題。締切は now を基準に「今日から○日後」で生成する */
export function sampleTasks(now: number, makeId: () => string = () => crypto.randomUUID()): Task[] {
  return ROWS.map(({ days, time, ...rest }) => ({
    id: makeId(),
    ...rest,
    due: daysFromToday(now, days, time[0], time[1]),
  }))
}
