import { CircleAlert } from 'lucide-react'
import type { Analysed } from '../types'
import { formatHours } from '../utils/format'

/**
 * 締切が最も早い時間不足の課題について、2行で知らせる（太字の「時間が約1.6h足りない」と、1行で切る「『課題名』まで」）。
 * 色は付けず（赤はタッグだけ）、白い面に太字で出す。
 */
export function OverloadWarning({ a }: { a: Analysed | undefined }) {
  if (!a) return null
  return (
    <p
      role="status"
      className="ui-text flex items-start gap-2 rounded-2xl border border-line bg-surface px-4 py-2 text-sm text-ink"
    >
      <CircleAlert aria-hidden className="size-5 shrink-0" strokeWidth={2.25} />
      <span className="min-w-0 flex-1">
        <b className="block font-bold">時間が約{formatHours(a.shortage)}足りない</b>
        {/* 課題名だけを「…」で切り、「』まで」は残す */}
        <span className="flex min-w-0 text-ink-muted">
          <span className="shrink-0">締切順に見ると『</span>
          <span className="truncate">{a.task.title}</span>
          <span className="shrink-0">』まで</span>
        </span>
      </span>
    </p>
  )
}
