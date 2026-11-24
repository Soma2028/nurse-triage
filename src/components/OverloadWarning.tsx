import { CircleAlert } from 'lucide-react'
import type { Analysed } from '../types'
import { formatHours } from '../utils/format'
import { Group, IconTile } from './Group'

/**
 * 締切が最も早い時間不足の課題について、せっていと同じ白い面の1行で知らせる。
 * 色は付けず（赤はタッグだけ）、太字で出す。押すとその課題を開く
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
    <Group>
      <button
        type="button"
        role="status"
        onClick={() => onOpen(a.task.id)}
        className="flex min-h-12 w-full items-center gap-3 px-4 py-2 text-left text-sm text-ink transition hover:bg-paper"
      >
        <IconTile icon={CircleAlert} />
        <span className="min-w-0 flex-1">
          締切順に積み上げると『{a.task.title}』まで
          <b className="font-bold">約{formatHours(a.shortage)}足りない</b>
        </span>
      </button>
    </Group>
  )
}
