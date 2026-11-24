import type { Analysed, Plan, Schedule, Settings } from '../types'
import { dayKey, hasUpcoming, isPracticeToday } from './schedule'

const URGENT = new Set(['black', 'red'])
/** つぎにやるに出す色。黄色も赤と同じように出す（緑だけのときは出さない） */
const NEXT = new Set(['black', 'red', 'yellow'])

/** つぎにやるのカルーセルに並べる最大の枚数 */
export const NEXT_MAX = 5

export interface HomeView {
  /** つぎにやる（カルーセル）。黒・赤・黄の課題を並び順に最大 NEXT_MAX 件 */
  next: Analysed[]
  /** ほかの急ぎ：黒・赤のうち、つぎにやるにも今日のプランにも入っていないもの */
  urgent: Analysed[]
}

/** ホームに出すもの。ホームは「つぎにやる」「今日のプラン」と「黒・赤の課題」だけ */
export function homeView(analysed: readonly Analysed[], plan: Plan): HomeView {
  const next = analysed.filter((a) => NEXT.has(a.triage)).slice(0, NEXT_MAX)
  const shown = new Set([...next, ...plan.items].map((x) => x.task.id))
  return {
    next,
    urgent: analysed.filter((a) => URGENT.has(a.triage) && !shown.has(a.task.id)),
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
