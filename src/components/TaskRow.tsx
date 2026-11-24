import { TRIAGE_STYLE } from '../constants'
import type { Analysed } from '../types'
import { formatDue, formatHours, formatRemaining } from '../utils/format'

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

/**
 * トリアージのタッグ（小さな色の四角に順位）。色を持つのはここだけ。
 * 色だけに頼らないよう、言葉（「今すぐ」など）はとなりの行に文字で出す。
 * sm は、課題名の上に置く小さな札（順位ではなく「赤」などの名前）
 */
export function TagChip({
  a,
  rank,
  size = 'md',
}: {
  a: Analysed
  rank: number
  size?: 'sm' | 'md' | 'lg'
}) {
  const style = TRIAGE_STYLE[a.triage]
  if (size === 'sm') {
    return (
      <span
        aria-hidden
        className={`inline-flex h-5 shrink-0 items-center rounded-md px-2 text-xs font-black ${style.tag}`}
      >
        {style.name}
      </span>
    )
  }
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-xl font-black tabular-nums ${style.tag} ${
        size === 'lg' ? 'size-12 text-title' : 'size-10 text-base'
      }`}
    >
      {rank}
    </span>
  )
}

/** 「今すぐ ・ あと10時間 ・ 11/25(水) 8:30」。狭いときは後ろの締切の日時から切れる */
export function TaskMeta({ a }: { a: Analysed }) {
  return (
    <>
      {a.label} ・ <b className="text-ink">{formatRemaining(a.ms)}</b> ・ {formatDue(a.task.due)}
    </>
  )
}

/** 課題の進み具合のバー。色はその課題のタッグの色 */
export function ProgressBar({ a, label = '進捗' }: { a: Analysed; label?: string }) {
  return (
    <div
      className="h-2 overflow-hidden rounded-full bg-line"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={a.task.progress}
    >
      <div
        className={`h-full rounded-full ${TRIAGE_STYLE[a.triage].bar}`}
        style={{ width: `${a.task.progress}%` }}
      />
    </div>
  )
}

/** 課題の1行（白い面の一覧の中に並べる）。押すと、くわしいことと操作のページを開く */
export function TaskRow({ a, rank, onOpen }: { a: Analysed; rank: number; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${rank}番目・${TRIAGE_STYLE[a.triage].name}「${a.label}」 ${a.task.title}`}
      className="flex min-h-16 w-full items-center gap-3 px-4 py-2 text-left transition hover:bg-paper"
    >
      <TagChip a={a} rank={rank} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-base font-bold text-ink">{a.task.title}</span>
        <span className="block truncate text-xs text-ink-muted">
          <TaskMeta a={a} />
        </span>
      </span>
      {/* 進み具合。行全体が押せるので「›」は置かず、そのぶん課題名と締切に幅を回す */}
      <span className="shrink-0 text-sm font-bold text-ink-muted tabular-nums">
        {a.task.progress}%<span className="sr-only">進んだ</span>
      </span>
    </button>
  )
}
