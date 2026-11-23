interface Props {
  on: boolean
  /** スケジュールから自動判定しているときなどの補足 */
  note: string | null
  onToggle: () => void
}

/** スイッチの見た目。つまみの位置は 2px 内側（h-6 の中に size-5） */
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

/** 実習期間中のスイッチ（せっていの行） */
export function PracticeSwitch({ on, note, onToggle }: Props) {
  const noteId = 'practice-note'
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-describedby={note ? noteId : undefined}
      onClick={onToggle}
      className="flex min-h-11 w-full items-center justify-between gap-4 text-left"
    >
      <span>
        <span className="block text-base">実習期間中</span>
        {note && (
          <span id={noteId} className="block text-xs text-ink-muted">
            {note}
          </span>
        )}
      </span>
      <Track on={on} />
    </button>
  )
}
