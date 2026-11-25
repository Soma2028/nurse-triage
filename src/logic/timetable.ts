import type { ClassSlot, Period, Schedule, Settings, Timetable } from '../types'
import { dayKey, isPracticeToday } from './schedule'

/** 時限の数（1限〜6限） */
export const PERIOD_COUNT = 6
/** 名前・教室の長さの上限 */
export const NAME_MAX = 40
export const ROOM_MAX = 20

/** ふつうの大学・専門学校の90分授業の時刻 */
export const DEFAULT_PERIODS: Period[] = [
  { start: '9:00', end: '10:30' },
  { start: '10:40', end: '12:10' },
  { start: '13:00', end: '14:30' },
  { start: '14:40', end: '16:10' },
  { start: '16:20', end: '17:50' },
  { start: '18:00', end: '19:30' },
]

export function emptyTimetable(): Timetable {
  return { periods: DEFAULT_PERIODS.map((p) => ({ ...p })), saturday: false, classes: {} }
}

/** 曜日（1=月〜6=土）と時限（1〜）からコマのキーを作る */
export const slotKey = (weekday: number, period: number) => `${weekday}-${period}`

const SLOT_RE = /^([1-6])-([1-9])$/
const TIME_RE = /^([01]?\d|2[0-3]):([0-5]\d)$/

export const isTime = (v: unknown): v is string => typeof v === 'string' && TIME_RE.test(v)

/** 'H:MM' → 0時からの分 */
export function toMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

/** <input type="time"> の 'HH:MM' → 'H:MM'（先頭の0を取る） */
export const fromTimeInput = (v: string) => (isTime(v) ? v.replace(/^0(\d)/, '$1') : '')
/** 'H:MM' → <input type="time"> の 'HH:MM' */
export const toTimeInput = (t: string) => t.padStart(5, '0')

/** 名前と教室を整える。名前がなければ null（＝そのコマを空ける） */
export function cleanSlot(name: string, room: string): ClassSlot | null {
  const n = name.trim().slice(0, NAME_MAX)
  if (!n) return null
  const r = room.trim().slice(0, ROOM_MAX)
  return r ? { name: n, room: r } : { name: n }
}

/** 保存データから時間割を読む。壊れたところは初期値で補う */
export function toTimetable(v: unknown): Timetable {
  const base = emptyTimetable()
  if (!v || typeof v !== 'object') return base
  const t = v as Record<string, unknown>
  const saved: unknown[] = Array.isArray(t.periods) ? t.periods : []
  const periods = base.periods.map((p, i) => {
    const q = saved[i] as Record<string, unknown> | null | undefined
    return q && typeof q === 'object' && isTime(q.start) && isTime(q.end)
      ? { start: q.start, end: q.end }
      : p
  })
  const classes: Record<string, ClassSlot> = {}
  if (t.classes && typeof t.classes === 'object' && !Array.isArray(t.classes)) {
    for (const [k, c] of Object.entries(t.classes)) {
      const m = SLOT_RE.exec(k)
      if (!m || Number(m[2]) > PERIOD_COUNT || !c || typeof c !== 'object') continue
      const s = c as Record<string, unknown>
      const slot = cleanSlot(
        typeof s.name === 'string' ? s.name : '',
        typeof s.room === 'string' ? s.room : '',
      )
      if (slot) classes[k] = slot
    }
  }
  return { periods, saturday: t.saturday === true, classes }
}

export type ClassState = 'past' | 'now' | 'later'

export interface TodayClass {
  period: number
  time: Period
  slot: ClassSlot
  state: ClassState
}

/**
 * 今日の授業（時限の順）。実習の日・休みの日・日曜日は出さない。
 * 土曜日は、時間割で土曜日を使うときだけ
 */
export function todayClasses(
  timetable: Timetable,
  settings: Settings,
  schedule: Schedule,
  now: number,
): TodayClass[] {
  const w = new Date(now).getDay()
  if (w === 0 || (w === 6 && !timetable.saturday)) return []
  if (isPracticeToday(settings, schedule, now)) return []
  if (schedule[dayKey(now)] === 'off') return []
  const d = new Date(now)
  const minutes = d.getHours() * 60 + d.getMinutes()
  const list: TodayClass[] = []
  for (let p = 1; p <= PERIOD_COUNT; p++) {
    const slot = timetable.classes[slotKey(w, p)]
    if (!slot) continue
    const time = timetable.periods[p - 1]
    const state: ClassState =
      minutes >= toMinutes(time.end) ? 'past' : minutes >= toMinutes(time.start) ? 'now' : 'later'
    list.push({ period: p, time, slot, state })
  }
  return list
}
