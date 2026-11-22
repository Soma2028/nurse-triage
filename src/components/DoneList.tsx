import { TASK_TYPES } from '../constants'
import type { Task } from '../types'
import { formatDue } from '../utils/format'
import { Button } from './Button'
import { Chevron } from './Chevron'

export function DoneList({ done, onRestore }: { done: Task[]; onRestore: (id: string) => void }) {
  return (
    <details className="group rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 py-2 font-heading text-lg font-bold select-none [&::-webkit-details-marker]:hidden">
        <Chevron />
        完了した課題
        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
          （{done.length}件）
        </span>
      </summary>
      {done.length === 0 ? (
        <p className="px-4 pb-4 text-sm text-slate-500 dark:text-slate-400">まだありません。</p>
      ) : (
        <ul className="divide-y divide-slate-200 border-t border-slate-200 dark:divide-slate-700 dark:border-slate-700">
          {done.map((t) => (
            <li key={t.id} className="flex items-center gap-3 px-4 py-2">
              <div className="min-w-0 flex-1">
                <p className="break-words text-slate-600 line-through decoration-slate-400 dark:text-slate-300">
                  {t.title}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {TASK_TYPES[t.type].label}
                  {t.doneAt != null && ` ・ ${formatDue(t.doneAt)} に完了`}
                </p>
              </div>
              <Button onClick={() => onRestore(t.id)} aria-label={`「${t.title}」を未完了に戻す`}>
                戻す
              </Button>
            </li>
          ))}
        </ul>
      )}
    </details>
  )
}
