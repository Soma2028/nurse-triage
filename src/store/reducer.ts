import { DEFAULT_SETTINGS } from '../constants'
import {
  autoPracticeToday,
  dayKey,
  hasUpcoming,
  isPracticeToday,
  pruneSchedule,
} from '../logic/schedule'
import type { DayKind, Settings, Task } from '../types'
import { sampleTasks } from './sample'
import { load, type Persisted } from './storage'

export type UndoKind = 'complete' | 'remove' | 'clear' | 'reset'

/** 元に戻す対象（設定やスケジュールは戻さない） */
type TaskLists = Pick<Persisted, 'tasks' | 'done'>

export interface UndoEntry {
  kind: UndoKind
  message: string // トーストに出す文言
  prev: TaskLists // 直前の課題・完了一覧（1つだけ保持）
  at: number // 操作した時刻（トーストの表示管理用）
}

export interface State extends Persisted {
  undo: UndoEntry | null
}

export type Action =
  | { type: 'add'; task: Task }
  | { type: 'update'; task: Task }
  | { type: 'remove'; id: string; now: number }
  | { type: 'complete'; id: string; now: number }
  | { type: 'advance'; id: string; now: number; step?: number }
  | { type: 'restore'; id: string }
  | { type: 'clearAll'; now: number }
  | { type: 'resetSample'; now: number; tasks: Task[] }
  | { type: 'setSettings'; patch: Partial<Settings> }
  | { type: 'setDays'; dates: string[]; kind: DayKind | null }
  | { type: 'togglePracticeToday'; now: number }
  | { type: 'undo' }
  | { type: 'dismissUndo' }

export const PROGRESS_STEP = 25

function withUndo(
  state: State,
  next: TaskLists,
  kind: UndoKind,
  message: string,
  now: number,
): State {
  return {
    ...state,
    ...next,
    undo: { kind, message, prev: { tasks: state.tasks, done: state.done }, at: now },
  }
}

function completeTask(state: State, task: Task, now: number): State {
  return withUndo(
    state,
    {
      tasks: state.tasks.filter((t) => t.id !== task.id),
      // 進捗はそのまま残す（「戻す」で元の進捗に戻れるように）
      done: [{ ...task, doneAt: now }, ...state.done],
    },
    'complete',
    `『${task.title}』おつかれさま！`,
    now,
  )
}

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'add':
      return { ...state, tasks: [...state.tasks, action.task] }

    case 'update':
      return {
        ...state,
        tasks: state.tasks.map((t) => (t.id === action.task.id ? action.task : t)),
      }

    case 'remove': {
      const task = state.tasks.find((t) => t.id === action.id)
      const doneTask = state.done.find((t) => t.id === action.id)
      const target = task ?? doneTask
      if (!target) return state
      return withUndo(
        state,
        {
          tasks: state.tasks.filter((t) => t.id !== action.id),
          done: state.done.filter((t) => t.id !== action.id),
        },
        'remove',
        `『${target.title}』を消したよ`,
        action.now,
      )
    }

    case 'complete': {
      const task = state.tasks.find((t) => t.id === action.id)
      return task ? completeTask(state, task, action.now) : state
    }

    case 'advance': {
      const task = state.tasks.find((t) => t.id === action.id)
      if (!task) return state
      const progress = Math.min(100, task.progress + (action.step ?? PROGRESS_STEP))
      // 100% になったら自動で完了
      if (progress >= 100) return completeTask(state, { ...task, progress: 100 }, action.now)
      return {
        ...state,
        tasks: state.tasks.map((t) => (t.id === task.id ? { ...t, progress } : t)),
      }
    }

    case 'restore': {
      const task = state.done.find((t) => t.id === action.id)
      if (!task) return state
      const restored: Task = { ...task }
      delete restored.doneAt
      // 100% のまま戻すと残り0hで意味がないので、少し手前（90%）に戻す
      if (restored.progress >= 100) restored.progress = 90
      return {
        ...state,
        tasks: [...state.tasks, restored],
        done: state.done.filter((t) => t.id !== action.id),
      }
    }

    case 'clearAll':
      if (state.tasks.length === 0 && state.done.length === 0) return state
      return withUndo(state, { tasks: [], done: [] }, 'clear', '課題をぜんぶ消したよ', action.now)

    case 'resetSample':
      return withUndo(
        state,
        { tasks: action.tasks, done: [] },
        'reset',
        'サンプルに戻したよ',
        action.now,
      )

    case 'setSettings':
      return { ...state, settings: { ...state.settings, ...action.patch } }

    case 'setDays': {
      const schedule = { ...state.schedule }
      for (const d of action.dates) {
        if (action.kind) schedule[d] = action.kind
        else delete schedule[d]
      }
      return { ...state, schedule }
    }

    case 'togglePracticeToday': {
      const { settings, schedule } = state
      // 今日以降に印がなければ、今までどおりトグルそのものを切り替える
      if (!hasUpcoming(schedule, action.now)) {
        const nextSettings: Settings = { ...settings, practiceMode: !settings.practiceMode }
        delete nextSettings.practiceOverride
        return { ...state, settings: nextSettings }
      }
      // 印があるときは「今日だけ」の上書き。自動判定と同じ値に戻したら上書きを消す
      const next = !isPracticeToday(settings, schedule, action.now)
      const nextSettings: Settings = { ...settings }
      if (next === autoPracticeToday(schedule, action.now)) delete nextSettings.practiceOverride
      else nextSettings.practiceOverride = { date: dayKey(action.now), on: next }
      return { ...state, settings: nextSettings }
    }

    case 'undo':
      return state.undo ? { ...state, ...state.undo.prev, undo: null } : state

    case 'dismissUndo':
      return state.undo ? { ...state, undo: null } : state
  }
}

/** 起動時の状態：保存データがあればそれ（古い印は掃除）、なければサンプル課題 */
export function initState(now: number, persisted: Persisted | null = load()): State {
  if (persisted)
    return { ...persisted, schedule: pruneSchedule(persisted.schedule, now), undo: null }
  return {
    tasks: sampleTasks(now),
    done: [],
    settings: { ...DEFAULT_SETTINGS },
    schedule: {},
    undo: null,
  }
}
