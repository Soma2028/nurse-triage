import {
  DAY_MS,
  IMPORTANCE_FACTOR,
  PRACTICE_BOOST,
  PRACTICE_BOOST_TYPES,
  TASK_TYPES,
} from '../constants'
import type { Analysed, Schedule, Settings, Task, Triage, TriageLabel } from '../types'
import { availHours, isPracticeToday } from './schedule'

/** この値（h）を超えて足りないと赤にする */
const SHORTAGE_RED = 0.25
const RATIO_RED = 0.7
const RATIO_YELLOW = 0.3
const YELLOW_DAYS = 3

const TRIAGE_ORDER: Record<Triage, number> = { red: 0, yellow: 1, green: 2 }

/** 種類の重み。実習中は rec / proc に上乗せ */
export function typeWeight(task: Task, practice: boolean): number {
  const base = TASK_TYPES[task.type].weight
  return practice && PRACTICE_BOOST_TYPES.includes(task.type) ? base + PRACTICE_BOOST : base
}

/** 残り作業時間 h */
export function remainHours(task: Task): number {
  const p = Math.min(100, Math.max(0, task.progress))
  return task.estHours * (1 - p / 100)
}

function judge(ms: number, ratio: number, shortage: number): [Triage, TriageLabel] {
  if (ms < 0) return ['red', '期限切れ']
  if (shortage > SHORTAGE_RED || ratio >= RATIO_RED || ms < DAY_MS) return ['red', '今すぐ']
  if (ratio >= RATIO_YELLOW || ms <= YELLOW_DAYS * DAY_MS) return ['yellow', '早めに着手']
  return ['green', '計画的に']
}

/**
 * 未完了の課題を評価し、赤 → 黄 → 緑、同色内は score の高い順に並べて返す。
 * 純粋関数（now を引数で受け取る）。schedule があれば日ごとの使える時間で avail を計算する。
 */
export function analyse(
  tasks: readonly Task[],
  settings: Settings,
  now: number,
  schedule: Schedule = {},
): Analysed[] {
  const practice = isPracticeToday(settings, schedule, now)
  const open = tasks.filter((t) => t.doneAt == null)

  // 締切順の積み上げ：各課題の締切までに終わらせるべき remain の合計
  // （同じ締切の課題どうしは互いに含める）
  const byDue = open
    .map((t) => ({ due: t.due, remain: remainHours(t) }))
    .sort((a, b) => a.due - b.due)
  const cumulativeUntil = (due: number): number => {
    let sum = 0
    for (const x of byDue) {
      if (x.due > due) break
      sum += x.remain
    }
    return sum
  }

  const result = open.map((task): Analysed => {
    const ms = task.due - now
    const days = ms / DAY_MS
    const remain = remainHours(task)
    const avail = availHours(now, task.due, settings, schedule, now)
    const ratio = remain / Math.max(avail, 0.1)
    const w = typeWeight(task, practice)
    const imp = IMPORTANCE_FACTOR[task.importance]
    const score =
      (0.6 * (Math.min(ratio, 2) / 2) + 0.4 * (1 / (1 + Math.max(days, 0)))) * w * imp * 100
    const shortage = Math.max(0, cumulativeUntil(task.due) - avail)
    const [triage, label] = judge(ms, ratio, shortage)
    return { task, ms, days, remain, avail, ratio, shortage, score, triage, label }
  })

  return result.sort(
    (a, b) =>
      TRIAGE_ORDER[a.triage] - TRIAGE_ORDER[b.triage] ||
      b.score - a.score ||
      a.task.due - b.task.due,
  )
}

/**
 * 時間不足の警告用：不足がある課題のうち締切が最も早いもの。
 * 期限切れは別扱い（もう間に合わせようがない）なので除く。
 */
export function firstShortage(analysed: readonly Analysed[]): Analysed | undefined {
  return analysed
    .filter((a) => a.ms >= 0 && a.shortage > SHORTAGE_RED)
    .reduce<Analysed | undefined>(
      (min, a) => (!min || a.task.due < min.task.due ? a : min),
      undefined,
    )
}
