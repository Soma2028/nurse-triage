export type TaskType =
  'rec' | 'proc' | 'pre' | 'osce' | 'exam' | 'report' | 'gw' | 'kokushi' | 'etc'

export type Importance = 1 | 2 | 3

export interface Task {
  id: string // crypto.randomUUID()
  title: string
  type: TaskType
  due: number // 締切（epoch ms）
  estHours: number // 見込み時間（0.5刻み）
  progress: number // 0〜100（10刻み）
  importance: Importance // 低・中・高（成績・単位への影響）
  doneAt?: number // 完了日時
}

export interface Settings {
  practiceMode: boolean // 実習期間中か（スケジュールに今日以降の印がないときに使う）
  hoursPractice: number // 実習中の1日の作業時間
  hoursNormal: number // 通常期の1日の作業時間
  /** スケジュールの自動判定を「今日だけ」手動で上書きしたもの */
  practiceOverride?: { date: string; on: boolean }
}

/** カレンダーの印。印のない日は通常日 */
export type DayKind = 'practice' | 'off'

/** 日付キー（ローカル時刻の YYYY-MM-DD）→ 印 */
export type Schedule = Record<string, DayKind>

export type Triage = 'red' | 'yellow' | 'green'

export type TriageLabel = '期限切れ' | '今すぐ' | '早めに着手' | '計画的に'

/** analyse() の結果。課題1件ぶんの評価値 */
export interface Analysed {
  task: Task
  ms: number // 締切までの残りミリ秒（負なら期限切れ）
  days: number // 締切までの日数
  remain: number // 残り作業時間 h
  avail: number // 締切までに使える時間 h
  ratio: number // 逼迫度 = remain / avail
  shortage: number // 締切順に積み上げたときの不足時間 h
  score: number
  triage: Triage
  label: TriageLabel
}

export interface PlanItem {
  task: Task
  triage: Triage
  hours: number // 今日割り当てる時間（0.5h単位）
}

export interface Plan {
  hours: number // 今日使える時間 H
  items: PlanItem[]
  used: number // 割り当てた合計
  free: number // 空き時間 = hours - used
}
