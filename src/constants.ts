import type { Importance, Settings, TaskType, Triage } from './types'

export interface TaskTypePreset {
  label: string
  /** カードなど狭いところで使う短い名前 */
  short: string
  weight: number
  defaultHours: number
}

export const TASK_TYPES: Record<TaskType, TaskTypePreset> = {
  rec: { label: '実習記録', short: '実習記録', weight: 1.5, defaultHours: 2 },
  proc: {
    label: '看護過程（アセスメント・関連図・計画）',
    short: '看護過程',
    weight: 1.4,
    defaultHours: 5,
  },
  pre: { label: '実習前の事前学習', short: '事前学習', weight: 1.3, defaultHours: 5 },
  osce: { label: '技術試験・OSCE練習', short: '技術試験', weight: 1.25, defaultHours: 3 },
  exam: { label: '定期試験・小テスト', short: '試験', weight: 1.2, defaultHours: 8 },
  report: { label: 'レポート', short: 'レポート', weight: 1.0, defaultHours: 4 },
  gw: { label: 'グループワーク', short: 'グループワーク', weight: 1.0, defaultHours: 2 },
  kokushi: { label: '国試対策', short: '国試対策', weight: 0.9, defaultHours: 6 },
  etc: { label: 'その他', short: 'その他', weight: 0.8, defaultHours: 1 },
}

export const TASK_TYPE_KEYS = Object.keys(TASK_TYPES) as TaskType[]

/** 実習期間中に重みを上乗せする種類と、その量 */
export const PRACTICE_BOOST_TYPES: readonly TaskType[] = ['rec', 'proc']
export const PRACTICE_BOOST = 0.2

export const IMPORTANCE_FACTOR: Record<Importance, number> = { 1: 0.8, 2: 1.0, 3: 1.25 }
export const IMPORTANCE_LABEL: Record<Importance, string> = { 1: '低', 2: '中', 3: '高' }

export const DEFAULT_SETTINGS: Settings = {
  practiceMode: false,
  hoursPractice: 2.5,
  hoursNormal: 4,
}

export const HOUR_MS = 60 * 60 * 1000
export const DAY_MS = 24 * HOUR_MS

/** タッグ色ごとの Tailwind クラス（黄は文字を炭色に） */
export const TRIAGE_STYLE: Record<Triage, { tag: string; bar: string; dot: string; name: string }> =
  {
    black: {
      tag: 'bg-tag-black text-white',
      bar: 'bg-tag-black',
      dot: 'bg-tag-black',
      name: '黒',
    },
    red: { tag: 'bg-tag-red text-white', bar: 'bg-tag-red', dot: 'bg-tag-red', name: '赤' },
    yellow: {
      tag: 'bg-tag-yellow text-ink',
      bar: 'bg-tag-yellow',
      dot: 'bg-tag-yellow',
      name: '黄',
    },
    green: { tag: 'bg-tag-green text-white', bar: 'bg-tag-green', dot: 'bg-tag-green', name: '緑' },
  }

/** ホームのつぎにやるの「+25%」で進める割合（%） */
export const PROGRESS_STEP = 25
