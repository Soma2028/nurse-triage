import type { Analysed, Schedule } from '../types'
import { addDays, dayKey, weekday } from './schedule'

/** 期間を探すのはこの日数まで（念のための上限） */
const MAX_RUN_DAYS = 400

/**
 * 月のマス。月曜始まりで、前後の空きは null。行がそろうよう7の倍数にする。
 * month は 'YYYY-MM'
 */
export function monthCells(month: string): (string | null)[] {
  const [y, m] = month.split('-').map(Number)
  const first = `${month}-01`
  const days = new Date(y, m, 0).getDate()
  const offset = (weekday(first) + 6) % 7
  const cells: (string | null)[] = [
    ...Array<null>(offset).fill(null),
    ...Array.from({ length: days }, (_, i) => addDays(first, i)),
  ]
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

/** 締切の日（ローカル時刻）ごとの課題。同じ日の中は締切の早い順 */
export function tasksByDay(analysed: readonly Analysed[]): Map<string, Analysed[]> {
  const map = new Map<string, Analysed[]>()
  for (const a of [...analysed].sort((x, y) => x.task.due - y.task.due)) {
    const key = dayKey(a.task.due)
    const list = map.get(key)
    if (list) list.push(a)
    else map.set(key, [a])
  }
  return map
}

const isWeekend = (key: string) => {
  const w = weekday(key)
  return w === 0 || w === 6
}

/**
 * key と同じ印が続いている期間（その印が付いた日だけ。古い順）。
 * 実習は平日だけ塗ることが多いので、土日はまたいで1つの期間とみなす（土日が印なしでも、休みでも）。
 * 期間が切れるのは、同じ印のない平日に来たとき。
 * key に印がなければ空。
 */
export function markRun(schedule: Schedule, key: string): string[] {
  const kind = schedule[key]
  if (!kind) return []
  const walk = (step: 1 | -1) => {
    const found: string[] = []
    let k = key
    for (let i = 0; i < MAX_RUN_DAYS; i++) {
      k = addDays(k, step)
      if (schedule[k] === kind) found.push(k)
      else if (isWeekend(k)) continue
      else break
    }
    return found
  }
  return [...walk(-1).reverse(), key, ...walk(1)]
}
