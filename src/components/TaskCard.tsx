import { Check, Pencil, Trash2 } from 'lucide-react'
import { IMPORTANCE_LABEL, TASK_TYPES, TRIAGE_STYLE } from '../constants'
import { PROGRESS_STEP } from '../store/reducer'
import type { Analysed } from '../types'
import { formatDue, formatHours, formatRemaining } from '../utils/format'

interface Props {
  a: Analysed
  rank: number
  /** ホーム用：編集・削除を出さず、少し詰める */
  compact?: boolean
  editing?: boolean
  onAdvance: () => void
  onComplete: () => void
  onEdit?: () => void
  onRemove?: () => void
  className?: string
}

/** 根拠の一行。足りない分・締切を過ぎた時間（「3時間超過」「2日超過」）は危険色で出す */
export function Reason({ a }: { a: Analysed }) {
  const { remain, avail, shortage, ms } = a
  const head = `あと約${formatHours(remain)}`
  if (ms < 0) {
    return (
      <>
        {head} ／ <span className="font-bold text-danger">{formatRemaining(ms)}</span>
      </>
    )
  }
  const showShortage = Math.round(shortage * 10) >= 1
  // 単体でも足りないのか、他の課題と合わせると足りないのか
  const shortText =
    remain > avail
      ? `このままだと${formatHours(shortage)}足りない`
      : `ほかの課題と合わせると${formatHours(shortage)}足りない`
  return (
    <>
      {head} ／ 締切までに使えるのは約{formatHours(avail)}
      {showShortage && (
        <>
          ・<span className="font-bold text-danger">{shortText}</span>
        </>
      )}
    </>
  )
}

/** 左端のトリアージタッグ（色・順位・ラベル・紐穴） */
export function TriageTag({ a, rank, compact }: { a: Analysed; rank: number; compact?: boolean }) {
  const style = TRIAGE_STYLE[a.triage]
  return (
    <div
      className={`relative flex shrink-0 flex-col items-center gap-1 px-0.5 pb-3 text-center ${
        compact ? 'w-14 pt-7' : 'w-16 pt-7 sm:w-20'
      } ${style.tag}`}
      aria-label={`${rank}番目・${style.name}「${a.label}」`}
    >
      <span
        aria-hidden
        className="absolute top-2 left-1/2 size-3 -translate-x-1/2 rounded-full bg-surface ring-2 ring-black/15"
      />
      <span aria-hidden className="text-3xl leading-none font-black">
        {rank}
      </span>
      <span
        aria-hidden
        className="text-[11px] leading-tight font-bold tracking-tighter whitespace-nowrap sm:text-xs sm:tracking-normal"
      >
        {a.label}
      </span>
    </div>
  )
}

const actionClass =
  'inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-full px-3 text-sm font-bold transition'

export function TaskCard({
  a,
  rank,
  compact = false,
  editing = false,
  onAdvance,
  onComplete,
  onEdit,
  onRemove,
  className = '',
}: Props) {
  const { task, triage, ms } = a
  const style = TRIAGE_STYLE[triage]
  return (
    <article
      className={`ui-card flex overflow-hidden ${editing ? 'ring-2 ring-primary/40' : ''} ${className}`}
      aria-label={task.title}
    >
      <TriageTag a={a} rank={rank} compact={compact} />

      <div className={`min-w-0 flex-1 ${compact ? 'px-3.5 py-3' : 'p-4'}`}>
        <h3 className="leading-snug font-bold break-words">{task.title}</h3>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-muted">
          {!compact && <span className="ui-tag">{TASK_TYPES[task.type].label}</span>}
          <span>
            {formatDue(task.due)}
            <span className={`ml-1 font-bold ${ms < 0 ? 'text-danger' : 'text-ink'}`}>
              {formatRemaining(ms)}
            </span>
          </span>
          {!compact && <span>重要度 {IMPORTANCE_LABEL[task.importance]}</span>}
        </p>

        <div className="mt-2.5 flex items-center gap-2">
          <div
            className="h-2 flex-1 overflow-hidden rounded-full bg-line"
            role="progressbar"
            aria-label="進捗"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={task.progress}
          >
            <div
              className={`h-full rounded-full ${style.bar}`}
              style={{ width: `${task.progress}%` }}
            />
          </div>
          <span className="w-9 text-right text-xs font-bold text-ink-muted tabular-nums">
            {task.progress}%
          </span>
        </div>

        <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
          <Reason a={a} />
        </p>

        <div className="mt-2 -mb-1 -ml-1 flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={onAdvance}
            className={`${actionClass} border border-line bg-surface text-ink hover:bg-paper`}
            aria-label={`「${task.title}」の進捗を${PROGRESS_STEP}%進める`}
          >
            +{PROGRESS_STEP}%
          </button>
          <button
            type="button"
            onClick={onComplete}
            className={`${actionClass} bg-primary-soft text-primary-ink hover:bg-primary hover:text-on-primary`}
          >
            <Check aria-hidden className="size-4" strokeWidth={2.5} />
            完了
          </button>
          {!compact && onEdit && (
            <button
              type="button"
              onClick={onEdit}
              aria-pressed={editing}
              className={`${actionClass} ml-auto px-0 text-ink-muted hover:bg-paper hover:text-ink`}
              aria-label={`「${task.title}」を編集`}
            >
              <Pencil aria-hidden className="size-4" />
            </button>
          )}
          {!compact && onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className={`${actionClass} px-0 text-ink-muted hover:bg-danger-soft hover:text-danger`}
              aria-label={`「${task.title}」を削除`}
            >
              <Trash2 aria-hidden className="size-4" />
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
