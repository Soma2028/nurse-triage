import { ChevronRight } from 'lucide-react'
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
 * 色だけに頼らないよう、言葉（「今すぐ」など）はとなりの行に文字で出す
 */
export function TagChip({
  a,
  rank,
  size = 'md',
}: {
  a: Analysed
  rank: number
  size?: 'md' | 'lg'
}) {
  const style = TRIAGE_STYLE[a.triage]
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

/** 「今すぐ ・ 11/25(水) 8:30 ・ あと10時間」 */
export function TaskMeta({ a }: { a: Analysed }) {
  return (
    <>
      {a.label} ・ {formatDue(a.task.due)} ・ <b className="text-ink">{formatRemaining(a.ms)}</b>
    </>
  )
}

/** 課題の1行（白い面の一覧の中に並べる）。押すと、くわしいことと操作のシートを開く */
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
      <ChevronRight aria-hidden className="size-4 shrink-0 text-ink-muted" />
    </button>
  )
}
