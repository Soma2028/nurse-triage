import type { Analysed } from '../types'
import { TaskCard } from './TaskCard'

interface Props {
  analysed: Analysed[]
  editingId: string | null
  onAdvance: (id: string) => void
  onComplete: (id: string) => void
  onEdit: (id: string) => void
  onRemove: (id: string) => void
}

export function TaskList({ analysed, editingId, onAdvance, onComplete, onEdit, onRemove }: Props) {
  return (
    <section aria-labelledby="list-heading">
      <h2 id="list-heading" className="mb-3 text-lg font-bold">
        優先順位
      </h2>
      {analysed.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-600 dark:text-slate-400">
          未完了の課題はありません。課題フォームから追加してください。
        </p>
      ) : (
        <ol className="flex flex-col gap-3">
          {analysed.map((a, i) => (
            <TaskCard
              key={a.task.id}
              a={a}
              rank={i + 1}
              editing={a.task.id === editingId}
              onAdvance={() => onAdvance(a.task.id)}
              onComplete={() => onComplete(a.task.id)}
              onEdit={() => onEdit(a.task.id)}
              onRemove={() => onRemove(a.task.id)}
            />
          ))}
        </ol>
      )}
    </section>
  )
}
