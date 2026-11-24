import type { Analysed, Plan, Schedule, Settings } from '../types'
import { dayKey, hasUpcoming, isPracticeToday } from './schedule'

const URGENT = new Set(['black', 'red'])

export interface HomeView {
  /** つぎにやる1件。黒・赤の課題があるときだけ（並び順の先頭） */
  next: Analysed | undefined
  /** ほかの急ぎ：黒・赤のうち、つぎにやる以外で、今日のプランにも入っていないもの */
  urgent: Analysed[]
}

/** ホームに出すもの。ホームは「今日のプラン」と「黒・赤の課題」だけ */
export function homeView(analysed: readonly Analysed[], plan: Plan): HomeView {
  const urgentAll = analysed.filter((a) => URGENT.has(a.triage))
  const next = urgentAll[0]
  const inPlan = new Set(plan.items.map((i) => i.task.id))
  return {
    next,
    urgent: urgentAll.slice(1).filter((a) => !inPlan.has(a.task.id)),
  }
}

/**
 * 今日使える時間の理由を、見出しの横に小さく出す一言。
 * 今日の時間の決め方（手動の切り替え → スケジュールの印 → 設定）と同じ順で決める。ふだんの日は出さない。
 */
export function dayNote(settings: Settings, schedule: Schedule, now: number): string | null {
  if (isPracticeToday(settings, schedule, now)) return '今日は実習日'
  const today = dayKey(now)
  const overridden = settings.practiceOverride?.date === today
  if (hasUpcoming(schedule, now) && !overridden) {
    if (schedule[today] === 'off') return '今日は休み'
    if (schedule[today] === 'test') return '今日はテスト'
  }
  return null
}
