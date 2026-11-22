import type { Analysed } from '../types'
import { formatHours } from '../utils/format'

/** 締切が最も早い時間不足の課題について警告する */
export function OverloadWarning({ a }: { a: Analysed | undefined }) {
  if (!a) return null
  return (
    <div
      role="status"
      className="mt-4 flex items-start gap-3 rounded-lg border-l-4 border-tag-red bg-surface px-3 py-2.5 text-sm text-ink"
    >
      <span
        aria-hidden
        className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-tag-red text-xs font-black text-white"
      >
        !
      </span>
      <p>
        <span className="sr-only">時間不足の警告：</span>
        締切順に積み上げると『<strong className="font-bold">{a.task.title}</strong>
        』の締切までに約{formatHours(a.shortage)}足りません
      </p>
    </div>
  )
}
