import { IMPORTANCE_LABEL, TASK_TYPES, TRIAGE_STYLE } from '../constants'
import { PROGRESS_STEP } from '../store/reducer'
import type { Analysed } from '../types'
import { formatDue, formatHours, formatRemaining } from '../utils/format'
import { Button } from './Button'

interface Props {
  a: Analysed
  rank: number
  editing: boolean
  onAdvance: () => void
  onComplete: () => void
  onEdit: () => void
  onRemove: () => void
}

/** 根拠の一行。不足ぶんは赤字で返す */
function Reason({ a }: { a: Analysed }) {
  const { task, remain, avail, shortage, ms } = a
  const head = `進捗${task.progress}%・残り約${formatHours(remain)}`
  if (ms < 0) {
    return (
      <>
        {head} ／ <span className="font-medium text-danger">締切を過ぎています</span>
      </>
    )
  }
  const showShortage = Math.round(shortage * 10) >= 1
  // 単体でも足りないのか、他の課題と合わせると足りないのか
  const shortText =
    remain > avail
      ? `このままだと${formatHours(shortage)}不足`
      : `他の課題と合わせて${formatHours(shortage)}不足`
  return (
    <>
      {head} ／ 締切までに使える時間 約{formatHours(avail)}
      {showShortage && (
        <>
          ・<span className="font-medium text-danger">{shortText}</span>
        </>
      )}
    </>
  )
}

export function TaskCard({ a, rank, editing, onAdvance, onComplete, onEdit, onRemove }: Props) {
  const { task, triage, label, ms } = a
  const style = TRIAGE_STYLE[triage]
  return (
    <li
      className={`flex overflow-hidden rounded-xl border bg-surface shadow-sm ${
        editing ? 'border-primary-ink ring-2 ring-primary/30' : 'border-line'
      }`}
    >
      {/* トリアージタッグ */}
      <div
        className={`relative flex w-16 shrink-0 flex-col items-center justify-start gap-1 px-0.5 pt-7 pb-3 text-center sm:w-20 ${style.tag}`}
        aria-label={`順位${rank}・${style.name}「${label}」`}
      >
        <span
          aria-hidden
          className="absolute top-2 left-1/2 size-3 -translate-x-1/2 rounded-full bg-surface ring-2 ring-black/15"
        />
        <span aria-hidden className="font-heading text-3xl leading-none font-black">
          {rank}
        </span>
        <span
          aria-hidden
          className="text-[11px] leading-tight font-bold tracking-tighter whitespace-nowrap sm:text-xs sm:tracking-normal"
        >
          {label}
        </span>
      </div>

      <div className="min-w-0 flex-1 p-3 sm:p-4">
        <h3 className="text-base leading-snug font-bold break-words">{task.title}</h3>
        <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-sm text-ink-muted">
          <span>{TASK_TYPES[task.type].label}</span>
          <span>
            締切 {formatDue(task.due)}
            <span className={`ml-1 font-medium ${ms < 0 ? 'text-danger' : ''}`}>
              （{formatRemaining(ms)}）
            </span>
          </span>
          <span>重要度 {IMPORTANCE_LABEL[task.importance]}</span>
        </p>

        <div
          className="mt-2 h-2 overflow-hidden rounded-full bg-line"
          role="progressbar"
          aria-label="進捗"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={task.progress}
        >
          <div className={`h-full ${style.bar}`} style={{ width: `${task.progress}%` }} />
        </div>

        <p className="mt-2 text-sm text-ink-muted">
          <Reason a={a} />
        </p>

        <div className="mt-2 -ml-1 flex flex-wrap gap-0.5 sm:gap-1">
          <Button
            onClick={onAdvance}
            aria-label={`「${task.title}」の進捗を${PROGRESS_STEP}%進める`}
          >
            進捗+{PROGRESS_STEP}%
          </Button>
          <Button onClick={onComplete}>完了</Button>
          <Button variant="ghost" onClick={onEdit} aria-pressed={editing}>
            編集
          </Button>
          <Button variant="danger" onClick={onRemove}>
            削除
          </Button>
        </div>
      </div>
    </li>
  )
}
