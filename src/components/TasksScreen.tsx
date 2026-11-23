import { motion } from 'framer-motion'
import { RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { TASK_TYPES } from '../constants'
import { cardInView } from '../motion'
import type { Analysed, Task } from '../types'
import { formatDue } from '../utils/format'
import { Chara } from './Chara'
import { PriorityHelp } from './Help'
import { OverloadWarning } from './OverloadWarning'
import { HelpButton, ScreenLayout } from './ScreenLayout'
import { Segmented } from './Segmented'
import { Sheet } from './Sheet'
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

/** 課題の一覧。未完了は優先順位どおり（押すと開く）、完了は「戻す」で未完了に戻せる */
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
  const [openId, setOpenId] = useState<string | null>(null)
  const [help, setHelp] = useState(false)

  return (
    <ScreenLayout
      title="課題"
      aside={<HelpButton label="優先度の決め方" onClick={() => setHelp(true)} />}
      sub={
        <Segmented
          label="表示する課題"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'open', label: '未完了', count: analysed.length },
            { value: 'done', label: '完了', count: done.length },
          ]}
        />
      }
      onAdd={onAdd}
    >
      {tab === 'open' ? (
        <div className="flex flex-col gap-2">
          <OverloadWarning a={shortage} />
          {analysed.length === 0 ? (
            <div className="flex items-center gap-4 px-2 py-4">
              <Chara mood="happy" size={64} />
              <p className="text-sm text-ink-muted">
                <b className="block text-base text-ink">未完了の課題はないよ。</b>
                新しい課題は右下の＋から追加してね。
              </p>
            </div>
          ) : (
            <ol className="flex flex-col gap-2">
              {analysed.map((a, i) => (
                <motion.li key={a.task.id} {...cardInView(i)}>
                  <TaskCard
                    a={a}
                    rank={i + 1}
                    open={openId === a.task.id}
                    onToggle={() => setOpenId(openId === a.task.id ? null : a.task.id)}
                    onAdvance={() => onAdvance(a.task.id)}
                    onComplete={() => onComplete(a.task.id)}
                    onEdit={() => onEdit(a.task.id)}
                    onRemove={() => onRemove(a.task.id)}
                  />
                </motion.li>
              ))}
            </ol>
          )}
        </div>
      ) : done.length === 0 ? (
        <p className="px-2 py-4 text-sm text-ink-muted">完了した課題はまだないよ。</p>
      ) : (
        <ul className="ui-card divide-y divide-line overflow-hidden">
          {done.map((t) => (
            <li key={t.id} className="flex items-center gap-2 py-2 pr-2 pl-4">
              <div className="min-w-0 flex-1">
                <p className="truncate text-base text-ink-muted line-through decoration-ink-muted/60">
                  {t.title}
                </p>
                <p className="truncate text-xs text-ink-muted">
                  {TASK_TYPES[t.type].short}
                  {t.doneAt != null && ` ・ ${formatDue(t.doneAt)}に完了`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onRestore(t.id)}
                aria-label={`「${t.title}」を未完了に戻す`}
                className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-full px-4 text-sm font-bold text-primary-ink transition hover:bg-primary-soft"
              >
                <RotateCcw aria-hidden className="size-4" />
                戻す
              </button>
            </li>
          ))}
        </ul>
      )}

      <Sheet open={help} title="優先度の決め方" onClose={() => setHelp(false)}>
        <PriorityHelp />
      </Sheet>
    </ScreenLayout>
  )
}
