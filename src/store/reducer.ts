import { DEFAULT_SETTINGS } from '../constants'
import {
  autoPracticeToday,
  dayKey,
  hasUpcoming,
  isPracticeToday,
  pruneSchedule,
} from '../logic/schedule'
import { addWork, workOf } from '../logic/today'
import type { DayKind, Settings, Task } from '../types'
import { sampleTasks } from './sample'
import { load, type Persisted } from './storage'

export type UndoKind = 'complete' | 'remove'

/** 元に戻す対象（設定やスケジュールは戻さない。今日進めた時間は課題と一緒に戻す） */
type TaskLists = Pick<Persisted, 'tasks' | 'done' | 'today'>

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
  | { type: 'update'; task: Task; now: number }
  | { type: 'remove'; id: string; now: number }
  | { type: 'complete'; id: string; now: number }
  | { type: 'advance'; id: string; now: number; step?: number }
  | { type: 'restore'; id: string; now: number }
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
    undo: {
      kind,
      message,
      prev: { tasks: state.tasks, done: state.done, today: state.today },
      at: now,
    },
  }
}

/** 完了にする。worked はこの操作で進めた時間（今日のぶんに足す） */
function completeTask(state: State, task: Task, now: number, worked: number): State {
  return withUndo(
    state,
    {
      tasks: state.tasks.filter((t) => t.id !== task.id),
      // 進捗はそのまま残す（「戻す」で元の進捗に戻れるように）
      done: [{ ...task, doneAt: now }, ...state.done],
      today: addWork(state.today, now, worked),
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

    case 'update': {
      const old = state.tasks.find((t) => t.id === action.task.id)
      const next = {
        ...state,
        tasks: state.tasks.map((t) => (t.id === action.task.id ? action.task : t)),
      }
      // 編集で進捗を変えたら、その分を今日のぶんに数える
      if (!old || old.progress === action.task.progress) return next
      const worked = workOf(action.task, old.progress, action.task.progress)
      return { ...next, today: addWork(state.today, action.now, worked) }
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
      return task ? completeTask(state, task, action.now, workOf(task, task.progress, 100)) : state
    }

    case 'advance': {
      const task = state.tasks.find((t) => t.id === action.id)
      if (!task) return state
      const progress = Math.min(100, task.progress + (action.step ?? PROGRESS_STEP))
      // 100% になったら自動で完了
      const worked = workOf(task, task.progress, progress)
      if (progress >= 100)
        return completeTask(state, { ...task, progress: 100 }, action.now, worked)
      return {
        ...state,
        tasks: state.tasks.map((t) => (t.id === task.id ? { ...t, progress } : t)),
        today: addWork(state.today, action.now, worked),
      }
    }

    case 'restore': {
      const task = state.done.find((t) => t.id === action.id)
      if (!task) return state
      const restored: Task = { ...task }
      delete restored.doneAt
      // 100% のまま戻すと残り0hで意味がないので、少し手前（90%）に戻す
      if (restored.progress >= 100) restored.progress = 90
      // 今日完了にした課題を戻したら、完了で数えた分を今日のぶんから引く
      const today =
        task.doneAt !== undefined && dayKey(task.doneAt) === dayKey(action.now)
          ? addWork(state.today, action.now, -workOf(restored, restored.progress, 100))
          : state.today
      return {
        ...state,
        tasks: [...state.tasks, restored],
        done: state.done.filter((t) => t.id !== action.id),
        today,
      }
    }

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
