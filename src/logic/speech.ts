import { DAY_MS } from '../constants'
import type { Analysed, Plan } from '../types'
import { formatHours, formatRemaining } from '../utils/format'
import { firstShortage } from './priority'

/** キャラクターの表情 */
export type Mood = 'normal' | 'worry' | 'happy'

export interface Speech {
  mood: Mood
  lines: string[]
}

const q = (title: string) => `『${title}』`

/**
 * ホームでキャラクターが話すひとこと。状況ごとに決まった文を返す（開くたびに変わらないよう、ランダムにしない）。
 * 優先順：課題なし → 期限切れ → 時間不足 → 24時間以内 → 今日は休み → 追い込まれている → ふつう
 */
export function homeSpeech(analysed: readonly Analysed[], plan: Plan): Speech {
  if (analysed.length === 0) {
    return { mood: 'happy', lines: ['課題はぜんぶ片づいたよ。', 'おつかれさま。'] }
  }

  const overdue = analysed.find((a) => a.ms < 0)
  if (overdue) {
    return {
      mood: 'worry',
      lines: [`${q(overdue.task.title)}の締切が過ぎてるよ。`, 'まずはこれを片づけよう。'],
    }
  }

  const short = firstShortage(analysed)
  if (short) {
    return {
      mood: 'worry',
      lines: [
        `このままだと${q(short.task.title)}の締切まで、約${formatHours(short.shortage)}足りないかも。`,
        '前倒しできる課題がないか見てみよう。',
      ],
    }
  }

  const top = analysed[0]
  if (top.ms < DAY_MS) {
    return {
      mood: 'worry',
      lines: [`まずは${q(top.task.title)}から。`, `締切まで${formatRemaining(top.ms)}だよ。`],
    }
  }

  if (plan.hours === 0) {
    return { mood: 'happy', lines: ['今日は休みの日。', 'ゆっくりしよう。'] }
  }

  const first = plan.items[0]
  if (top.triage === 'red') {
    return {
      mood: 'worry',
      lines: [
        `${q(top.task.title)}が追い込まれてきたよ。`,
        first ? `今日は${formatHours(first.hours)}進めておこう。` : '少しずつ進めておこう。',
      ],
    }
  }

  if (!first) {
    return { mood: 'happy', lines: ['いい調子。', 'このまま進めよう。'] }
  }
  return {
    mood: 'normal',
    lines: [`今日は${q(first.task.title)}を${formatHours(first.hours)}進めておけば大丈夫そう。`],
  }
}
