import { Check, Pencil, Trash2 } from 'lucide-react'
import { IMPORTANCE_LABEL, TASK_TYPES, TRIAGE_STYLE } from '../constants'
import { PROGRESS_STEP } from '../store/reducer'
import type { Analysed } from '../types'
import { formatDue, formatHours, formatRemaining } from '../utils/format'

interface Props {
  a: Analysed
  rank: number
  /** 根拠とボタンを出しているか */
  open: boolean
  /** 渡すと、カードを押して開け閉めできる（課題の一覧）。渡さなければ開いたまま（ホームの「つぎにやる」） */
  onToggle?: () => void
  onAdvance: () => void
  onComplete: () => void
  onEdit?: () => void
  onRemove?: () => void
}

/** 根拠の一行。足りない分・締切を過ぎた時間は太字（赤い文字は使わない。赤はタッグだけ） */
export function Reason({ a }: { a: Analysed }) {
  const { remain, avail, shortage, ms } = a
  const head = `あと約${formatHours(remain)}`
  if (ms < 0) {
    return (
      <>
        {head} ／ <b className="text-ink">{formatRemaining(ms)}</b>
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
          ・<b className="text-ink">{shortText}</b>
        </>
      )}
    </>
  )
}

/** 左端のトリアージタッグ（色・順位・ラベル・紐穴） */
export function TriageTag({ a, rank }: { a: Analysed; rank: number }) {
  const style = TRIAGE_STYLE[a.triage]
  return (
    <div
      className={`relative flex w-16 shrink-0 flex-col items-center justify-center gap-1 pt-6 pb-3 text-center ${style.tag}`}
      aria-label={`${rank}番目・${style.name}「${a.label}」`}
    >
      <span
        aria-hidden
        className="absolute top-2 left-1/2 size-3 -translate-x-1/2 rounded-full bg-surface ring-2 ring-black/15"
      />
      <span aria-hidden className="text-title leading-none font-black tabular-nums">
        {rank}
      </span>
      <span aria-hidden className="text-xs leading-4 font-bold tracking-tighter whitespace-nowrap">
        {a.label}
      </span>
    </div>
  )
}

const actionClass =
  'inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-full px-4 text-sm font-bold transition'

/** 課題カード。閉じているときは2行（課題名／締切・残り）、開くと根拠とボタン */
export function TaskCard({
  a,
  rank,
  open,
  onToggle,
  onAdvance,
  onComplete,
  onEdit,
  onRemove,
}: Props) {
  const { task, triage, ms } = a
  const style = TRIAGE_STYLE[triage]
  const detailsId = `task-${task.id}-details`

  const lines = (
    <>
      <span className="block truncate text-base leading-6 font-bold">{task.title}</span>
      <span className="mt-1 block truncate text-sm text-ink-muted">
        {formatDue(task.due)} ・ <b className="text-ink">{formatRemaining(ms)}</b>
      </span>
    </>
  )

  return (
    <article className="ui-card flex overflow-hidden" aria-label={task.title}>
      <TriageTag a={a} rank={rank} />

      <div className="min-w-0 flex-1">
        {onToggle ? (
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            aria-controls={detailsId}
            className="block w-full px-4 py-4 text-left"
          >
            {lines}
          </button>
        ) : (
          <div className="px-4 pt-4">{lines}</div>
        )}

        {open && (
          <div id={detailsId} className={`px-4 pb-4 ${onToggle ? '' : 'pt-2'}`}>
            <p className="text-xs text-ink-muted">
              {TASK_TYPES[task.type].short} ・ 重要度 {IMPORTANCE_LABEL[task.importance]} ・ 進捗{' '}
              {task.progress}%
            </p>
            <div
              className="mt-2 h-2 overflow-hidden rounded-full bg-line"
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
            <p className="mt-2 text-sm text-ink-muted">
              <Reason a={a} />
            </p>
            {triage === 'black' && (
              <p className="mt-1 text-sm text-ink-muted">
                遅れて出すか、先生に連絡するか決めよう。
              </p>
            )}

            <div className="mt-2 -mb-1 -ml-2 flex flex-wrap items-center gap-1">
              <button
                type="button"
                onClick={onComplete}
                className={`${actionClass} bg-primary-soft text-primary-ink hover:bg-primary hover:text-on-primary`}
              >
                <Check aria-hidden className="size-4" strokeWidth={2.5} />
                完了
              </button>
              <button
                type="button"
                onClick={onAdvance}
                className={`${actionClass} border border-line bg-surface text-ink hover:bg-paper`}
                aria-label={`「${task.title}」の進捗を${PROGRESS_STEP}%進める`}
              >
                +{PROGRESS_STEP}%
              </button>
              {onEdit && (
                <button
                  type="button"
                  onClick={onEdit}
                  className={`${actionClass} ml-auto px-0 text-ink-muted hover:bg-paper hover:text-ink`}
                  aria-label={`「${task.title}」を編集`}
                >
                  <Pencil aria-hidden className="size-4" />
                </button>
              )}
              {onRemove && (
                <button
                  type="button"
                  onClick={onRemove}
                  className={`${actionClass} px-0 text-ink-muted hover:bg-paper hover:text-ink`}
                  aria-label={`「${task.title}」を削除`}
                >
                  <Trash2 aria-hidden className="size-4" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </article>
  )
}
