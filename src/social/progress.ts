/**
 * フレンドに見せる「今日の進み具合」。数だけ（課題名・種類・締切は含まない）。
 */
import { dayKey } from '../logic/schedule'
import type { Analysed, Task } from '../types'
import type { FriendProgress } from './friends'

export interface MyProgress {
  day: string // 端末の日付 YYYY-MM-DD
  doneCount: number // 今日完了にした課題の数
  redCount: number // いまの赤の課題の数
}

export function computeProgress(
  done: readonly Task[],
  analysed: readonly Analysed[],
  now: number,
): MyProgress {
  const day = dayKey(now)
  return {
    day,
    doneCount: done.filter((t) => t.doneAt !== undefined && dayKey(t.doneAt) === day).length,
    redCount: analysed.filter((a) => a.triage === 'red').length,
  }
}

/** フレンドの行に出す一言。見せていなければ null */
export function progressText(p: FriendProgress | null | undefined, today: string): string | null {
  if (!p) return null
  if (p.day !== today) return '今日はまだ'
  return `今日 ${p.doneCount}件完了 ・ 赤 ${p.redCount}`
}
