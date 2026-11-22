import { CircleAlert } from 'lucide-react'
import type { Analysed } from '../types'
import { formatHours } from '../utils/format'

/** 締切が最も早い時間不足の課題について、1行で知らせる */
export function OverloadWarning({
  a,
  className = '',
}: {
  a: Analysed | undefined
  className?: string
}) {
  if (!a) return null
  return (
    <p
      role="status"
      className={`flex items-start gap-2 rounded-2xl bg-danger-soft px-3.5 py-2.5 text-sm text-ink ${className}`}
    >
      <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-danger" strokeWidth={2.5} />
      <span>
        締切順に積み上げると、『<strong className="font-bold">{a.task.title}</strong>
        』の締切までに約{formatHours(a.shortage)}足りないよ
      </span>
    </p>
  )
}
