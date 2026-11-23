/**
 * /api/sync に送る中身。通知に必要な最小限だけ（課題名は「通知に課題名を出す」がオンのときだけ）。
 */
import type { Task, TaskType } from '../types'
import type { NotifyPrefs } from './pushState'

/** サーバーが受け取る上限（api/_lib/validate.ts の MAX_TASKS と同じ） */
export const MAX_SYNC_TASKS = 200

export interface SyncTask {
  id: string
  type: TaskType
  due: number
  done: boolean
  title?: string
}

export interface SyncBody {
  tasks: SyncTask[]
  settings: NotifyPrefs
}

/**
 * 未完了の課題だけを送る（完了した課題には通知しないので、置き換えで消えればよい）。
 * 上限を超えたら締切の遅いほうを残す（古い締切はもう通知しないため）。順番は締切順で決まった形にする。
 */
export function buildSyncBody(tasks: readonly Task[], prefs: NotifyPrefs): SyncBody {
  const sorted = [...tasks].sort((a, b) => a.due - b.due || a.id.localeCompare(b.id))
  return {
    tasks: sorted.slice(-MAX_SYNC_TASKS).map((t) => {
      const item: SyncTask = { id: t.id, type: t.type, due: t.due, done: false }
      if (prefs.showTitle && t.title.trim()) item.title = t.title.trim().slice(0, 200)
      return item
    }),
    settings: prefs,
  }
}
