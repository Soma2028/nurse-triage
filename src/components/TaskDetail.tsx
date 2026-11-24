import { Check, Pencil, Trash2 } from 'lucide-react'
import { IMPORTANCE_LABEL, TASK_TYPES } from '../constants'
import type { Analysed } from '../types'
import { Group, LinkRow, Row } from './Group'
import { ProgressSlider, Reason, TagChip, TaskMeta } from './TaskRow'

const primaryBtn =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary text-base font-bold text-on-primary transition hover:bg-primary-strong'
/** 課題のくわしいことと操作（TaskDetailPage の中身）。課題の一覧・ホームの行を押すと開く */
export function TaskDetail({
  a,
  rank,
  onComplete,
  onSetProgress,
  onEdit,
  onRemove,
}: {
  a: Analysed
  rank: number
  onComplete: () => void
  onSetProgress: (progress: number) => void
  onEdit: () => void
  onRemove: () => void
}) {
  const { task, triage } = a
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <TagChip a={a} rank={rank} size="lg" />
        <div className="min-w-0">
          <p className="text-title font-bold break-words text-ink">{task.title}</p>
          <p className="text-sm text-ink-muted">
            <TaskMeta a={a} />
          </p>
        </div>
      </div>

      <Group>
        <Row label="種類">
          <span className="truncate pr-2 text-sm text-ink">{TASK_TYPES[task.type].short}</span>
        </Row>
        <Row label="成績・単位への影響">
          <span className="pr-2 text-sm text-ink">{IMPORTANCE_LABEL[task.importance]}</span>
        </Row>
        <div className="flex flex-col px-4 pt-3 pb-1">
          <p className="text-base text-ink">進捗</p>
          <ProgressSlider key={task.id} a={a} onCommit={onSetProgress} />
        </div>
      </Group>

      <p className="px-4 text-sm leading-6 text-ink-muted">
        <Reason a={a} />
        {triage === 'black' && (
          <span className="block">遅れて出すか、先生に連絡するか決めよう。</span>
        )}
      </p>

      <button type="button" onClick={onComplete} className={primaryBtn}>
        <Check aria-hidden className="size-5" strokeWidth={2.5} />
        完了にする
      </button>

      {/* せっていのアカウントのページと同じ、行の一覧 */}
      <Group>
        <LinkRow icon={Pencil} label="編集する" onClick={onEdit} />
        <LinkRow icon={Trash2} label="削除する" danger onClick={onRemove} />
      </Group>
    </div>
  )
}
