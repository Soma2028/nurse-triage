/**
 * 「今日のぶん」：今日進めた時間を数え、今日の目安とくらべる。
 * 進めた時間は、課題の見込み時間 × 進めた割合（+25% や完了、編集で進捗を変えたとき）
 */
import type { DayLog, Plan, Task } from '../types'
import { dayKey } from './schedule'

const round = (h: number) => Math.round(h * 100) / 100

/** 進捗を from% から to% に変えたときに進めた時間（戻したときはマイナス） */
export const workOf = (task: Pick<Task, 'estHours'>, from: number, to: number) =>
  (task.estHours * (to - from)) / 100

/** 今日の記録に時間を足す。日付が変わっていたら0から数え直す。マイナスにはしない */
export function addWork(log: DayLog | undefined, now: number, hours: number): DayLog {
  const day = dayKey(now)
  const base = log && log.day === day ? log.hours : 0
  return { day, hours: Math.max(0, round(base + hours)) }
}

/** 今日進めた時間（記録が前の日のものなら0） */
export const workedToday = (log: DayLog | undefined, now: number) =>
  log && log.day === dayKey(now) ? log.hours : 0

export interface TodayProgress {
  worked: number // 今日進めた時間
  target: number // 今日の目安（使える時間。課題が少ない日は、進めた分＋残りの割り振り）
  ratio: number // 0〜1
}

/** 今日の目安とくらべた進み具合。使える時間が0（休みの日）なら目安も0 */
export function todayProgress(worked: number, plan: Plan): TodayProgress {
  const target = Math.min(plan.hours, round(worked + plan.used))
  const ratio = target > 0 ? Math.min(1, worked / target) : 0
  return { worked, target, ratio }
}
