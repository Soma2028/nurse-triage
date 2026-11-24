import type { DayKind, Schedule, Settings } from '../types'

/** 読み込み時に、今日からこの日数より前の印を消す */
export const KEEP_PAST_DAYS = 60
/** 期間で塗るときの最大日数 */
export const MAX_RANGE_DAYS = 366

const pad2 = (n: number) => String(n).padStart(2, '0')
const KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/

/**
 * ローカル時刻の年月日から YYYY-MM-DD を作る。
 * toISOString() は UTC なので、日本時間の 0〜9時に前日の日付になってしまう。
 */
export function dayKey(ms: number): string {
  const d = new Date(ms)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

export function isDayKey(v: string): boolean {
  const m = KEY_RE.exec(v)
  if (!m) return false
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const date = new Date(y, mo - 1, d)
  return date.getFullYear() === y && date.getMonth() === mo - 1 && date.getDate() === d
}

/** 日付キーの日の 0:00（ローカル時刻）の epoch ms */
export function keyStart(key: string): number {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d).getTime()
}

/** 日付キーを n 日ずらす */
export function addDays(key: string, n: number): string {
  const [y, m, d] = key.split('-').map(Number)
  return dayKey(new Date(y, m - 1, d + n).getTime())
}

/** 0=日 … 6=土 */
export function weekday(key: string): number {
  return new Date(keyStart(key)).getDay()
}

/** 今日以降に印が1つでもあるか。なければ従来どおり（トグル手動・全日一定）で動く */
export function hasUpcoming(schedule: Schedule, now: number): boolean {
  const today = dayKey(now)
  return Object.keys(schedule).some((k) => k >= today)
}

/** 今日から KEEP_PAST_DAYS 日より前の印を消す */
export function pruneSchedule(schedule: Schedule, now: number): Schedule {
  const cutoff = addDays(dayKey(now), -KEEP_PAST_DAYS)
  return Object.fromEntries(Object.entries(schedule).filter(([k]) => k >= cutoff))
}

/** 開始日〜終了日（両端含む・逆順なら入れ替え）の日付キー。skipWeekends なら土日を除く */
export function rangeKeys(start: string, end: string, skipWeekends: boolean): string[] {
  if (!isDayKey(start) || !isDayKey(end)) return []
  const [from, to] = start <= end ? [start, end] : [end, start]
  const keys: string[] = []
  for (let k = from, i = 0; k <= to && i < MAX_RANGE_DAYS; k = addDays(k, 1), i++) {
    const w = weekday(k)
    if (skipWeekends && (w === 0 || w === 6)) continue
    keys.push(k)
  }
  return keys
}

/** 今日が実習中か：今日だけの手動上書き → スケジュールの印 → （印がなければ）設定のトグル */
export function isPracticeToday(settings: Settings, schedule: Schedule, now: number): boolean {
  if (!hasUpcoming(schedule, now)) return settings.practiceMode
  const today = dayKey(now)
  if (settings.practiceOverride?.date === today) return settings.practiceOverride.on
  return schedule[today] === 'practice'
}

/** スケジュールだけから見た、今日が実習中か（手動上書きを除く） */
export function autoPracticeToday(schedule: Schedule, now: number): boolean {
  return schedule[dayKey(now)] === 'practice'
}

/** 印ごとの時間。テストの日と印のない日は、ふだんの時間 */
function kindHours(kind: DayKind | undefined, settings: Settings): number {
  if (kind === 'practice') return settings.hoursPractice
  if (kind === 'off') return 0
  return settings.hoursNormal
}

/** その日に使える時間 */
export function hoursOn(key: string, settings: Settings, schedule: Schedule, now: number): number {
  if (!hasUpcoming(schedule, now)) {
    return settings.practiceMode ? settings.hoursPractice : settings.hoursNormal
  }
  const today = dayKey(now)
  if (key === today && settings.practiceOverride?.date === today) {
    return settings.practiceOverride.on ? settings.hoursPractice : settings.hoursNormal
  }
  return kindHours(schedule[key], settings)
}

/** 今日使える時間 */
export function todayHours(settings: Settings, schedule: Schedule, now: number): number {
  return hoursOn(dayKey(now), settings, schedule, now)
}

const DAY_MS = 24 * 60 * 60 * 1000
/** 日ごとに数えるのはこの日数まで。その先は通常日として計算する */
const MAX_LOOP_DAYS = 3700

/**
 * from〜to の間に使える時間。各日の時間 × その日と重なった割合 の合計。
 * 日の区切りはローカル時刻の 0時。今日以降に印がなければ (to − from)/1日 × H と一致する。
 */
export function availHours(
  from: number,
  to: number,
  settings: Settings,
  schedule: Schedule,
  now: number,
): number {
  if (to <= from) return 0
  if (!hasUpcoming(schedule, now)) {
    return ((to - from) / DAY_MS) * hoursOn(dayKey(now), settings, schedule, now)
  }
  let sum = 0
  let key = dayKey(from)
  let dayStart = keyStart(key)
  for (let i = 0; dayStart < to; i++) {
    if (i >= MAX_LOOP_DAYS) {
      sum += ((to - dayStart) / DAY_MS) * settings.hoursNormal
      break
    }
    const next = addDays(key, 1)
    const dayEnd = keyStart(next)
    const overlap = Math.min(to, dayEnd) - Math.max(from, dayStart)
    if (overlap > 0) sum += (hoursOn(key, settings, schedule, now) * overlap) / (dayEnd - dayStart)
    key = next
    dayStart = dayEnd
  }
  return sum
}
