import { Check, Pencil, Trash2 } from 'lucide-react'
import { IMPORTANCE_LABEL, TASK_TYPES, TRIAGE_STYLE } from '../constants'
import { PROGRESS_STEP } from '../store/reducer'
import type { Analysed } from '../types'
import { Group, Row } from './Group'
import { Reason, TagChip, TaskMeta } from './TaskRow'

const primaryBtn =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary text-base font-bold text-on-primary transition hover:bg-primary-strong'
const plainBtn =
  'inline-flex min-h-11 items-center justify-center gap-1 rounded-full border border-line bg-surface px-4 text-sm font-bold text-ink transition hover:bg-paper'

/** 課題のくわしいことと操作（シートの中身）。課題の一覧・ホームの行を押すと開く */
export function TaskDetail({
  a,
  rank,
  onComplete,
  onAdvance,
  onEdit,
  onRemove,
}: {
  a: Analysed
  rank: number
  onComplete: () => void
  onAdvance: () => void
  onEdit: () => void
  onRemove: () => void
}) {
  const { task, triage } = a
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <TagChip a={a} rank={rank} size="lg" />
        <div className="min-w-0">
          <p className="text-base font-bold break-words text-ink">{task.title}</p>
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
        <div className="flex flex-col gap-2 px-4 py-3">
          <div className="flex justify-between text-base text-ink">
            進捗
            <span className="font-bold tabular-nums">{task.progress}%</span>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-line"
            role="progressbar"
            aria-label="進捗"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={task.progress}
          >
            <div
              className={`h-full rounded-full ${TRIAGE_STYLE[triage].bar}`}
              style={{ width: `${task.progress}%` }}
            />
          </div>
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
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={onAdvance}
          className={plainBtn}
          aria-label={`進捗を${PROGRESS_STEP}%進める`}
        >
          +{PROGRESS_STEP}%
        </button>
        <button type="button" onClick={onEdit} className={plainBtn}>
          <Pencil aria-hidden className="size-4" />
          編集
        </button>
        <button type="button" onClick={onRemove} className={plainBtn}>
          <Trash2 aria-hidden className="size-4" />
          削除
        </button>
      </div>
    </div>
  )
}
