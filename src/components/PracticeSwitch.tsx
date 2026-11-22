interface Props {
  on: boolean
  /** スケジュールから自動判定しているときなどの補足 */
  note: string | null
  onToggle: () => void
  /** chip: ホームの右上に置く小さい形 / row: せっていの行 */
  variant?: 'chip' | 'row'
}

function Track({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden
      className={`relative h-6 w-10 shrink-0 rounded-full transition-colors motion-reduce:transition-none ${
        on ? 'bg-primary' : 'bg-line-strong'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-surface shadow transition-transform motion-reduce:transition-none ${
          on ? 'translate-x-4' : ''
        }`}
      />
    </span>
  )
}

/** 実習期間中のスイッチ */
export function PracticeSwitch({ on, note, onToggle, variant = 'chip' }: Props) {
  const noteId = 'practice-note'
  if (variant === 'chip') {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-describedby={note ? noteId : undefined}
        onClick={onToggle}
        className="flex min-h-11 items-center gap-2 rounded-full border border-line bg-surface py-1 pr-3 pl-1.5 text-sm font-bold text-ink shadow-sm"
      >
        <Track on={on} />
        実習中
        {note && (
          <span id={noteId} className="sr-only">
            {note}
          </span>
        )}
      </button>
    )
  }
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-describedby={note ? noteId : undefined}
      onClick={onToggle}
      className="flex min-h-11 w-full items-center justify-between gap-3 text-left"
    >
      <span>
        <span className="block font-bold">実習期間中</span>
        {note && (
          <span id={noteId} className="block text-sm text-ink-muted">
            {note}
          </span>
        )}
      </span>
      <Track on={on} />
    </button>
  )
}
