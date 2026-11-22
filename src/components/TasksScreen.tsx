import { motion } from 'framer-motion'
import { Plus, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { TASK_TYPES } from '../constants'
import { cardInView } from '../motion'
import type { Analysed, Task } from '../types'
import { formatDue } from '../utils/format'
import { OverloadWarning } from './OverloadWarning'
import { PageTitle } from './PageTitle'
import { Segmented } from './Segmented'
import { TaskCard } from './TaskCard'

type Tab = 'open' | 'done'

interface Props {
  analysed: Analysed[]
  done: Task[]
  shortage: Analysed | undefined
  onAdd: () => void
  onAdvance: (id: string) => void
  onComplete: (id: string) => void
  onEdit: (id: string) => void
  onRemove: (id: string) => void
  onRestore: (id: string) => void
}

/** 課題の一覧。未完了は優先順位どおり、完了は「戻す」で未完了に戻せる */
export function TasksScreen({
  analysed,
  done,
  shortage,
  onAdd,
  onAdvance,
  onComplete,
  onEdit,
  onRemove,
  onRestore,
}: Props) {
  const [tab, setTab] = useState<Tab>('open')

  return (
    <div className="flex flex-col gap-4">
      <PageTitle
        aside={
          <button
            type="button"
            onClick={onAdd}
            aria-label="課題を追加する"
            className="inline-flex size-11 items-center justify-center rounded-full bg-primary text-on-primary shadow-sm transition hover:bg-primary-strong wide:hidden"
          >
            <Plus aria-hidden className="size-5" strokeWidth={2.5} />
          </button>
        }
      >
        課題
      </PageTitle>

      <Segmented
        label="表示する課題"
        value={tab}
        onChange={setTab}
        className="wide:max-w-sm"
        options={[
          { value: 'open', label: '未完了', count: analysed.length },
          { value: 'done', label: '完了', count: done.length },
        ]}
      />

      {tab === 'open' ? (
        <>
          <OverloadWarning a={shortage} />
          {analysed.length === 0 ? (
            <p className="ui-card p-6 text-center text-sm text-ink-muted">
              未完了の課題はないよ。右上の＋から追加できるよ。
            </p>
          ) : (
            <ol className="grid grid-cols-1 gap-3 two:grid-cols-2">
              {analysed.map((a, i) => (
                <motion.li key={a.task.id} {...cardInView(i)}>
                  <TaskCard
                    a={a}
                    rank={i + 1}
                    className="h-full"
                    onAdvance={() => onAdvance(a.task.id)}
                    onComplete={() => onComplete(a.task.id)}
                    onEdit={() => onEdit(a.task.id)}
                    onRemove={() => onRemove(a.task.id)}
                  />
                </motion.li>
              ))}
            </ol>
          )}
        </>
      ) : done.length === 0 ? (
        <p className="ui-card p-6 text-center text-sm text-ink-muted">完了した課題はまだないよ。</p>
      ) : (
        <ul className="ui-card divide-y divide-line overflow-hidden">
          {done.map((t) => (
            <li key={t.id} className="flex items-center gap-3 py-2 pr-2 pl-4">
              <div className="min-w-0 flex-1">
                <p className="break-words text-ink-muted line-through decoration-ink-muted/60">
                  {t.title}
                </p>
                <p className="text-xs text-ink-muted">
                  {TASK_TYPES[t.type].label}
                  {t.doneAt != null && `・${formatDue(t.doneAt)}に完了`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onRestore(t.id)}
                aria-label={`「${t.title}」を未完了に戻す`}
                className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-full px-3 text-sm font-bold text-primary-ink transition hover:bg-primary-soft"
              >
                <RotateCcw aria-hidden className="size-4" />
                戻す
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
