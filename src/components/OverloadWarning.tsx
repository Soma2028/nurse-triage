import { CircleAlert } from 'lucide-react'
import type { Analysed } from '../types'
import { formatHours } from '../utils/format'

/**
 * 締切が最も早い時間不足の課題について、1行で知らせる。
 * ほかの行（白い面）と見分けられるよう、枠を付けずに背景の上へ太字で置く。
 * 色は付けない（赤はタッグだけ）。押すとその課題を開く
 */
export function OverloadWarning({
  a,
  onOpen,
}: {
  a: Analysed | undefined
  onOpen: (id: string) => void
}) {
  if (!a) return null
  return (
    <button
      type="button"
      role="status"
      onClick={() => onOpen(a.task.id)}
      className="flex min-h-11 w-full items-start gap-2 rounded-2xl px-4 py-2 text-left text-sm font-bold text-ink transition hover:bg-surface"
    >
      <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" strokeWidth={2.5} />
      <span className="min-w-0 flex-1 leading-6">
        締切順に積み上げると『{a.task.title}』まで約{formatHours(a.shortage)}足りないよ
      </span>
    </button>
  )
}
