import { DEFAULT_SETTINGS } from '../constants'
import type { Settings, Task } from '../types'
import { sampleTasks } from './sample'
import { load, type Persisted } from './storage'

export type UndoKind = 'complete' | 'remove' | 'clear' | 'reset'

export interface UndoEntry {
  kind: UndoKind
  message: string // トーストに出す文言
  prev: Persisted // 直前の状態（1つだけ保持）
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
  | { type: 'undo' }
  | { type: 'dismissUndo' }

export const PROGRESS_STEP = 25

const snapshot = ({ tasks, done, settings }: State): Persisted => ({ tasks, done, settings })

function withUndo(
  state: State,
  next: Persisted,
  kind: UndoKind,
  message: string,
  now: number,
): State {
  return { ...next, undo: { kind, message, prev: snapshot(state), at: now } }
}

function completeTask(state: State, task: Task, now: number): State {
  return withUndo(
    state,
    {
      tasks: state.tasks.filter((t) => t.id !== task.id),
      // 進捗はそのまま残す（「戻す」で元の進捗に戻れるように）
      done: [{ ...task, doneAt: now }, ...state.done],
      settings: state.settings,
    },
    'complete',
    `「${task.title}」を完了にしました`,
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
          settings: state.settings,
        },
        'remove',
        `「${target.title}」を削除しました`,
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
      return withUndo(
        state,
        { tasks: [], done: [], settings: state.settings },
        'clear',
        'すべての課題を消しました',
        action.now,
      )

    case 'resetSample':
      return withUndo(
        state,
        { tasks: action.tasks, done: [], settings: state.settings },
        'reset',
        'サンプルに戻しました',
        action.now,
      )

    case 'setSettings':
      return { ...state, settings: { ...state.settings, ...action.patch } }

    case 'undo':
      return state.undo ? { ...state.undo.prev, undo: null } : state

    case 'dismissUndo':
      return state.undo ? { ...state, undo: null } : state
  }
}

/** 起動時の状態：保存データがあればそれ、なければサンプル課題 */
export function initState(now: number, persisted: Persisted | null = load()): State {
  if (persisted) return { ...persisted, undo: null }
  return { tasks: sampleTasks(now), done: [], settings: { ...DEFAULT_SETTINGS }, undo: null }
}
