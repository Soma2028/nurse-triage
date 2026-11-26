import { DEFAULT_SETTINGS, TASK_TYPES } from '../constants'
import { isDayKey } from '../logic/schedule'
import { toTimetable } from '../logic/timetable'
import type { DayKind, DayLog, Schedule, Settings, Task, Timetable } from '../types'

export const STORAGE_KEY = 'nurse-triage-v1'

/** localStorage に保存する形（schedule は後から追加。古いデータには無いので {} で補う） */
export interface Persisted {
  tasks: Task[]
  done: Task[]
  settings: Settings
  schedule: Schedule
  /** 今日進めた時間（後から追加。古いデータには無い） */
  today?: DayLog
  /** 毎週の時間割（後から追加。古いデータには無いので空の時間割で補う） */
  timetable?: Timetable
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>

function defaultStorage(): StorageLike | undefined {
  try {
    return globalThis.localStorage
  } catch {
    // アクセス自体が例外になる環境（プライベートモード・Cookie 無効など）
    return undefined
  }
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

function toTask(v: unknown): Task | null {
  if (!v || typeof v !== 'object') return null
  const t = v as Record<string, unknown>
  if (typeof t.id !== 'string' || typeof t.title !== 'string') return null
  if (typeof t.type !== 'string' || !(t.type in TASK_TYPES)) return null
  if (!isNum(t.due) || !isNum(t.estHours) || !isNum(t.progress)) return null
  if (t.importance !== 1 && t.importance !== 2 && t.importance !== 3) return null
  const task: Task = {
    id: t.id,
    title: t.title,
    type: t.type as Task['type'],
    due: t.due,
    estHours: Math.max(0, t.estHours),
    progress: Math.min(100, Math.max(0, t.progress)),
    importance: t.importance,
  }
  if (isNum(t.doneAt)) task.doneAt = t.doneAt
  return task
}

function toTasks(v: unknown): Task[] {
  return Array.isArray(v) ? v.map(toTask).filter((t): t is Task => t !== null) : []
}

function toSettings(v: unknown): Settings {
  const s = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>
  const hours = (x: unknown, fallback: number) => (isNum(x) && x >= 0 && x <= 24 ? x : fallback)
  const settings: Settings = {
    practiceMode:
      typeof s.practiceMode === 'boolean' ? s.practiceMode : DEFAULT_SETTINGS.practiceMode,
    hoursPractice: hours(s.hoursPractice, DEFAULT_SETTINGS.hoursPractice),
    hoursNormal: hours(s.hoursNormal, DEFAULT_SETTINGS.hoursNormal),
  }
  const o = s.practiceOverride as Record<string, unknown> | undefined
  if (
    o &&
    typeof o === 'object' &&
    typeof o.date === 'string' &&
    isDayKey(o.date) &&
    typeof o.on === 'boolean'
  ) {
    settings.practiceOverride = { date: o.date, on: o.on }
  }
  return settings
}

const DAY_KINDS: readonly unknown[] = ['practice', 'off', 'test'] satisfies DayKind[]

function toSchedule(v: unknown): Schedule {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {}
  return Object.fromEntries(
    Object.entries(v).filter(([k, kind]) => isDayKey(k) && DAY_KINDS.includes(kind)),
  ) as Schedule
}

function toDayLog(v: unknown): DayLog | undefined {
  const l = v as Record<string, unknown> | null
  if (!l || typeof l !== 'object') return undefined
  if (typeof l.day !== 'string' || !isDayKey(l.day) || !isNum(l.hours) || l.hours < 0)
    return undefined
  return { day: l.day, hours: l.hours }
}

/** 保存の形のデータを確かめて読む。おかしなところは捨てたり初期値で補ったりする（バックアップの読み込みでも使う） */
export function toPersisted(data: unknown): Persisted | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null
  const d = data as Record<string, unknown>
  return {
    tasks: toTasks(d.tasks),
    done: toTasks(d.done),
    settings: toSettings(d.settings),
    schedule: toSchedule(d.schedule),
    today: toDayLog(d.today),
    timetable: toTimetable(d.timetable),
  }
}

/** 保存データを読む。ない・壊れている・読めないときは null */
export function load(storage: StorageLike | undefined = defaultStorage()): Persisted | null {
  try {
    const raw = storage?.getItem(STORAGE_KEY)
    if (!raw) return null
    return toPersisted(JSON.parse(raw))
  } catch {
    return null
  }
}

/** 保存する。失敗しても例外は投げない（成功したら true） */
export function save(
  data: Persisted,
  storage: StorageLike | undefined = defaultStorage(),
): boolean {
  try {
    if (!storage) return false
    const { tasks, done, settings, schedule, today, timetable } = data
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({ tasks, done, settings, schedule, today, timetable }),
    )
    return true
  } catch {
    return false
  }
}
