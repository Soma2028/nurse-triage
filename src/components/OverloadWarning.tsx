import { CircleAlert } from 'lucide-react'
import type { Analysed } from '../types'
import { formatHours } from '../utils/format'

/**
 * 締切が最も早い時間不足の課題について、1行で知らせる。
 * 色は付けず（赤はタッグだけ）、白い面に太字で出す。
 */
export function OverloadWarning({ a }: { a: Analysed | undefined }) {
  if (!a) return null
  return (
    <p
      role="status"
      className="flex items-start gap-2 rounded-2xl border border-line bg-surface px-4 py-2 text-sm text-ink"
    >
      <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" strokeWidth={2.5} />
      <span className="min-w-0">
        締切順に積み上げると『{a.task.title}』まで
        <b className="font-bold">約{formatHours(a.shortage)}足りない</b>
      </span>
    </p>
  )
}
