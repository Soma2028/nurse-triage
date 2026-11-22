import { TASK_TYPES } from '../constants'
import type { Task } from '../types'
import { formatDue } from '../utils/format'
import { Button } from './Button'
import { Chevron } from './Chevron'

export function DoneList({ done, onRestore }: { done: Task[]; onRestore: (id: string) => void }) {
  return (
    <details className="group rounded-xl border border-line bg-surface">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 py-2 font-heading text-lg font-bold select-none [&::-webkit-details-marker]:hidden">
        <Chevron />
        完了した課題
        <span className="text-sm font-medium text-ink-muted">（{done.length}件）</span>
      </summary>
      {done.length === 0 ? (
        <p className="px-4 pb-4 text-sm text-ink-muted">まだありません。</p>
      ) : (
        <ul className="divide-y divide-line border-t border-line">
          {done.map((t) => (
            <li key={t.id} className="flex items-center gap-3 px-4 py-2">
              <div className="min-w-0 flex-1">
                <p className="break-words text-ink-muted line-through decoration-ink-muted">
                  {t.title}
                </p>
                <p className="text-xs text-ink-muted">
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
